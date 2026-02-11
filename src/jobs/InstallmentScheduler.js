/**
 * Installment Scheduler — Cron Job
 * Runs daily to check for upcoming and overdue installments
 * Sends WhatsApp reminders to customers and vendors
 */

const cron = require('node-cron');
const Invoice = require('../models/Invoice');
const Tenant = require('../models/Tenant');
const Supplier = require('../models/Supplier');
const User = require('../models/User');
const WhatsAppService = require('../services/WhatsAppService');
const logger = require('../utils/logger');

class InstallmentScheduler {
  /**
   * Start the scheduler
   * Runs every day at 8:00 AM Cairo time
   */
  start() {
    // Customer installment reminders — daily at 8 AM
    cron.schedule('0 8 * * *', () => this.checkCustomerInstallments(), {
      timezone: 'Africa/Cairo',
    });

    // Supplier payment reminders — daily at 9 AM
    cron.schedule('0 9 * * *', () => this.checkSupplierPayments(), {
      timezone: 'Africa/Cairo',
    });

    // Overdue check — daily at 12 PM
    cron.schedule('0 12 * * *', () => this.markOverdueInstallments(), {
      timezone: 'Africa/Cairo',
    });

    logger.info('📅 Installment Scheduler started');
  }

  /**
   * Check customer installments and send reminders
   * تذكير العملاء بالأقساط المستحقة — قبل الموعد بيوم
   */
  async checkCustomerInstallments() {
    try {
      logger.info('🔍 Checking customer installments...');

      const tenants = await Tenant.find({
        isActive: true,
        'whatsapp.enabled': true,
        'whatsapp.notifications.installmentReminder': true,
      });

      for (const tenant of tenants) {
        // Find invoices with installments due tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const invoices = await Invoice.find({
          tenant: tenant._id,
          'installments.status': { $in: ['pending'] },
          'installments.dueDate': { $gte: tomorrow, $lt: dayAfter },
          'installments.reminderSent': { $ne: true },
        }).populate('customer', 'name phone whatsapp');

        for (const invoice of invoices) {
          const dueInstallments = invoice.installments.filter(
            (i) =>
              i.status === 'pending' &&
              !i.reminderSent &&
              i.dueDate >= tomorrow &&
              i.dueDate < dayAfter
          );

          for (const installment of dueInstallments) {
            try {
              const phone =
                invoice.customer.whatsapp?.number || invoice.customer.phone;

              // Send reminder to customer
              await WhatsAppService.sendInstallmentReminder(
                phone,
                invoice.customer,
                invoice,
                installment
              );

              // Also send reminder to vendor
              const vendor = await User.findOne({
                tenant: tenant._id,
                role: 'vendor',
              });

              if (vendor) {
                const vendorMessage =
                  `⏰ تذكير: العميل *${invoice.customer.name}* عليه قسط ` +
                  `*${installment.amount.toLocaleString('ar-EG')} ج.م* ` +
                  `مستحق غداً — فاتورة ${invoice.invoiceNumber}\n` +
                  `تم السداد: ${invoice.paidAmount.toLocaleString('ar-EG')} ج.م\n` +
                  `المتبقي: ${invoice.remainingAmount.toLocaleString('ar-EG')} ج.م`;

                await WhatsAppService.sendMessage(vendor.phone, vendorMessage);
              }

              // Mark reminder as sent
              installment.reminderSent = true;
              installment.lastReminderDate = new Date();
            } catch (err) {
              logger.error(
                `Failed to send installment reminder: ${err.message}`
              );
            }
          }

          await invoice.save();
        }
      }

      logger.info('✅ Customer installment check completed');
    } catch (error) {
      logger.error(`Installment scheduler error: ${error.message}`);
    }
  }

  /**
   * Check supplier payments and remind vendor
   * تذكير البائع بأقساط الموردين المستحقة
   * "خلي بالك انت عليك قسط للمورد X"
   */
  async checkSupplierPayments() {
    try {
      logger.info('🔍 Checking supplier payments...');

      const tenants = await Tenant.find({
        isActive: true,
        'whatsapp.enabled': true,
        'whatsapp.notifications.supplierPaymentDue': true,
      });

      for (const tenant of tenants) {
        const suppliers = await Supplier.getUpcomingPayments(tenant._id, 1);

        const vendor = await User.findOne({
          tenant: tenant._id,
          role: 'vendor',
        });

        if (!vendor) continue;

        for (const supplier of suppliers) {
          const pendingPayments = supplier.payments.filter(
            (p) =>
              (p.status === 'pending' || p.status === 'overdue') &&
              !p.reminderSent
          );

          for (const payment of pendingPayments) {
            try {
              // Send to vendor
              await WhatsAppService.sendVendorSupplierPaymentReminder(
                vendor.phone,
                supplier,
                payment
              );

              payment.reminderSent = true;
            } catch (err) {
              logger.error(
                `Failed to send supplier payment reminder: ${err.message}`
              );
            }
          }

          await supplier.save();
        }
      }

      logger.info('✅ Supplier payment check completed');
    } catch (error) {
      logger.error(`Supplier payment scheduler error: ${error.message}`);
    }
  }

  /**
   * Mark overdue installments
   */
  async markOverdueInstallments() {
    try {
      logger.info('🔍 Marking overdue installments...');

      const now = new Date();
      const result = await Invoice.updateMany(
        { 'installments.status': 'pending', 'installments.dueDate': { $lt: now } },
        { $set: { 'installments.$[elem].status': 'overdue' } },
        { arrayFilters: [{ 'elem.status': 'pending', 'elem.dueDate': { $lt: now } }] }
      );

      logger.info(
        `✅ Marked ${result.modifiedCount} invoices with overdue installments`
      );
    } catch (error) {
      logger.error(`Overdue check error: ${error.message}`);
    }
  }
}

module.exports = InstallmentScheduler;
