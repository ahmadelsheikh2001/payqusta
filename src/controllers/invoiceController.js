/**
 * Invoice Controller — Sales, Installments & Payment Processing
 * Core business logic for invoice creation, payment, and WhatsApp notifications
 */

const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const Helpers = require('../utils/helpers');
const WhatsAppService = require('../services/WhatsAppService');
const NotificationService = require('../services/NotificationService');
const { PAYMENT_METHODS, INVOICE_STATUS } = require('../config/constants');

class InvoiceController {
  /**
   * GET /api/v1/invoices
   */
  async getAll(req, res, next) {
    try {
      const { page, limit, skip, sort } = Helpers.getPaginationParams(req.query);

      const filter = { ...req.tenantFilter };

      if (req.query.status) filter.status = req.query.status;
      if (req.query.customer) filter.customer = req.query.customer;
      if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;

      // Date range
      if (req.query.from || req.query.to) {
        filter.createdAt = {};
        if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
        if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
      }

      const [invoices, total] = await Promise.all([
        Invoice.find(filter)
          .populate('customer', 'name phone tier')
          .populate('createdBy', 'name')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Invoice.countDocuments(filter),
      ]);

      ApiResponse.paginated(res, invoices, { page, limit, total });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/invoices/:id
   */
  async getById(req, res, next) {
    try {
      const invoice = await Invoice.findOne({
        _id: req.params.id,
        ...req.tenantFilter,
      })
        .populate('customer', 'name phone email address tier gamification')
        .populate('items.product', 'name sku images')
        .populate('createdBy', 'name');

      if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

      ApiResponse.success(res, invoice);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/invoices
   * Create a new invoice with optional installment schedule
   */
  async create(req, res, next) {
    try {
      const {
        customerId, items, paymentMethod, discount = 0,
        numberOfInstallments, frequency, downPayment, startDate,
        notes, sendWhatsApp,
      } = req.body;

      // Validate customer
      const customer = await Customer.findOne({
        _id: customerId,
        ...req.tenantFilter,
      });
      if (!customer) return next(AppError.notFound('العميل غير موجود'));

      // Check if sales blocked for this customer
      if (customer.salesBlocked) {
        return next(AppError.badRequest(`⛔ البيع ممنوع لهذا العميل: ${customer.salesBlockedReason || 'تم منع البيع'}`));
      }

      // Validate and prepare items
      const invoiceItems = [];
      let subtotal = 0;

      for (const item of items) {
        const product = await Product.findOne({
          _id: item.productId,
          ...req.tenantFilter,
        });

        if (!product) {
          return next(AppError.notFound(`المنتج غير موجود: ${item.productId}`));
        }

        if (product.stock.quantity < item.quantity) {
          return next(
            AppError.badRequest(`الكمية المطلوبة من "${product.name}" أكبر من المخزون (${product.stock.quantity})`)
          );
        }

        const totalPrice = product.price * item.quantity;
        subtotal += totalPrice;

        invoiceItems.push({
          product: product._id,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          unitPrice: product.price,
          totalPrice,
        });

        // Deduct stock
        product.stock.quantity -= item.quantity;
        await product.save();
      }

      // Calculate total (NO TAX — as per BRD)
      const totalAmount = subtotal - discount;

      // Create invoice
      const invoiceData = {
        tenant: req.tenantId,
        invoiceNumber: Helpers.generateInvoiceNumber(),
        customer: customer._id,
        createdBy: req.user._id,
        items: invoiceItems,
        subtotal,
        discount,
        totalAmount,
        paymentMethod,
        notes,
      };

      // Handle payment method
      if (paymentMethod === PAYMENT_METHODS.CASH) {
        invoiceData.paidAmount = totalAmount;
        invoiceData.remainingAmount = 0;
        invoiceData.status = INVOICE_STATUS.PAID;
      } else if (paymentMethod === PAYMENT_METHODS.INSTALLMENT) {
        const dp = downPayment || 0;
        invoiceData.paidAmount = dp;
        invoiceData.remainingAmount = totalAmount - dp;
        invoiceData.installmentConfig = {
          numberOfInstallments: numberOfInstallments || 3,
          frequency: frequency || 'monthly',
          downPayment: dp,
          startDate: startDate ? new Date(startDate) : new Date(),
        };

        // Generate installment schedule
        invoiceData.installments = Helpers.generateInstallmentSchedule(
          totalAmount,
          dp,
          numberOfInstallments || 3,
          frequency || 'monthly',
          startDate ? new Date(startDate) : new Date()
        );

        invoiceData.status = dp > 0 ? INVOICE_STATUS.PARTIALLY_PAID : INVOICE_STATUS.PENDING;
      } else if (paymentMethod === PAYMENT_METHODS.DEFERRED) {
        invoiceData.paidAmount = 0;
        invoiceData.remainingAmount = totalAmount;
        invoiceData.status = INVOICE_STATUS.PENDING;
        invoiceData.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      const invoice = await Invoice.create(invoiceData);

      // Update customer financials
      customer.recordPurchase(totalAmount, invoiceData.paidAmount);
      await customer.save();

      // Send WhatsApp notification (non-blocking)
      if (sendWhatsApp && customer.whatsapp?.enabled) {
        WhatsAppService.sendInvoiceNotification(
          customer.whatsapp.number || customer.phone,
          invoice,
          customer
        ).then(() => {
          invoice.whatsappSent = true;
          invoice.whatsappSentAt = new Date();
          invoice.save();
        }).catch((err) => {
          // Don't block — WhatsApp is best-effort
        });
      }

      // In-app notification (always fires)
      NotificationService.onInvoiceCreated(req.tenantId, invoice, customer.name).catch(() => {});

      // Populate and return
      const populatedInvoice = await Invoice.findById(invoice._id)
        .populate('customer', 'name phone tier')
        .populate('createdBy', 'name');

      ApiResponse.created(res, populatedInvoice, 'تم إنشاء الفاتورة بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/invoices/:id/pay
   * Record a payment against an invoice
   */
  async recordPayment(req, res, next) {
    try {
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
        NotificationService.onPaymentReceived(req.tenantId, invoice, amount, customer.name).catch(() => {});
      }

      ApiResponse.success(res, invoice, 'تم تسجيل الدفعة بنجاح');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/invoices/:id/pay-all
   * Pay all remaining balance at once (سداد كامل)
   */
  async payAll(req, res, next) {
    try {
      const invoice = await Invoice.findOne({
        _id: req.params.id,
        ...req.tenantFilter,
      });

      if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

      if (invoice.status === INVOICE_STATUS.PAID) {
        return next(AppError.badRequest('الفاتورة مدفوعة بالكامل'));
      }

      invoice.payAllRemaining(req.user._id);
      await invoice.save();

      // Update customer
      const customer = await Customer.findById(invoice.customer);
      if (customer) {
        customer.recordPayment(invoice.remainingAmount, true);
        await customer.save();
      }

      ApiResponse.success(res, invoice, 'تم سداد كامل المبلغ المتبقي');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/invoices/overdue
   * Get all overdue invoices
   */
  async getOverdue(req, res, next) {
    try {
      const invoices = await Invoice.getOverdueInvoices(req.tenantId);

      ApiResponse.success(res, invoices);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/invoices/upcoming-installments
   * Get installments due within specified days
   */
  async getUpcomingInstallments(req, res, next) {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/invoices/:id/send-whatsapp
   * Send invoice details via WhatsApp
   */
  async sendWhatsApp(req, res, next) {
    try {
      const invoice = await Invoice.findOne({
        _id: req.params.id,
        ...req.tenantFilter,
      }).populate('customer', 'name phone whatsapp');

      if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));

      const phone = invoice.customer.whatsapp?.number || invoice.customer.phone;

      // Non-blocking WhatsApp send with short timeout
      const result = await WhatsAppService.sendInvoiceNotification(phone, invoice, invoice.customer);

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
  }

  /**
   * GET /api/v1/invoices/sales-summary
   */
  async getSalesSummary(req, res, next) {
    try {
      const period = parseInt(req.query.period, 10) || 30;
      const summary = await Invoice.getSalesSummary(req.tenantId, period);

      ApiResponse.success(res, summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/invoices/send-whatsapp-message
   * Send custom WhatsApp message (for customer statements, etc.)
   */
  async sendWhatsAppMessage(req, res, next) {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) return next(AppError.badRequest('رقم الهاتف والرسالة مطلوبين'));

      const result = await WhatsAppService.sendMessage(phone, message);
      ApiResponse.success(res, { success: result.success }, result.success ? 'تم إرسال الرسالة عبر WhatsApp' : 'فشل إرسال الرسالة');
    } catch (error) {
      // Don't crash, just return failure
      ApiResponse.success(res, { success: false }, 'تعذر الإرسال عبر WhatsApp');
    }
  }
}

module.exports = new InvoiceController();
