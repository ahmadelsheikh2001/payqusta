/**
 * Invoice Service — Business Logic for Sales & Invoices
 */

const mongoose = require('mongoose');
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

    // Start MongoDB session for atomic transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate customer
      const customer = await Customer.findOne({
        _id: customerId,
        tenant: tenantId,
        isActive: true
      }).session(session);
      if (!customer) throw AppError.notFound('العميل غير موجود');

      // Check if sales blocked for this customer
      if (customer.salesBlocked) {
        throw AppError.badRequest(`⛔ البيع ممنوع لهذا العميل: ${customer.salesBlockedReason || 'تم منع البيع'}`);
      }

      // Validate and prepare items (read stock without modifying yet)
      const invoiceItems = [];
      let subtotal = 0;
      let totalProfit = 0;
      const productsToUpdate = []; // collect products, update stock after invoice is created

      for (const item of items) {
        const product = await Product.findOne({
          _id: item.productId,
          tenant: tenantId,
          isActive: true
        }).session(session);

        if (!product) {
          throw AppError.notFound(`المنتج غير موجود: ${item.productId}`);
        }

        if (product.stock.quantity < item.quantity) {
          throw AppError.badRequest(`الكمية المطلوبة من "${product.name}" أكبر من المخزون (${product.stock.quantity})`);
        }

        const totalPrice = product.price * item.quantity;
        subtotal += totalPrice;
        totalProfit += (product.price - (product.cost || 0)) * item.quantity;

        invoiceItems.push({
          product: product._id,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          unitPrice: product.price,
          totalPrice,
        });

        productsToUpdate.push({ product, quantity: item.quantity });

        // Trigger low stock / out of stock notifications
        if (product.stock.quantity <= 0 && !product.outOfStockAlertSent) {
          NotificationService.onOutOfStock(tenantId, product).catch(() => { });
        } else if (product.stock.quantity <= product.stock.minQuantity && !product.lowStockAlertSent) {
          NotificationService.onLowStock(tenantId, product).catch(() => { });
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

      // Load user to check commission rate
      const User = require('../models/User');
      const user = await User.findById(userId).session(session);
      if (user && user.commissionRate > 0) {
        // Calculate commission from total profit minus any discounts spread proportionally, 
        // or simply from raw profit for simplicity 
        // Simplified: Just use raw total profit. Discounts might reduce profit, but typically commission on raw item profit is standard, 
        // or we can adjust: totalProfit = Math.max(0, totalProfit - discount)
        const adjustedProfit = Math.max(0, totalProfit - discount);
        invoiceData.commission = {
          amount: (adjustedProfit * user.commissionRate) / 100,
          isPaid: false
        };
      }

      // Create Invoice FIRST (inside transaction)
      const [invoice] = await Invoice.create([invoiceData], { session });

      // NOW deduct stock (after invoice is created successfully)
      for (const { product, quantity } of productsToUpdate) {
        product.stock.quantity -= quantity;
        await product.save({ session });

        // Trigger low stock / out of stock notifications (non-blocking, outside transaction)
        if (product.stock.quantity <= 0 && !product.outOfStockAlertSent) {
          NotificationService.onOutOfStock(tenantId, product).catch(() => { });
        } else if (product.stock.quantity <= product.stock.minQuantity && !product.lowStockAlertSent) {
          NotificationService.onLowStock(tenantId, product).catch(() => { });
        }
      }

      // Update customer financials (inside transaction)
      customer.recordPurchase(totalAmount, invoiceData.paidAmount);
      await customer.save({ session });

      // Commit transaction - all operations succeeded
      await session.commitTransaction();
      session.endSession();

      // Post-transaction: Gamification (non-critical)
      if (userId) {
        const xpEarned = Math.floor(totalAmount / 10);
        if (xpEarned > 0) {
          GamificationService.addXP(userId, xpEarned).catch(() => { });
        }
        GamificationService.checkAchievements(userId, totalAmount).catch(() => { });
      }

      // Post-transaction: Notifications (non-critical)
      const Tenant = require('../models/Tenant');
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
        }).catch(() => { });
      }

      NotificationService.onInvoiceCreated(tenantId, invoice, customer.name).catch(() => { });

      // Return populated invoice
      const populatedInvoice = await Invoice.findById(invoice._id)
        .populate('customer', 'name phone tier')
        .populate('createdBy', 'name');

      return populatedInvoice;

    } catch (err) {
      // Rollback all changes if anything failed
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }
}

module.exports = new InvoiceService();
