/**
 * Invoice Controller — Sales, Installments & Payment Processing
 * Core business logic for invoice creation, payment, and WhatsApp notifications
 */

const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const InvoiceService = require('../services/InvoiceService');
const Helpers = require('../utils/helpers');
const WhatsAppService = require('../services/WhatsAppService');
const NotificationService = require('../services/NotificationService');
const GamificationService = require('../services/GamificationService');
const catchAsync = require('../utils/catchAsync');
const { PAYMENT_METHODS, INVOICE_STATUS } = require('../config/constants');

class InvoiceController {
  /**
   * GET /api/v1/invoices
   * Get all invoices with pagination and filtering
   */
  getAll = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 50, search, status, orderStatus, source, customerId, startDate, endDate, sortBy = '-createdAt', branch } = req.query;

    const filter = { ...req.tenantFilter };

    // Filter by customer
    if (customerId) filter.customer = customerId;
    // Filter by branch
    if (branch) filter.branch = branch;
    // Filter by payment status
    if (status) filter.status = status;
    // Filter by source (e.g., 'portal')
    if (source) filter.source = source;
    // Filter by order tracking status
    if (orderStatus) filter.orderStatus = orderStatus;

    // Filter by date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Search by invoice number or customer name/phone
    if (search) {
      // Find matching customers first
      const matchingCustomers = await Customer.find({
        ...req.tenantFilter,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();

      const customerIds = matchingCustomers.map(c => c._id);

      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        ...(customerIds.length > 0 ? [{ customer: { $in: customerIds } }] : [])
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('customer', 'name phone balance creditLimit')
        .populate('createdBy', 'name')
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    ApiResponse.success(res, {
      invoices,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  });

  /**
   * GET /api/v1/invoices/:id
   * Get a single invoice by ID
   */
  getById = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    })
      .populate('customer', 'name phone address whatsapp balance creditLimit')
      .populate('createdBy', 'name')
      .populate('items.product', 'name barcode')
      .lean();

    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    ApiResponse.success(res, invoice);
  });

  /**
   * POST /api/v1/invoices
   * Create a new invoice with optional installment schedule
   */
  create = catchAsync(async (req, res, next) => {
    const invoice = await InvoiceService.createInvoice(req.tenantId, req.user?._id, req.body);
    ApiResponse.created(res, invoice, 'تم إنشاء الفاتورة بنجاح');
  });

  // ...

  /**
   * POST /api/v1/invoices/:id/pay
   * Record a payment against an invoice
   */
  recordPayment = catchAsync(async (req, res, next) => {
    const { amount, method = 'cash', reference, notes } = req.body;

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    }).populate('customer');

    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    if (invoice.status === INVOICE_STATUS.PAID) {
      return next(AppError.badRequest('الفاتورة مدفوعة بالكامل'));
    }

    if (amount > invoice.remainingAmount) {
      return next(AppError.badRequest(`المبلغ أكبر من المتبقي (${invoice.remainingAmount})`));
    }

    // Record payment
    invoice.recordPayment(amount, method, req.user._id, reference);
    await invoice.save();

    // Update customer financials
    const customer = await Customer.findById(invoice.customer._id);
    if (customer) {
      const isOnTime = !invoice.installments.some(
        (i) => i.status === 'overdue'
      );
      customer.recordPayment(amount, isOnTime);
      await customer.save();

      // In-app notification
      NotificationService.onPaymentReceived(req.tenantId, invoice, amount, customer.name).catch(() => { });

      // WhatsApp payment confirmation (non-blocking) — respects customer preferences
      if (customer.whatsapp?.enabled && customer.whatsapp?.notifications?.payments !== false) {
        // Need to get tenant config
        const tenant = await require('../models/Tenant').findById(req.tenantId);
        const whatsappPhone = customer.whatsapp?.number || customer.phone;
        if (whatsappPhone && tenant?.whatsapp) {
          WhatsAppService.sendPaymentReceivedTemplate(
            whatsappPhone, customer, amount, invoice.remainingAmount, invoice.invoiceNumber, tenant.whatsapp
          ).catch(() => { });
        }
      }
    }

    ApiResponse.success(res, invoice, 'تم تسجيل الدفعة بنجاح');
  });

  /**
   * POST /api/v1/invoices/:id/pay-all
   * Pay all remaining balance at once (سداد كامل)
   */
  payAll = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    });

    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    if (invoice.status === INVOICE_STATUS.PAID) {
      return next(AppError.badRequest('الفاتورة مدفوعة بالكامل'));
    }

    // Capture remaining amount BEFORE calling payAllRemaining (it sets it to 0)
    const amountBeingPaid = invoice.remainingAmount;

    invoice.payAllRemaining(req.user._id);
    await invoice.save();

    // Update customer with the correct amount that was paid
    const customer = await Customer.findById(invoice.customer);
    if (customer && amountBeingPaid > 0) {
      customer.recordPayment(amountBeingPaid, true);
      await customer.save();
    }

    ApiResponse.success(res, invoice, 'تم سداد كامل المبلغ المتبقي');
  });

  /**
   * GET /api/v1/invoices/overdue
   * Get all overdue invoices
   */
  getOverdue = catchAsync(async (req, res, next) => {
    const invoices = await Invoice.getOverdueInvoices(req.tenantId);
    ApiResponse.success(res, invoices);
  });

  /**
   * GET /api/v1/invoices/upcoming-installments
   * Get installments due within specified days
   */
  getUpcomingInstallments = catchAsync(async (req, res, next) => {
    const days = parseInt(req.query.days, 10) || 7;
    const invoices = await Invoice.getUpcomingInstallments(req.tenantId, days);

    // Flatten installments with invoice and customer info
    const upcoming = [];
    invoices.forEach((inv) => {
      inv.installments
        .filter((inst) => ['pending', 'overdue'].includes(inst.status))
        .forEach((inst) => {
          upcoming.push({
            invoiceId: inv._id,
            invoiceNumber: inv.invoiceNumber,
            customer: inv.customer,
            installmentNumber: inst.installmentNumber,
            amount: inst.amount,
            paidAmount: inst.paidAmount,
            dueDate: inst.dueDate,
            status: inst.status,
            invoiceTotal: inv.totalAmount,
            invoicePaid: inv.paidAmount,
            invoiceRemaining: inv.remainingAmount,
          });
        });
    });

    upcoming.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    ApiResponse.success(res, upcoming);
  });

  /**
   * POST /api/v1/invoices/:id/send-whatsapp
   * Send invoice details via WhatsApp
   */
  sendWhatsApp = catchAsync(async (req, res, next) => {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      ...req.tenantFilter,
    }).populate('customer', 'name phone whatsapp');

    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    const phone = invoice.customer.whatsapp?.number || invoice.customer.phone;

    // Non-blocking WhatsApp send with short timeout
    // We wrap this in try-catch internally if we want specific error handling,
    // but catchAsync will handle unexpected errors.
    // However, the original code had a specific 'success' response even on error.

    try {
      const tenant = await require('../models/Tenant').findById(req.tenantId);
      const result = await WhatsAppService.sendInvoiceNotification(phone, invoice, invoice.customer, tenant?.whatsapp);

      if (result && !result.failed && !result.skipped) {
        invoice.whatsappSent = true;
        invoice.whatsappSentAt = new Date();
        await invoice.save();
        ApiResponse.success(res, null, 'تم إرسال الفاتورة عبر WhatsApp');
      } else {
        // WhatsApp failed but don't crash — inform user
        ApiResponse.success(res, { whatsappStatus: 'failed', reason: result?.error || result?.reason || 'unknown' },
          'تعذر الإرسال عبر WhatsApp — تحقق من اتصال الإنترنت أو إعدادات API');
      }
    } catch (error) {
      // Don't crash, just inform
      ApiResponse.success(res, { whatsappStatus: 'error' },
        'تعذر الإرسال — خطأ في اتصال WhatsApp');
    }
  });

  /**
   * GET /api/v1/invoices/sales-summary
   */
  getSalesSummary = catchAsync(async (req, res, next) => {
    const period = parseInt(req.query.period, 10) || 30;
    const summary = await Invoice.getSalesSummary(req.tenantId, period);

    ApiResponse.success(res, summary);
  });

  /**
   * POST /api/v1/invoices/send-whatsapp-message
   * Send custom WhatsApp message (for customer statements, etc.)
   */
  sendWhatsAppMessage = catchAsync(async (req, res, next) => {
    const { phone, message } = req.body;
    if (!phone || !message) return next(AppError.badRequest('رقم الهاتف والرسالة مطلوبين'));

    try {
      const tenant = await require('../models/Tenant').findById(req.tenantId);
      const result = await WhatsAppService.sendMessage(phone, message, tenant?.whatsapp);
      ApiResponse.success(res, { success: result.success }, result.success ? 'تم إرسال الرسالة عبر WhatsApp' : 'فشل إرسال الرسالة');
    } catch (error) {
      // Don't crash, just return failure
      ApiResponse.success(res, { success: false }, 'تعذر الإرسال عبر WhatsApp');
    }
  });

  /**
   * PATCH /api/v1/invoices/:id/order-status
   * Update portal order tracking status
   */
  updateOrderStatus = catchAsync(async (req, res, next) => {
    const { orderStatus, note } = req.body;
    const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!orderStatus || !allowedStatuses.includes(orderStatus)) {
      return next(AppError.badRequest('حالة الطلب غير صالحة'));
    }

    const invoice = await Invoice.findOne({ _id: req.params.id, ...req.tenantFilter });
    if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

    invoice.orderStatus = orderStatus;
    invoice.orderStatusHistory = invoice.orderStatusHistory || [];
    invoice.orderStatusHistory.push({
      status: orderStatus,
      date: new Date(),
      note: note || `تم التحديث إلى: ${orderStatus}`,
    });

    await invoice.save({ validateBeforeSave: false });

    // Notify customer
    try {
      const labels = { pending: 'قيد الانتظار', confirmed: 'مؤكد', processing: 'جاري التجهيز', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي' };
      const Notification = require('../models/Notification');
      await Notification.create({
        tenant: invoice.tenant,
        customerRecipient: invoice.customer,
        type: 'order',
        title: `تحديث طلبك #${invoice.invoiceNumber}`,
        message: `تم تحديث حالة طلبك إلى: ${labels[orderStatus] || orderStatus}`,
        icon: 'package',
        color: orderStatus === 'delivered' ? 'success' : orderStatus === 'cancelled' ? 'danger' : 'info',
        link: `/portal/orders/${invoice._id}`
      });
    } catch { /* ignore */ }

    ApiResponse.success(res, { orderStatus }, 'تم تحديث حالة الطلب');
  });
}

module.exports = new InvoiceController();
