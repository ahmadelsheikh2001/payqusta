/**
 * Stock Monitor Job — Cron
 * Monitors stock levels and sends alerts via WhatsApp
 * Handles auto-restock requests to coordinators
 */

const cron = require('node-cron');
const Product = require('../models/Product');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const WhatsAppService = require('../services/WhatsAppService');
const logger = require('../utils/logger');

class StockMonitorJob {
  /**
   * Start the stock monitor
   * Runs every 6 hours
   */
  start() {
    cron.schedule('0 */6 * * *', () => this.checkStockLevels(), {
      timezone: 'Africa/Cairo',
    });

    logger.info('📦 Stock Monitor Job started');
  }

  async checkStockLevels() {
    try {
      logger.info('📦 Checking stock levels...');

      const tenants = await Tenant.find({
        isActive: true,
        'settings.autoRestockAlert': true,
      });

      for (const tenant of tenants) {
        // Find low stock products
        const lowStockProducts = await Product.findLowStock(tenant._id);

        if (lowStockProducts.length === 0) continue;

        // Get vendor
        const vendor = await User.findOne({
          tenant: tenant._id,
          role: 'vendor',
        });

        // Get coordinator (if exists)
        const coordinator = await User.findOne({
          tenant: tenant._id,
          role: 'coordinator',
        });

        for (const product of lowStockProducts) {
          const isOutOfStock = product.stock.quantity <= 0;

          // Send alert to vendor (if not already sent)
          if (vendor && tenant.whatsapp?.enabled && tenant.whatsapp?.notifications?.lowStockAlert) {
            if (
              (isOutOfStock && !product.outOfStockAlertSent) ||
              (!isOutOfStock && !product.lowStockAlertSent)
            ) {
              try {
                await WhatsAppService.sendLowStockAlert(
                  vendor.phone,
                  product,
                  isOutOfStock
                );

                if (isOutOfStock) {
                  product.outOfStockAlertSent = true;
                } else {
                  product.lowStockAlertSent = true;
                }
              } catch (err) {
                logger.error(`Stock alert WhatsApp failed: ${err.message}`);
              }
            }
          }

          // Auto-restock: send request to coordinator
          if (
            product.autoRestock?.enabled &&
            coordinator &&
            product.stock.quantity <= product.stock.minQuantity
          ) {
            try {
              await WhatsAppService.sendRestockRequest(
                coordinator.phone,
                product,
                product.autoRestock.quantity
              );

              logger.info(
                `Restock request sent for ${product.name} to coordinator`
              );
            } catch (err) {
              logger.error(`Restock request failed: ${err.message}`);
            }
          }

          await product.save();
        }
      }

      logger.info('✅ Stock level check completed');
    } catch (error) {
      logger.error(`Stock monitor error: ${error.message}`);
    }
  }
}

module.exports = StockMonitorJob;
