/**
 * Supplier Controller — Supplier Management & Payment Tracking
 */

const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Tenant = require('../models/Tenant');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');
const WhatsAppService = require('../services/WhatsAppService');
const PDFService = require('../services/PDFService');
const catchAsync = require('../utils/catchAsync');

class SupplierController {
  getAll = catchAsync(async (req, res, next) => {
    const { page, limit, skip, sort } = Helpers.getPaginationParams(req.query);
    const filter = { ...req.tenantFilter };

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { contactPerson: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const [suppliers, total] = await Promise.all([
      Supplier.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Supplier.countDocuments(filter),
    ]);

    // Enrich with product counts and categories
    const supplierIds = suppliers.map((s) => s._id);
    const productAgg = await Product.aggregate([
      { $match: { tenant: suppliers[0]?.tenant || null, supplier: { $in: supplierIds }, isActive: true } },
      { $group: {
        _id: '$supplier',
        count: { $sum: 1 },
        categories: { $addToSet: '$category' },
        totalStock: { $sum: '$stock.quantity' },
        productNames: { $push: { name: '$name', sku: '$sku', stockQty: '$stock.quantity', stockStatus: '$stockStatus' } },
      }},
    ]);

    const productMap = {};
    productAgg.forEach((p) => { productMap[p._id.toString()] = p; });

    const enriched = suppliers.map((s) => ({
      ...s,
      productsCount: productMap[s._id.toString()]?.count || 0,
      productCategories: productMap[s._id.toString()]?.categories || [],
      totalStock: productMap[s._id.toString()]?.totalStock || 0,
      productNames: (productMap[s._id.toString()]?.productNames || []).slice(0, 10),
    }));

    ApiResponse.paginated(res, enriched, { page, limit, total });
  });

  getById = catchAsync(async (req, res, next) => {
    const supplier = await Supplier.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!supplier) return next(AppError.notFound('المورد غير موجود'));

    const products = await Product.find({
      supplier: supplier._id,
      ...req.tenantFilter,
      isActive: true,
    }).select('name sku price stock stockStatus');

    ApiResponse.success(res, { supplier, products });
  });

  create = catchAsync(async (req, res, next) => {
    const supplierData = { ...req.body, tenant: req.tenantId };
    const supplier = await Supplier.create(supplierData);
    ApiResponse.created(res, supplier, 'تم إضافة المورد بنجاح');
  });

