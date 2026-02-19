/**
 * Payment Controller
 * Handles payment link generation, webhooks, and transaction queries
 */

const paymentGatewayService = require('../services/paymentGatewayService');
const PaymentTransaction = require('../models/PaymentTransaction');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');

class PaymentController {
  /**
   * Get all enabled payment gateways
   * GET /api/v1/payments/gateways
   */
  getGateways = catchAsync(async (req, res, next) => {
    const gateways = paymentGatewayService.getEnabledGateways();
    
    res.status(200).json(
      ApiResponse.success(gateways, 'تم الحصول على بوابات الدفع')
    );
  });

  /**
   * Create payment link for invoice
   * POST /api/v1/payments/create-link
   */
  createLink = catchAsync(async (req, res, next) => {
    const { invoiceId, gateway, amount, applyDiscount } = req.body;

    if (!invoiceId || !gateway) {
      return next(AppError.badRequest('رقم الفاتورة وبوابة الدفع مطلوبان'));
    }

    const result = await paymentGatewayService.createPaymentLink(
      invoiceId,
      gateway,
      {
        amount,
        applyDiscount,
        userId: req.user._id
      }
    );

    res.status(201).json(
      ApiResponse.success(result, 'تم إنشاء رابط الدفع')
    );
  });

  /**
   * Get payment transaction by ID
   * GET /api/v1/payments/transactions/:id
   */
  getTransaction = catchAsync(async (req, res, next) => {
    const transaction = await PaymentTransaction.findById(req.params.id)
      .populate('invoice customer createdBy');

    if (!transaction) {
      return next(AppError.notFound('المعاملة غير موجودة'));
    }

    // Check tenant access
    if (transaction.tenant.toString() !== req.user.tenant.toString()) {
      return next(AppError.forbidden('غير مصرح لك بالوصول'));
    }

    res.status(200).json(
      ApiResponse.success(transaction, 'تم الحصول على المعاملة')
    );
  });

  /**
   * Get all payment transactions
   * GET /api/v1/payments/transactions
   */
  getAllTransactions = catchAsync(async (req, res, next) => {
    const {
      page = 1,
      limit = 20,
      gateway,
      status,
      startDate,
      endDate,
      customer
    } = req.query;

    // Build filter
    const filter = { tenant: req.user.tenant };

    if (gateway) filter.gateway = gateway;
    if (status) filter.status = status;
    if (customer) filter.customer = customer;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      PaymentTransaction.find(filter)
        .populate('invoice customer createdBy')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PaymentTransaction.countDocuments(filter)
    ]);

    // Calculate summary
    const summary = await PaymentTransaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalFees: { $sum: '$fees' },
          totalDiscount: { $sum: '$discount' },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          pendingCount: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'processing']] }, 1, 0] }
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json(
      ApiResponse.success({
        transactions,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        },
        summary: summary[0] || {
          totalAmount: 0,
          totalFees: 0,
          totalDiscount: 0,
          successCount: 0,
          pendingCount: 0,
          failedCount: 0
        }
      }, 'تم الحصول على المعاملات')
    );
  });

  /**
   * Get payment analytics
   * GET /api/v1/payments/analytics
   */
  getAnalytics = catchAsync(async (req, res, next) => {
    const { period = '30' } = req.query; // days
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const filter = {
      tenant: req.user.tenant,
      createdAt: { $gte: startDate }
    };

    // Gateway breakdown
    const byGateway = await PaymentTransaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$gateway',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          successRate: {
            $avg: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          }
        }
      }
    ]);

    // Daily trend
    const dailyTrend = await PaymentTransaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json(
      ApiResponse.success({
        byGateway,
        dailyTrend
      }, 'تم الحصول على التحليلات')
    );
  });

  /**
   * Paymob webhook handler
   * POST /api/v1/payments/webhook/paymob
   */
  paymobWebhook = catchAsync(async (req, res) => {
    await paymentGatewayService.processWebhook('paymob', req.body);
    
    res.status(200).json({ success: true });
  });

  /**
   * Fawry webhook handler
   * POST /api/v1/payments/webhook/fawry
   */
  fawryWebhook = catchAsync(async (req, res) => {
    await paymentGatewayService.processWebhook('fawry', req.body);
    
    res.status(200).json({ success: true });
  });

  /**
   * Vodafone webhook handler
   * POST /api/v1/payments/webhook/vodafone
   */
  vodafoneWebhook = catchAsync(async (req, res) => {
    await paymentGatewayService.processWebhook('vodafone', req.body);
    
    res.status(200).json({ success: true });
  });

  /**
   * InstaPay webhook handler
   * POST /api/v1/payments/webhook/instapay
   */
  instapayWebhook = catchAsync(async (req, res) => {
    await paymentGatewayService.processWebhook('instapay', req.body);
    
    res.status(200).json({ success: true });
  });

  /**
   * Refund transaction
   * POST /api/v1/payments/transactions/:id/refund
   */
  refund = catchAsync(async (req, res, next) => {
    const { reason } = req.body;

    if (!reason) {
      return next(AppError.badRequest('سبب الاسترجاع مطلوب'));
    }

    const transaction = await PaymentTransaction.findById(req.params.id);

    if (!transaction) {
      return next(AppError.notFound('المعاملة غير موجودة'));
    }

    // Check tenant access
    if (transaction.tenant.toString() !== req.user.tenant.toString()) {
      return next(AppError.forbidden('غير مصرح لك بالوصول'));
    }

    if (transaction.status !== 'success') {
      return next(AppError.badRequest('لا يمكن استرجاع معاملة غير ناجحة'));
    }

    await transaction.refund(req.user._id, reason);

    res.status(200).json(
      ApiResponse.success(transaction, 'تم استرجاع المبلغ')
    );
  });
}

module.exports = new PaymentController();
