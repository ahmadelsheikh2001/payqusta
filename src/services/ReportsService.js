const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths } = require('date-fns');

/**
 * Advanced Reports Service
 * Provides comprehensive business analytics and reports
 */
class ReportsService {
  /**
   * Get sales report with detailed breakdown
   */
  async getSalesReport(tenantId, { startDate, endDate, groupBy = 'day' }) {
    const start = startDate ? new Date(startDate) : startOfMonth(new Date());
    const end = endDate ? new Date(endDate) : endOfMonth(new Date());

    // Get all invoices in date range
    const invoices = await Invoice.find({
      tenantId,
      createdAt: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' },
    }).populate('customer', 'name phone');

    // Calculate totals
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalRemaining = invoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);
    const totalProfit = invoices.reduce((sum, inv) => sum + (inv.profit || 0), 0);

    // Group by period
    const salesByPeriod = this._groupInvoicesByPeriod(invoices, groupBy);

    // Top customers
    const customerStats = this._calculateCustomerStats(invoices);
    const topCustomers = customerStats.slice(0, 10);

    // Payment methods breakdown
    const paymentMethods = await this._getPaymentMethodsBreakdown(tenantId, start, end);

    return {
      summary: {
        totalInvoices: invoices.length,
        totalRevenue,
        totalPaid,
        totalRemaining,
        totalProfit,
        profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0,
        collectionRate: totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(2) : 0,
      },
      salesByPeriod,
      topCustomers,
      paymentMethods,
      dateRange: { start, end },
    };
  }

  /**
   * Get profit analysis report
   */
  async getProfitReport(tenantId, { startDate, endDate }) {
    const start = startDate ? new Date(startDate) : startOfMonth(new Date());
    const end = endDate ? new Date(endDate) : endOfMonth(new Date());

    const invoices = await Invoice.find({
      tenantId,
      createdAt: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' },
    }).populate('items.product', 'name sku category');

    // Calculate profit by category
    const profitByCategory = {};
    const profitByProduct = {};

    invoices.forEach(invoice => {
      invoice.items?.forEach(item => {
        const product = item.product;
        if (!product) return;

        const itemProfit = (item.sellingPrice - item.purchasePrice) * item.quantity;
        const category = product.category || 'غير مصنف';

        // By category
        if (!profitByCategory[category]) {
          profitByCategory[category] = { revenue: 0, cost: 0, profit: 0, quantity: 0 };
        }
        profitByCategory[category].revenue += item.sellingPrice * item.quantity;
        profitByCategory[category].cost += item.purchasePrice * item.quantity;
        profitByCategory[category].profit += itemProfit;
        profitByCategory[category].quantity += item.quantity;

        // By product
        const productKey = product._id.toString();
        if (!profitByProduct[productKey]) {
          profitByProduct[productKey] = {
            name: product.name,
            sku: product.sku,
            category,
            revenue: 0,
            cost: 0,
            profit: 0,
            quantity: 0,
          };
        }
        profitByProduct[productKey].revenue += item.sellingPrice * item.quantity;
        profitByProduct[productKey].cost += item.purchasePrice * item.quantity;
        profitByProduct[productKey].profit += itemProfit;
        profitByProduct[productKey].quantity += item.quantity;
      });
    });

    // Convert to arrays and sort
    const categoryArray = Object.entries(profitByCategory).map(([name, data]) => ({
      category: name,
      ...data,
      profitMargin: data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(2) : 0,
    })).sort((a, b) => b.profit - a.profit);

    const productArray = Object.values(profitByProduct)
      .map(p => ({
        ...p,
        profitMargin: p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(2) : 0,
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 20); // Top 20 products

    const totalRevenue = categoryArray.reduce((sum, c) => sum + c.revenue, 0);
    const totalCost = categoryArray.reduce((sum, c) => sum + c.cost, 0);
    const totalProfit = categoryArray.reduce((sum, c) => sum + c.profit, 0);

    return {
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0,
      },
      byCategory: categoryArray,
      topProducts: productArray,
      dateRange: { start, end },
    };
  }

  /**
   * Get inventory report
   */
  async getInventoryReport(tenantId, { lowStockOnly = false, category = null }) {
    const filter = { tenantId, isActive: true };

    if (lowStockOnly) {
      filter.$or = [
        { 'stock.quantity': { $lte: 0 } },
        { $expr: { $lte: ['$stock.quantity', '$stock.minQuantity'] } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    const products = await Product.find(filter)
      .populate('supplier', 'name phone')
      .sort({ 'stock.quantity': 1 });

    // Calculate inventory value
    let totalValue = 0;
    let totalItems = 0;
    const stockLevels = { outOfStock: 0, lowStock: 0, normal: 0 };

    const inventoryData = products.map(product => {
      const quantity = product.stock?.quantity || 0;
      const minQty = product.stock?.minQuantity || 0;
      const value = quantity * (product.purchasePrice || 0);

      totalValue += value;
      totalItems += quantity;

      // Categorize stock level
      let status = 'normal';
      if (quantity <= 0) {
        status = 'outOfStock';
        stockLevels.outOfStock++;
      } else if (quantity <= minQty) {
        status = 'lowStock';
        stockLevels.lowStock++;
      } else {
        stockLevels.normal++;
      }

      return {
        name: product.name,
        sku: product.sku,
        category: product.category || 'غير مصنف',
        quantity,
        minQuantity: minQty,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        value,
        status,
        supplier: product.supplier?.name || 'لا يوجد',
      };
    });

    return {
      summary: {
        totalProducts: products.length,
        totalItems,
        totalValue: totalValue.toFixed(2),
        stockLevels,
      },
      items: inventoryData,
    };
  }

  /**
   * Get customer report
   */
  async getCustomerReport(tenantId, { startDate, endDate, minPurchases = 0 }) {
    const start = startDate ? new Date(startDate) : subMonths(new Date(), 6);
    const end = endDate ? new Date(endDate) : new Date();

    const customers = await Customer.find({ tenantId, isActive: true });

    const customerStats = [];

    for (const customer of customers) {
      const invoices = await Invoice.find({
        tenantId,
        customer: customer._id,
        createdAt: { $gte: start, $lte: end },
        status: { $ne: 'cancelled' },
      });

      if (invoices.length < minPurchases) continue;

      const totalPurchases = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const totalRemaining = invoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);

      customerStats.push({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        totalInvoices: invoices.length,
        totalPurchases: totalPurchases.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        totalRemaining: totalRemaining.toFixed(2),
        paymentRate: totalPurchases > 0 ? ((totalPaid / totalPurchases) * 100).toFixed(2) : 100,
        averageInvoice: invoices.length > 0 ? (totalPurchases / invoices.length).toFixed(2) : 0,
        lastPurchase: invoices.length > 0 ? invoices[invoices.length - 1].createdAt : null,
      });
    }

    // Sort by total purchases
    customerStats.sort((a, b) => parseFloat(b.totalPurchases) - parseFloat(a.totalPurchases));

    const totalRevenue = customerStats.reduce((sum, c) => sum + parseFloat(c.totalPurchases), 0);
    const totalOutstanding = customerStats.reduce((sum, c) => sum + parseFloat(c.totalRemaining), 0);

    return {
      summary: {
        totalCustomers: customerStats.length,
        totalRevenue: totalRevenue.toFixed(2),
        totalOutstanding: totalOutstanding.toFixed(2),
        averageCustomerValue: customerStats.length > 0 ? (totalRevenue / customerStats.length).toFixed(2) : 0,
      },
      customers: customerStats,
      dateRange: { start, end },
    };
  }

  /**
   * Get product performance report
   */
  async getProductPerformanceReport(tenantId, { startDate, endDate, limit = 50 }) {
    const start = startDate ? new Date(startDate) : subMonths(new Date(), 3);
    const end = endDate ? new Date(endDate) : new Date();

    const invoices = await Invoice.find({
      tenantId,
      createdAt: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' },
    }).populate('items.product', 'name sku category');

    const productStats = {};

    invoices.forEach(invoice => {
      invoice.items?.forEach(item => {
        const product = item.product;
        if (!product) return;

        const productKey = product._id.toString();
        if (!productStats[productKey]) {
          productStats[productKey] = {
            name: product.name,
            sku: product.sku,
            category: product.category || 'غير مصنف',
            quantitySold: 0,
            revenue: 0,
            profit: 0,
            invoiceCount: 0,
          };
        }

        productStats[productKey].quantitySold += item.quantity;
        productStats[productKey].revenue += item.sellingPrice * item.quantity;
        productStats[productKey].profit += (item.sellingPrice - item.purchasePrice) * item.quantity;
        productStats[productKey].invoiceCount++;
      });
    });

    // Convert to array and calculate metrics
    const performanceArray = Object.values(productStats).map(p => ({
      ...p,
      averagePrice: p.quantitySold > 0 ? (p.revenue / p.quantitySold).toFixed(2) : 0,
      profitMargin: p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(2) : 0,
    }));

    // Get top performers by different metrics
    const topByRevenue = [...performanceArray].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
    const topByQuantity = [...performanceArray].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, limit);
    const topByProfit = [...performanceArray].sort((a, b) => b.profit - a.profit).slice(0, limit);

    return {
      summary: {
        totalProductsSold: performanceArray.length,
        totalRevenue: performanceArray.reduce((sum, p) => sum + p.revenue, 0).toFixed(2),
        totalProfit: performanceArray.reduce((sum, p) => sum + p.profit, 0).toFixed(2),
        totalQuantitySold: performanceArray.reduce((sum, p) => sum + p.quantitySold, 0),
      },
      topByRevenue,
      topByQuantity,
      topByProfit,
      dateRange: { start, end },
    };
  }

  // ============= Helper Methods =============

  _groupInvoicesByPeriod(invoices, groupBy) {
    const grouped = {};

    invoices.forEach(invoice => {
      let key;
      const date = new Date(invoice.createdAt);

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (groupBy === 'week') {
        const weekStart = startOfDay(subDays(date, date.getDay()));
        key = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = date.getFullYear().toString();
      }

      if (!grouped[key]) {
        grouped[key] = { period: key, count: 0, revenue: 0, paid: 0, profit: 0 };
      }

      grouped[key].count++;
      grouped[key].revenue += invoice.totalAmount || 0;
      grouped[key].paid += invoice.paidAmount || 0;
      grouped[key].profit += invoice.profit || 0;
    });

    return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
  }

  _calculateCustomerStats(invoices) {
    const customerMap = {};

    invoices.forEach(invoice => {
      if (!invoice.customer) return;

      const customerId = invoice.customer._id.toString();
      if (!customerMap[customerId]) {
        customerMap[customerId] = {
          name: invoice.customer.name,
          phone: invoice.customer.phone,
          count: 0,
          revenue: 0,
          paid: 0,
        };
      }

      customerMap[customerId].count++;
      customerMap[customerId].revenue += invoice.totalAmount || 0;
      customerMap[customerId].paid += invoice.paidAmount || 0;
    });

    return Object.values(customerMap)
      .sort((a, b) => b.revenue - a.revenue)
      .map(c => ({
        ...c,
        revenue: c.revenue.toFixed(2),
        paid: c.paid.toFixed(2),
        averageInvoice: c.count > 0 ? (c.revenue / c.count).toFixed(2) : 0,
      }));
  }

  async _getPaymentMethodsBreakdown(tenantId, start, end) {
    // Get invoices in the date range
    const invoices = await Invoice.find({
      tenantId,
      createdAt: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' },
    });

    const methodStats = {};

    // Extract payments from all invoices and aggregate by payment method
    invoices.forEach(invoice => {
      if (invoice.payments && invoice.payments.length > 0) {
        invoice.payments.forEach(payment => {
          const method = payment.method || 'نقدي';
          if (!methodStats[method]) {
            methodStats[method] = { count: 0, total: 0 };
          }
          methodStats[method].count++;
          methodStats[method].total += payment.amount || 0;
        });
      }
    });

    return Object.entries(methodStats).map(([method, data]) => ({
      method,
      count: data.count,
      total: data.total.toFixed(2),
    }));
  }
}

module.exports = new ReportsService();