  update = catchAsync(async (req, res, next) => {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, ...req.tenantFilter },
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) return next(AppError.notFound('المورد غير موجود'));
    ApiResponse.success(res, supplier, 'تم تحديث بيانات المورد');
  });

  delete = catchAsync(async (req, res, next) => {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, ...req.tenantFilter },
      { isActive: false },
      { new: true }
    );
    if (!supplier) return next(AppError.notFound('المورد غير موجود'));
    ApiResponse.success(res, null, 'تم حذف المورد');
  });

  /**
   * POST /api/v1/suppliers/:id/purchase
   * Record a purchase from supplier
   */
  recordPurchase = catchAsync(async (req, res, next) => {
    const { amount, paymentType, installments } = req.body;

    const supplier = await Supplier.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!supplier) return next(AppError.notFound('المورد غير موجود'));

    supplier.addPurchase(amount, paymentType, installments || 1);
    await supplier.save();

    ApiResponse.success(res, supplier, 'تم تسجيل عملية الشراء');
  });

  /**
   * POST /api/v1/suppliers/:id/payments/:paymentId/pay
   * Record a payment to supplier
   */
  recordPayment = catchAsync(async (req, res, next) => {
    const { amount } = req.body;
    const supplier = await Supplier.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!supplier) return next(AppError.notFound('المورد غير موجود'));

    supplier.recordPayment(req.params.paymentId, amount);
    await supplier.save();

    ApiResponse.success(res, supplier, 'تم تسجيل الدفعة للمورد');
  });

  /**
   * POST /api/v1/suppliers/:id/pay-all
   * Pay all outstanding balance at once (سداد كل الدفعات مرة واحدة)
   */
  payAllOutstanding = catchAsync(async (req, res, next) => {
    const supplier = await Supplier.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!supplier) return next(AppError.notFound('المورد غير موجود'));

    const result = supplier.payAllOutstanding();
    await supplier.save();

    ApiResponse.success(res, { ...result, supplier }, 'تم سداد كل المستحقات للمورد');
  });

  /**
   * POST /api/v1/suppliers/:id/send-reminder
   * Send WhatsApp reminder for upcoming payment
   */
  sendReminder = catchAsync(async (req, res, next) => {
    const supplier = await Supplier.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!supplier) return next(AppError.notFound('المورد غير موجود'));

    try {
        const tenant = await Tenant.findById(req.tenantId);
        const result = await WhatsAppService.sendSupplierPaymentReminder(supplier, tenant?.whatsapp);

        if (result && !result.failed && !result.skipped) {
          ApiResponse.success(res, null, 'تم إرسال التذكير عبر WhatsApp');
        } else {
          ApiResponse.success(res, { whatsappStatus: 'failed' },
            'تعذر الإرسال — تحقق من اتصال الإنترنت أو إعدادات WhatsApp');
        }
    } catch (error) {
        ApiResponse.success(res, { whatsappStatus: 'error' }, 'تعذر الإرسال عبر WhatsApp');
    }
  });

  /**
   * GET /api/v1/suppliers/upcoming-payments
   */
  getUpcomingPayments = catchAsync(async (req, res, next) => {
    const days = parseInt(req.query.days, 10) || 7;
    const suppliers = await Supplier.getUpcomingPayments(req.tenantId, days);
    ApiResponse.success(res, suppliers);
  });

  /**
   * POST /api/v1/suppliers/:id/request-restock
   * Send low stock restock request to supplier via WhatsApp
   */
  requestRestock = catchAsync(async (req, res, next) => {
    const supplier = await Supplier.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!supplier) return next(AppError.notFound('المورد غير موجود'));
    if (!supplier.phone) return next(AppError.badRequest('المورد ليس لديه رقم هاتف'));

    // Get low stock products from this supplier
    const lowStockProducts = await Product.find({
      ...req.tenantFilter,
      supplier: supplier._id,
      isActive: true,
      $expr: { $lte: ['$stock.quantity', '$stock.minQuantity'] },
    }).select('name sku stock.quantity stock.minQuantity').lean();

    if (lowStockProducts.length === 0) {
      return next(AppError.badRequest('لا توجد منتجات منخفضة المخزون من هذا المورد'));
    }

    const tenant = await Tenant.findById(req.tenantId);

    // Build WhatsApp message
    let message = `📦 *طلب إعادة تخزين*\n`;
    message += `━━━━━━━━━━━━━━━\n`;
    message += `من: ${tenant?.name || 'متجر PayQusta'}\n`;
    message += `إلى: ${supplier.name}\n`;
    message += `التاريخ: ${new Date().toLocaleDateString('ar-EG')}\n`;
    message += `━━━━━━━━━━━━━━━\n\n`;
    message += `🔴 *منتجات منخفضة المخزون:*\n\n`;

    lowStockProducts.forEach((p, i) => {
      const currentQty = p.stock?.quantity || 0;
      const minQty = p.stock?.minQuantity || 5;
      const neededQty = Math.max(10, minQty * 2 - currentQty);
      message += `${i + 1}. *${p.name}*\n`;
      if (p.sku) message += `   SKU: ${p.sku}\n`;
      message += `   المخزون الحالي: ${currentQty}\n`;
      message += `   الكمية المطلوبة: ${neededQty}\n\n`;
    });

    message += `━━━━━━━━━━━━━━━\n`;
    message += `📞 للتأكيد أو الاستفسار تواصل معنا\n`;
    message += `🏪 ${tenant?.name || 'PayQusta'}`;

    // Send via WhatsApp
    const result = await WhatsAppService.sendMessage(supplier.phone, message, tenant?.whatsapp);

    // Also try to generate and send PDF
    let pdfResult = null;
    try {
      pdfResult = await PDFService.generateRestockRequest(lowStockProducts, supplier, tenant);
      if (pdfResult.success) {
        await WhatsAppService.sendDocument(
          supplier.phone,
          pdfResult.filepath,
          `طلب_اعادة_تخزين_${supplier.name}.pdf`,
          '📄 طلب إعادة تخزين مرفق',
          tenant?.whatsapp
        );
      }
    } catch (pdfErr) {
      // PDF generation failed, but text message was sent
    }

    ApiResponse.success(res, {
      productsCount: lowStockProducts.length,
      products: lowStockProducts.map(p => ({
        name: p.name,
        sku: p.sku,
        currentStock: p.stock?.quantity || 0,
        needed: Math.max(10, (p.stock?.minQuantity || 5) * 2 - (p.stock?.quantity || 0)),
      })),
      whatsappSent: result.success,
      pdfGenerated: pdfResult?.success || false,
    }, result.success ? 'تم إرسال طلب إعادة التخزين للمورد عبر WhatsApp ✅' : 'تم إعداد الطلب - تعذر الإرسال عبر WhatsApp');
  });

  /**
   * GET /api/v1/suppliers/:id/low-stock-products
   * Get low stock products for a specific supplier
   */
  getLowStockProducts = catchAsync(async (req, res, next) => {
    const supplier = await Supplier.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!supplier) return next(AppError.notFound('المورد غير موجود'));

    const lowStockProducts = await Product.find({
      ...req.tenantFilter,
      supplier: supplier._id,
      isActive: true,
      $expr: { $lte: ['$stock.quantity', '$stock.minQuantity'] },
    }).select('name sku stock.quantity stock.minQuantity costPrice sellingPrice category').lean();

    ApiResponse.success(res, {
      supplier: { _id: supplier._id, name: supplier.name, phone: supplier.phone },
      products: lowStockProducts,
      count: lowStockProducts.length,
    });
  });
}

module.exports = new SupplierController();
