/**
 * Invoice Service — Business Logic for Sales & Invoices
 */

const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const Helpers = require('../utils/helpers');
const NotificationService = require('./NotificationService');
const GamificationService = require('./GamificationService');
const WhatsAppService = require('./WhatsAppService');
const { PAYMENT_METHODS, INVOICE_STATUS } = require('../config/constants');

class InvoiceService {
  /**
   * Create a new invoice
   * @param {string} tenantId - The tenant ID
   * @param {string} userId - The ID of the user creating the invoice
   * @param {object} data - Invoice data (customerId, items, paymentMethod, etc.)
   */
  async createInvoice(tenantId, userId, data) {
    const {
      customerId, items, paymentMethod, discount = 0,
      numberOfInstallments, frequency, downPayment, startDate,
      notes, sendWhatsApp, source
    } = data;

    // Validate customer
    const customer = await Customer.findOne({
      _id: customerId,
      tenant: tenantId,
      isActive: true
    });
    if (!customer) throw AppError.notFound('العميل غير موجود');

    // Check if sales blocked for this customer
    if (customer.salesBlocked) {
      throw AppError.badRequest(`⛔ البيع ممنوع لهذا العميل: ${customer.salesBlockedReason || 'تم منع البيع'}`);
    }

    // Validate and prepare items
    const invoiceItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        tenant: tenantId,
        isActive: true
      });

      if (!product) {
        throw AppError.notFound(`المنتج غير موجود: ${item.productId}`);
      }

      if (product.stock.quantity < item.quantity) {
        throw AppError.badRequest(`الكمية المطلوبة من "${product.name}" أكبر من المخزون (${product.stock.quantity})`);
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

      // Trigger low stock / out of stock notifications
      if (product.stock.quantity <= 0 && !product.outOfStockAlertSent) {
        NotificationService.onOutOfStock(tenantId, product).catch(() => {});
      } else if (product.stock.quantity <= product.stock.minQuantity && !product.lowStockAlertSent) {
        NotificationService.onLowStock(tenantId, product).catch(() => {});
      }
    }

    // Calculate total
    const totalAmount = subtotal - discount;

    // Check Credit Limit
    let transactionPendingAmount = 0;
    if (paymentMethod === PAYMENT_METHODS.INSTALLMENT) {
      transactionPendingAmount = totalAmount - (downPayment || 0);
    } else if (paymentMethod === PAYMENT_METHODS.DEFERRED) {
      transactionPendingAmount = totalAmount;
    }

    const currentBalance = customer.financials.outstandingBalance || 0;
    const creditLimit = customer.financials.creditLimit || 0;

    if (creditLimit > 0 && (currentBalance + transactionPendingAmount) > creditLimit) {
      throw AppError.badRequest(`⛔ تجاوز الحد الائتماني! رصيد العميل الحالي (${currentBalance}) + المبلغ المتبقي (${transactionPendingAmount}) يتجاوز الحد المسموح (${creditLimit})`);
    }

    // Prepare Invoice Data
    const invoiceData = {
      tenant: tenantId,
      invoiceNumber: Helpers.generateInvoiceNumber(),
      customer: customer._id,
      createdBy: userId,
      items: invoiceItems,
      subtotal,
      discount,
      totalAmount,
      paymentMethod,
      notes,
      source: source || 'pos',
    };

    // Handle payment method configuration
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
      invoiceData.dueDate = data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    // Create Invoice
    const invoice = await Invoice.create(invoiceData);

    // Update customer financials
    customer.recordPurchase(totalAmount, invoiceData.paidAmount);
    await customer.save();

    // Gamification
    if (userId) {
      const xpEarned = Math.floor(totalAmount / 10);
      if (xpEarned > 0) {
        await GamificationService.addXP(userId, xpEarned);
      }
      await GamificationService.checkAchievements(userId, totalAmount);
    }

    // Notifications
    const Tenant = require('../models/Tenant'); // Lazy load
    const tenant = await Tenant.findById(tenantId);

    if (sendWhatsApp && customer.whatsapp?.enabled && customer.whatsapp?.notifications?.invoices !== false) {
      WhatsAppService.sendInvoiceNotification(
        customer.whatsapp.number || customer.phone,
        invoice,
        customer,
        tenant?.whatsapp
      ).then(() => {
        invoice.whatsappSent = true;
        invoice.whatsappSentAt = new Date();
        invoice.save();
      }).catch(() => {}); // Don't block
    }

    NotificationService.onInvoiceCreated(tenantId, invoice, customer.name).catch(() => {});

    // Return populated invoice
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name phone tier')
      .populate('createdBy', 'name');

    return populatedInvoice;
  }
}

module.exports = new InvoiceService();
