/**
 * Customer Controller — Client Management & Gamification
 */

const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Tenant = require('../models/Tenant');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');
const PDFService = require('../services/PDFService');
const WhatsAppService = require('../services/WhatsAppService');
const NotificationService = require('../services/NotificationService');
const catchAsync = require('../utils/catchAsync');
const logger = require('../utils/logger');

class CustomerController {
  getAll = catchAsync(async (req, res, next) => {
    const { page, limit, skip, sort } = Helpers.getPaginationParams(req.query);
    const filter = { ...req.tenantFilter, isActive: true };

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
      ];
    }
    if (req.query.tier) filter.tier = req.query.tier;
    if (req.query.hasBalance === 'true') filter['financials.outstandingBalance'] = { $gt: 0 };

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Customer.countDocuments(filter),
    ]);

    ApiResponse.paginated(res, customers, { page, limit, total });
  });

  getById = catchAsync(async (req, res, next) => {
    const customer = await Customer.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    // Get customer's invoices
    const invoices = await Invoice.find({ customer: customer._id, ...req.tenantFilter })
      .sort('-createdAt')
      .limit(20)
      .select('invoiceNumber totalAmount paidAmount remainingAmount status createdAt paymentMethod');

    ApiResponse.success(res, { customer, invoices });
  });

  create = catchAsync(async (req, res, next) => {
    const tenantId = req.tenantId || req.body.tenantId;
    if (!tenantId) {
      return next(AppError.badRequest('يجب تحديد المتجر لإضافة عميل'));
    }

    const customerData = {
      ...req.body,
      tenant: tenantId,
      financials: {
        ...req.body.financials,
        creditLimit: req.body.creditLimit !== undefined ? req.body.creditLimit : (req.body.financials?.creditLimit || 10000),
      },
      whatsapp: {
        enabled: true,
        number: Helpers.formatPhoneForWhatsApp(req.body.phone),
      },
    };

    const customer = await Customer.create(customerData);

    // Send Notification
    NotificationService.onNewCustomer(tenantId, customer.name).catch(() => {});

    ApiResponse.created(res, customer, 'تم إضافة العميل بنجاح');
  });

  update = catchAsync(async (req, res, next) => {
    const allowedFields = ['name', 'phone', 'email', 'address', 'nationalId', 'notes', 'tags', 'tier'];
    const updateData = {};
    allowedFields.forEach((f) => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

    if (req.body.creditLimit !== undefined) {
      updateData['financials.creditLimit'] = req.body.creditLimit;
    }

    if (req.body.phone) {
      updateData['whatsapp.number'] = Helpers.formatPhoneForWhatsApp(req.body.phone);
    }

    // WhatsApp notification preferences
    if (req.body.whatsapp !== undefined) {
      if (req.body.whatsapp.enabled !== undefined) updateData['whatsapp.enabled'] = req.body.whatsapp.enabled;
      if (req.body.whatsapp.notifications) {
        const n = req.body.whatsapp.notifications;
        if (n.invoices !== undefined) updateData['whatsapp.notifications.invoices'] = n.invoices;
        if (n.reminders !== undefined) updateData['whatsapp.notifications.reminders'] = n.reminders;
        if (n.statements !== undefined) updateData['whatsapp.notifications.statements'] = n.statements;
        if (n.payments !== undefined) updateData['whatsapp.notifications.payments'] = n.payments;
      }
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, ...req.tenantFilter },
      updateData,
      { new: true, runValidators: true }
    );

    if (!customer) return next(AppError.notFound('العميل غير موجود'));
    ApiResponse.success(res, customer, 'تم تحديث بيانات العميل');
  });

  delete = catchAsync(async (req, res, next) => {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, ...req.tenantFilter },
      { isActive: false },
      { new: true }
    );
    if (!customer) return next(AppError.notFound('العميل غير موجود'));
    ApiResponse.success(res, null, 'تم حذف العميل');
  });

  getTopCustomers = catchAsync(async (req, res, next) => {
    const limit = parseInt(req.query.limit, 10) || 10;
    const customers = await Customer.getTopCustomers(req.tenantId, limit);
    ApiResponse.success(res, customers);
  });

  getDebtors = catchAsync(async (req, res, next) => {
    const customers = await Customer.getDebtors(req.tenantId);
    ApiResponse.success(res, customers);
  });

  getTransactionHistory = catchAsync(async (req, res, next) => {
    const customer = await Customer.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    // Get page and limit for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find({ customer: customer._id })
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .populate('items.product', 'name sku images')
        .select('invoiceNumber items totalAmount paidAmount remainingAmount status paymentMethod installments installmentConfig createdAt notes'),
      Invoice.countDocuments({ customer: customer._id }),
    ]);

    ApiResponse.success(res, {
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        tier: customer.tier,
        financials: customer.financials,
        salesBlocked: customer.salesBlocked,
        salesBlockedReason: customer.salesBlockedReason,
      },
      invoices,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  /**
   * POST /api/v1/customers/:id/block-sales
   * Block sales for a risky customer
   */
  blockSales = catchAsync(async (req, res, next) => {
    const { reason } = req.body;
    const customer = await Customer.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    customer.blockSales(reason || 'منع البيع بسبب المخاطر العالية');
    await customer.save();

    ApiResponse.success(res, customer, 'تم منع البيع للعميل');
  });

  /**
   * POST /api/v1/customers/:id/unblock-sales
   * Unblock sales for a customer
   */
  unblockSales = catchAsync(async (req, res, next) => {
    const customer = await Customer.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    customer.unblockSales();
    await customer.save();

    ApiResponse.success(res, customer, 'تم السماح بالبيع للعميل');
  });

  /**
   * GET /api/v1/customers/:id/credit-assessment
   * Get detailed credit assessment for a customer
   */
  getCreditAssessment = catchAsync(async (req, res, next) => {
    const customer = await Customer.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    // Recalculate credit score
    await customer.calculateCreditScore(); // Ensure this is awaited if async
    await customer.save();

    // Get invoice history
    const invoices = await Invoice.find({ customer: customer._id }).lean();
    const overdueInvoices = invoices.filter(i => i.status === 'overdue');
    const paidInvoices = invoices.filter(i => i.status === 'paid');

    // Payment patterns
    const latePayments = [];
    invoices.forEach(inv => {
      (inv.installments || []).forEach(inst => {
        if (inst.paidDate && inst.dueDate) {
          const daysLate = Math.floor((new Date(inst.paidDate) - new Date(inst.dueDate)) / (1000 * 60 * 60 * 24));
          if (daysLate > 0) {
            latePayments.push({ invoiceNumber: inv.invoiceNumber, installment: inst.installmentNumber, daysLate });
          }
        }
      });
    });

    // Credit recommendation
    let recommendation = '';
    const ce = customer.creditEngine;
    if (ce.riskLevel === 'low') {
      recommendation = '✅ عميل ممتاز — يمكن زيادة حد الائتمان';
    } else if (ce.riskLevel === 'medium') {
      recommendation = '🟡 عميل متوسط المخاطر — التزم بالحدود الحالية';
    } else if (ce.riskLevel === 'high') {
      recommendation = '🟠 عميل عالي المخاطر — اقتصر على النقد أو أقساط قصيرة';
    } else {
      recommendation = '🔴 عميل محظور — لا ينصح بالبيع له';
    }

    ApiResponse.success(res, {
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        tier: customer.tier,
      },
      creditEngine: customer.creditEngine,
      paymentBehavior: customer.paymentBehavior,
      financials: customer.financials,
      salesBlocked: customer.salesBlocked,
      salesBlockedReason: customer.salesBlockedReason,
      history: {
        totalInvoices: invoices.length,
        paidInvoices: paidInvoices.length,
        overdueInvoices: overdueInvoices.length,
        latePayments: latePayments.slice(0, 10),
      },
      recommendation,
      suggestedActions: [
        ce.riskLevel === 'high' || ce.riskLevel === 'blocked' ? 'منع البيع بالأقساط' : null,
        customer.financials.outstandingBalance > customer.financials.creditLimit ? 'تجاوز الحد الائتماني' : null,
        latePayments.length > 3 ? 'متابعة التحصيل بشكل أكثر صرامة' : null,
      ].filter(Boolean),
    });
  });

  /**
   * POST /api/v1/customers/:id/send-statement
   * Generate PDF statement and send via WhatsApp
   */
  sendStatement = catchAsync(async (req, res, next) => {
    const customer = await Customer.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    const tenant = await Tenant.findById(req.tenantId);

    // Get transactions
    const invoices = await Invoice.find({ customer: customer._id })
      .sort('-createdAt')
      .select('invoiceNumber totalAmount paidAmount remainingAmount status paymentMethod createdAt')
      .lean();

    // Format WhatsApp message with full statement
    const totalPurchases = customer.financials?.totalPurchases || 0;
    const totalPaid = customer.financials?.totalPaid || 0;
    const outstanding = customer.financials?.outstandingBalance || 0;

    let message = `📋 *كشف حساب العميل*\n`;
    message += `━━━━━━━━━━━━━━━━━━\n`;
    message += `🏪 *${tenant?.name || 'PayQusta'}*\n`;
    message += `━━━━━━━━━━━━━━━━━━\n\n`;
    message += `👤 *الاسم:* ${customer.name}\n`;
    message += `📱 *الهاتف:* ${customer.phone}\n`;
    message += `⭐ *الفئة:* ${customer.tier === 'vip' ? 'VIP' : customer.tier === 'premium' ? 'Premium' : 'عادي'}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━\n`;
    message += `💰 *الملخص المالي*\n`;
    message += `━━━━━━━━━━━━━━━━━━\n`;
    message += `📊 إجمالي المشتريات: ${totalPurchases.toLocaleString('ar-EG')} ج.م\n`;
    message += `✅ إجمالي المدفوع: ${totalPaid.toLocaleString('ar-EG')} ج.م\n`;
    message += `${outstanding > 0 ? '🔴' : '🟢'} المتبقي: ${outstanding.toLocaleString('ar-EG')} ج.م\n\n`;

    if (invoices.length > 0) {
      message += `━━━━━━━━━━━━━━━━━━\n`;
      message += `📑 *سجل المعاملات (آخر ${Math.min(invoices.length, 10)})*\n`;
      message += `━━━━━━━━━━━━━━━━━━\n\n`;

      invoices.slice(0, 10).forEach((inv, i) => {
        const statusIcon = inv.status === 'paid' ? '✅' : inv.status === 'overdue' ? '🔴' : '🟡';
        const statusText = inv.status === 'paid' ? 'مسدد' : inv.status === 'overdue' ? 'متأخر' : 'قيد السداد';
        message += `*${i + 1}. ${inv.invoiceNumber}*\n`;
        message += `   📅 ${new Date(inv.createdAt).toLocaleDateString('ar-EG')}\n`;
        message += `   💵 المبلغ: ${inv.totalAmount.toLocaleString('ar-EG')} ج.م\n`;
        message += `   ✅ المدفوع: ${inv.paidAmount.toLocaleString('ar-EG')} ج.م\n`;
        if (inv.remainingAmount > 0) {
          message += `   🔴 المتبقي: ${inv.remainingAmount.toLocaleString('ar-EG')} ج.م\n`;
        }
        message += `   ${statusIcon} الحالة: ${statusText}\n\n`;
      });

      // Totals
      const totalAmount = invoices.reduce((s, i) => s + i.totalAmount, 0);
      const totalPaidInv = invoices.reduce((s, i) => s + i.paidAmount, 0);
      const totalRemaining = invoices.reduce((s, i) => s + i.remainingAmount, 0);
      
      message += `━━━━━━━━━━━━━━━━━━\n`;
      message += `📊 *الإجمالي*\n`;
      message += `المبيعات: ${totalAmount.toLocaleString('ar-EG')} ج.م\n`;
      message += `المحصّل: ${totalPaidInv.toLocaleString('ar-EG')} ج.م\n`;
      message += `المتبقي: ${totalRemaining.toLocaleString('ar-EG')} ج.م\n`;
    }

    message += `\n━━━━━━━━━━━━━━━━━━\n`;
    message += `📅 تاريخ الكشف: ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
    message += `\n_هذا كشف حساب رسمي من ${tenant?.name || 'PayQusta'}_`;

    // Send via WhatsApp
    const result = await WhatsAppService.sendMessage(customer.phone, message, tenant?.whatsapp);

    ApiResponse.success(res, {
      success: result.success || !result.failed,
      customer: { name: customer.name, phone: customer.phone },
      transactionsCount: invoices.length,
      whatsappResult: result,
    }, result.success ? 'تم إرسال كشف الحساب عبر WhatsApp ✅' : 'تعذر إرسال الكشف عبر WhatsApp');
  });

  /**
   * GET /api/v1/customers/:id/statement-pdf
   * Generate and download PDF statement
   */
  getStatementPDF = catchAsync(async (req, res, next) => {
    const customer = await Customer.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    const tenant = await Tenant.findById(req.tenantId);

    const invoices = await Invoice.find({ customer: customer._id })
      .sort('-createdAt')
      .select('invoiceNumber totalAmount paidAmount remainingAmount status paymentMethod createdAt')
      .lean();

    const pdfResult = await PDFService.generateCustomerStatement(customer, invoices, tenant?.name);

    if (pdfResult.success) {
      ApiResponse.success(res, {
        url: pdfResult.url,
        filename: pdfResult.filename,
      }, 'تم إنشاء كشف الحساب PDF');
    } else {
      next(AppError.internal('فشل إنشاء PDF'));
    }
  });

  /**
   * POST /api/v1/customers/:id/send-statement-pdf
   * Generate PDF and send via WhatsApp
   */
  sendStatementPDF = catchAsync(async (req, res, next) => {
    const customer = await Customer.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!customer) return next(AppError.notFound('العميل غير موجود'));
    if (!customer.phone) return next(AppError.badRequest('العميل ليس لديه رقم هاتف'));

    // Check if customer has WhatsApp statements disabled
    if (customer.whatsapp?.enabled === false || customer.whatsapp?.notifications?.statements === false) {
      return next(AppError.badRequest('إشعارات WhatsApp معطلة لهذا العميل'));
    }

    const tenant = await Tenant.findById(req.tenantId);

    const invoices = await Invoice.find({ customer: customer._id })
      .sort('-createdAt')
      .select('invoiceNumber totalAmount paidAmount remainingAmount status paymentMethod createdAt')
      .lean();

    // First, try to send using Template (works outside 24h window)
    const templateResult = await WhatsAppService.sendStatementTemplate(customer.phone, customer, tenant?.whatsapp);
    
    if (templateResult.success) {
      logger.info(`[Statement] Template sent successfully: ${templateResult.messageId}`);
    } else {
      logger.warn(`[Statement] Template failed: ${templateResult.error?.message || 'Unknown error'}`);
    }

    // Try sending PDF document (works if customer replied within 24h)
    logger.info(`[Statement] Attempting to send PDF document...`);

    // Generate PDF
    const pdfResult = await PDFService.generateCustomerStatement(customer, invoices, tenant?.name);
    if (!pdfResult.success) {
      return next(AppError.internal('فشل إنشاء PDF'));
    }

    // Send PDF via WhatsApp
    const whatsappResult = await WhatsAppService.sendDocument(
      customer.phone,
      pdfResult.filepath,
      `كشف_حساب_${customer.name}.pdf`,
      `📄 كشف حساب العميل: ${customer.name}\n💰 المستحق: ${Helpers.formatCurrency(customer.financials?.outstandingBalance || 0)}`,
      tenant?.whatsapp
    );

    // If PDF sending also failed (24h window issue), try text message
    if (!whatsappResult.success) {
      const outstanding = customer.financials?.outstandingBalance || 0;
      let message = `📊 *كشف حساب — ${customer.name}*\n`;
      message += `━━━━━━━━━━━━━━━\n`;
      message += `💰 المشتريات: ${Helpers.formatCurrency(customer.financials?.totalPurchases || 0)}\n`;
      message += `✅ المدفوع: ${Helpers.formatCurrency(customer.financials?.totalPaid || 0)}\n`;
      message += `${outstanding > 0 ? '🔴' : '🟢'} المتبقي: ${Helpers.formatCurrency(outstanding)}\n`;
      message += `━━━━━━━━━━━━━━━\n`;
      
      if (invoices.length > 0) {
        message += `\n📋 آخر 5 معاملات:\n`;
        invoices.slice(0, 5).forEach((inv, i) => {
          const icon = inv.status === 'paid' ? '✅' : inv.status === 'overdue' ? '🔴' : '🟡';
          message += `${i + 1}. ${inv.invoiceNumber} — ${Helpers.formatCurrency(inv.totalAmount)} ${icon}\n`;
        });
      }
      
      message += `\n📅 ${new Date().toLocaleDateString('ar-EG')}\n🏪 ${tenant?.name || 'PayQusta'}`;
      
      const textResult = await WhatsAppService.sendMessage(customer.phone, message, tenant?.whatsapp);
      
      // All methods failed - inform user about 24h window
      if (!textResult.success) {
        return ApiResponse.success(res, {
          pdfUrl: pdfResult.url,
          whatsappSent: false,
          needsTemplate: true,
          hint: '⚠️ العميل لم يراسلك خلال 24 ساعة. أنشئ Message Template في Meta للإرسال.',
        }, '⚠️ تم إنشاء PDF لكن فشل الإرسال — العميل خارج نافذة 24 ساعة');
      }
    }

    ApiResponse.success(res, {
      pdfUrl: pdfResult.url,
      whatsappSent: whatsappResult.success,
      method: whatsappResult.success ? 'document' : 'text',
      pdfSent: whatsappResult.success,
      templateSent: templateResult.success,
    }, whatsappResult.success 
        ? 'تم إرسال كشف الحساب وهناك رسالة PDF في الطريق ✅' 
        : 'تم إرسال الملخص. لإرسال الـ PDF يجب أن يرد العميل أولاً (نافذة 24 ساعة) ⚠️');
  });

  /**
   * PUT /api/v1/customers/:id/whatsapp-preferences
   * Update customer WhatsApp notification preferences
   */
  updateWhatsAppPreferences = catchAsync(async (req, res, next) => {
    const { enabled, notifications } = req.body;

    const updateData = {};
    if (enabled !== undefined) updateData['whatsapp.enabled'] = enabled;
    if (notifications) {
      if (notifications.invoices !== undefined) updateData['whatsapp.notifications.invoices'] = notifications.invoices;
      if (notifications.reminders !== undefined) updateData['whatsapp.notifications.reminders'] = notifications.reminders;
      if (notifications.statements !== undefined) updateData['whatsapp.notifications.statements'] = notifications.statements;
      if (notifications.payments !== undefined) updateData['whatsapp.notifications.payments'] = notifications.payments;
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, ...req.tenantFilter },
      { $set: updateData },
      { new: true }
    );

    if (!customer) return next(AppError.notFound('العميل غير موجود'));

    ApiResponse.success(res, {
      whatsapp: customer.whatsapp,
    }, 'تم تحديث إعدادات WhatsApp للعميل');
  });
}

module.exports = new CustomerController();
