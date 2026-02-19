const Invoice = require('../models/Invoice');
const Product = require('../models/Product');

class AnalyticsService {
  /**
   * Calculate Average Daily Sales (ADS) and Run-rate for all products
   * @param {String} tenantId 
   * @param {Number} days Lookback period (default 30 days)
   */
  async getStockForecast(tenantId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. Fetch all active products for tenant
    const products = await Product.find({ 
      tenant: tenantId, 
      isActive: true,
      'stock.quantity': { $gt: 0 } // Only interested in items we actually HAVE
    }).lean();

    // 2. Aggregate sales per product over the last 'days'
    const salesStats = await Invoice.aggregate([
      { 
        $match: { 
          tenant: tenantId, 
          createdAt: { $gte: startDate },
          status: { $ne: 'cancelled' } // Exclude cancelled
        } 
      },
      { $unwind: '$items' },
      { 
        $group: { 
          _id: '$items.product', 
          totalSold: { $sum: '$items.quantity' } 
        } 
      }
    ]);

    // Map sales to a dictionary for O(1) lookup
    const salesMap = {};
    salesStats.forEach(stat => {
      salesMap[stat._id.toString()] = stat.totalSold;
    });

    // 3. Calculate metrics
    const forecast = products.map(product => {
      const totalSold = salesMap[product._id.toString()] || 0;
      const ads = totalSold / days; // Average Daily Sales
      
      let daysUntilStockout = 999;
      if (ads > 0) {
        daysUntilStockout = Math.round(product.stock.quantity / ads);
      }

      return {
        productId: product._id,
        name: product.name,
        currentStock: product.stock.quantity,
        totalSoldLast30Days: totalSold,
        ads: parseFloat(ads.toFixed(2)),
        daysUntilStockout,
        status: this._determineRiskLevel(daysUntilStockout)
      };
    });

    // 4. Return sorted by urgency (lowest daysUntilStockout first)
    return forecast
      .filter(item => item.daysUntilStockout !== 999) // Filter items with 0 sales (no velocity data)
      .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
  }

  _determineRiskLevel(days) {
    if (days <= 3) return 'critical'; // Run out in 3 days
    if (days <= 7) return 'high';     // Run out in a week
    if (days <= 14) return 'medium';  // Run out in 2 weeks
    return 'low';
  }
}

module.exports = new AnalyticsService();
