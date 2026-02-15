/**
 * Payment Gateway Controller
 */

const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const PaymentGatewayService = require('../services/PaymentGatewayService');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');

class PaymentGatewayController {
  /**
   * POST /api/v1/payments/create-link
   * Create payment link for invoice
   */
  async createPaymentLink(req, res, next) {
    try {
      const { invoiceId } = req.body;

      const invoice = await Invoice.findOne({ _id: invoiceId, ...req.tenantFilter })
        .populate('customer');

      if (!invoice) return next(AppError.notFound('الفاتورة غير موجودة'));
      if (invoice.status === 'paid') return next(AppError.badRequest('الفاتورة مدفوعة بالفعل'));

      const paymentData = await PaymentGatewayService.createPaymentLink(invoice, invoice.customer);

      ApiResponse.success(res, paymentData, 'تم إنشاء رابط الدفع');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/payments/callback
   * Handle payment gateway callback
   */
  async handleCallback(req, res, next) {
    try {
      const provider = req.query.provider || 'paymob';
      const result = await PaymentGatewayService.verifyPayment(provider, req.body);

      if (!result.success) {
        return ApiResponse.error(res, 'فشل الدفع', 400);
      }

      // Find invoice and record payment
      const invoice = await Invoice.findOne({ invoiceNumber: result.invoiceNumber });
      if (invoice) {
        invoice.recordPayment(result.amount, 'online', null, result.transactionId);
        await invoice.save();
      }

      ApiResponse.success(res, { invoice }, 'تم تسجيل الدفع بنجاح');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentGatewayController();
