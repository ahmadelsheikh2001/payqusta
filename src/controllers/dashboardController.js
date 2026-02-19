/**
 * Dashboard Controller — Analytics & Insights
 * Provides comprehensive business analytics
 */

const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');
const ApiResponse = require('../utils/ApiResponse');
const catchAsync = require('../utils/catchAsync');

class DashboardController {
  /**
   * GET /api/v1/dashboard/overview
   */
  getOverview = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const branchId = req.query.branch ? new mongoose.Types.ObjectId(req.query.branch) : null;

    // Build filters
    const invoiceFilter = { tenant: tenantId };
    const productFilter = { tenant: tenantId, isActive: true }; // Product filtering is handled by getStockSummary or manually
    const customerFilter = { tenant: tenantId, isActive: true };
    
    if (branchId) {
      invoiceFilter.branch = branchId;
      // customerFilter.branch = branchId; // Optional: Only if you strictly want customers registered at this branch
    }

    const [salesSummary, stockSummary, customerCount, supplierCount, recentInvoices, topProducts] =
      await Promise.all([
        Invoice.getSalesSummary(req.tenantId, 30, branchId),
        Product.getStockSummary(req.tenantId, branchId),
        Customer.countDocuments(customerFilter),
        Supplier.countDocuments({ tenant: tenantId, isActive: true }),
        Invoice.find(invoiceFilter)
           .sort('-createdAt')
           .limit(10)
           .populate('customer', 'name phone')
           .select('invoiceNumber customer totalAmount paidAmount remainingAmount status createdAt')
           .lean(),
        // Top products by sales
        Invoice.aggregate([
          { $match: { ...invoiceFilter, status: { $ne: 'cancelled' } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.product',
              productName: { $first: '$items.productName' },
              totalSold: { $sum: '$items.quantity' },
              totalRevenue: { $sum: '$items.totalPrice' },
            },
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 5 },
        ]),
      ]);

    // Monthly sales trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlySales = await Invoice.aggregate([
      {
        $match: {
          ...invoiceFilter,
          createdAt: { $gte: sixMonthsAgo },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          sales: { $sum: '$totalAmount' },
          count: { $sum: 1 },
          collected: { $sum: '$paidAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Outstanding installments
    const upcomingInstallments = await Invoice.getUpcomingInstallments(req.tenantId, 7, branchId);
    const overdueCount = upcomingInstallments.reduce(
      (acc, inv) => acc + inv.installments.filter((i) => i.status === 'overdue').length,
      0
    );

    ApiResponse.success(res, {
      sales: salesSummary,
      stock: stockSummary,
      customers: {
        total: customerCount,
      },
      suppliers: {
        total: supplierCount,
      },
      installments: {
        upcomingCount: upcomingInstallments.length,
        overdueCount,
      },
      monthlySales,
      topProducts,
      recentInvoices,
    });
  });

  /**
   * GET /api/v1/dashboard/sales-report
   */
  getSalesReport = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const branchId = req.query.branch ? new mongoose.Types.ObjectId(req.query.branch) : null;
    const { from, to, groupBy = 'day' } = req.query;

    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const dateFormat = {
      day: '%Y-%m-%d',
      week: '%Y-W%V',
      month: '%Y-%m',
    };

    const matchStage = {
      tenant: tenantId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' },
    };
    if (branchId) matchStage.branch = branchId;

    const report = await Invoice.aggregate([
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat[groupBy] || dateFormat.day, date: '$createdAt' } },
          totalSales: { $sum: '$totalAmount' },
          totalCollected: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$remainingAmount' },
          invoiceCount: { $sum: 1 },
          cashSales: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$totalAmount', 0] },
          },
          installmentSales: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'installment'] }, '$totalAmount', 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Category breakdown
    const categoryBreakdown = await Invoice.aggregate([
      {
        $match: matchStage,
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: '$productInfo.category',
          totalSales: { $sum: '$items.totalPrice' },
          totalQuantity: { $sum: '$items.quantity' },
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    ApiResponse.success(res, { report, categoryBreakdown });
  });

  /**
   * GET /api/v1/dashboard/profit-intelligence
   * Profit Intelligence — most profitable products and customers
   */
  getProfitIntelligence = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const branchId = req.query.branch ? new mongoose.Types.ObjectId(req.query.branch) : null;
    
    const matchStage = { tenant: tenantId, status: { $ne: 'cancelled' } };
    if (branchId) matchStage.branch = branchId;

    // Most profitable products
    const profitableProducts = await Invoice.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod',
        },
      },
      { $unwind: '$prod' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$prod.name' },
          category: { $first: '$prod.category' },
          totalRevenue: { $sum: '$items.totalPrice' },
          totalCost: { $sum: { $multiply: ['$prod.cost', '$items.quantity'] } },
          totalSold: { $sum: '$items.quantity' },
        },
      },
      { $addFields: { profit: { $subtract: ['$totalRevenue', '$totalCost'] }, margin: { $multiply: [{ $divide: [{ $subtract: ['$totalRevenue', '$totalCost'] }, { $max: ['$totalRevenue', 1] }] }, 100] } } },
      { $sort: { profit: -1 } },
      { $limit: 10 },
    ]);

    // Most profitable customers
    const profitableCustomers = await Invoice.aggregate([
      { $match: matchStage },
      {
        $lookup: { from: 'customers', localField: 'customer', foreignField: '_id', as: 'cust' },
      },
      { $unwind: '$cust' },
      {
        $group: {
          _id: '$customer',
          name: { $first: '$cust.name' },
          phone: { $first: '$cust.phone' },
          tier: { $first: '$cust.tier' },
          totalSpent: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
    ]);

    // Revenue by payment method
    const revenueByMethod = await Invoice.aggregate([
      { $match: matchStage },
      { $group: { _id: '$paymentMethod', total: { $sum: '$totalAmount' }, count: { $sum: 1 }, collected: { $sum: '$paidAmount' } } },
    ]);

    ApiResponse.success(res, { profitableProducts, profitableCustomers, revenueByMethod });
  });

  /**
   * GET /api/v1/dashboard/risk-scoring
   * Customer Risk Scoring — payment behavior analysis
   */
  getRiskScoring = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);

    const customers = await Customer.find({ tenant: tenantId, isActive: true }).lean();

    const riskData = await Promise.all(
      customers.map(async (c) => {
        const invoices = await Invoice.find({ customer: c._id, tenant: tenantId }).lean();
        const totalInvoices = invoices.length;
        const overdueInvoices = invoices.filter((i) => i.status === 'overdue').length;
        const latePayments = invoices.filter((i) => {
          if (!i.installments?.length) return false;
          return i.installments.some((inst) => inst.status === 'overdue' || (inst.paidDate && inst.dueDate && new Date(inst.paidDate) > new Date(inst.dueDate)));
        }).length;

        const outstandingBalance = c.financials?.outstandingBalance || 0;
        const totalPurchases = c.financials?.totalPurchases || 0;
        const paymentRatio = totalPurchases > 0 ? ((c.financials?.totalPaid || 0) / totalPurchases) * 100 : 100;

        // Risk score: 0 = no risk, 100 = highest risk
        let riskScore = 0;
        if (overdueInvoices > 0) riskScore += Math.min(overdueInvoices * 15, 40);
        if (latePayments > 0) riskScore += Math.min(latePayments * 10, 25);
        if (paymentRatio < 50) riskScore += 20;
        else if (paymentRatio < 70) riskScore += 10;
        if (outstandingBalance > 50000) riskScore += 15;
        else if (outstandingBalance > 20000) riskScore += 8;

        riskScore = Math.min(riskScore, 100);

        let riskLevel = 'low';
        if (riskScore >= 60) riskLevel = 'high';
        else if (riskScore >= 30) riskLevel = 'medium';

        return {
          _id: c._id, name: c.name, phone: c.phone, tier: c.tier,
          totalInvoices, overdueInvoices, latePayments,
          outstandingBalance, totalPurchases, paymentRatio: Math.round(paymentRatio),
          riskScore, riskLevel,
        };
      })
    );

    riskData.sort((a, b) => b.riskScore - a.riskScore);

    const summary = {
      high: riskData.filter((r) => r.riskLevel === 'high').length,
      medium: riskData.filter((r) => r.riskLevel === 'medium').length,
      low: riskData.filter((r) => r.riskLevel === 'low').length,
      totalOutstanding: riskData.reduce((s, r) => s + r.outstandingBalance, 0),
    };

    ApiResponse.success(res, { customers: riskData, summary });
  });

  /**
   * GET /api/v1/dashboard/daily-collections
   * Today's collection schedule
   */
  getDailyCollections = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const branchId = req.query.branch ? new mongoose.Types.ObjectId(req.query.branch) : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const filter = { tenant: tenantId };
    if (branchId) filter.branch = branchId;

    // Installments due today
    const todayCollections = await Invoice.find({
      ...filter,
      'installments.dueDate': { $gte: today, $lt: tomorrow },
      'installments.status': { $in: ['pending', 'partially_paid'] },
    }).populate('customer', 'name phone tier').lean();

    // Overdue installments
    const overdueCollections = await Invoice.find({
      ...filter,
      'installments.dueDate': { $lt: today },
      'installments.status': { $in: ['pending', 'partially_paid', 'overdue'] },
    }).populate('customer', 'name phone tier').lean();

    // Upcoming this week
    const weekCollections = await Invoice.find({
      ...filter,
      'installments.dueDate': { $gte: tomorrow, $lt: nextWeek },
      'installments.status': { $in: ['pending', 'partially_paid'] },
    }).populate('customer', 'name phone tier').lean();

    // Flatten installments
    const flatten = (invoices, filterFn) => {
      const result = [];
      invoices.forEach((inv) => {
        (inv.installments || []).filter(filterFn).forEach((inst) => {
          result.push({
            invoiceId: inv._id, invoiceNumber: inv.invoiceNumber,
            customer: inv.customer,
            installmentNumber: inst.installmentNumber,
            amount: inst.amount, paidAmount: inst.paidAmount,
            remaining: inst.amount - (inst.paidAmount || 0),
            dueDate: inst.dueDate, status: inst.status,
          });
        });
      });
      return result.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    };

    const todayItems = flatten(todayCollections, (i) => {
      const d = new Date(i.dueDate);
      return d >= today && d < tomorrow && ['pending', 'partially_paid'].includes(i.status);
    });

    const overdueItems = flatten(overdueCollections, (i) => {
      return new Date(i.dueDate) < today && ['pending', 'partially_paid', 'overdue'].includes(i.status);
    });

    const weekItems = flatten(weekCollections, (i) => {
      const d = new Date(i.dueDate);
      return d >= tomorrow && d < nextWeek && ['pending', 'partially_paid'].includes(i.status);
    });

    const todayTotal = todayItems.reduce((s, i) => s + i.remaining, 0);
    const overdueTotal = overdueItems.reduce((s, i) => s + i.remaining, 0);
    const weekTotal = weekItems.reduce((s, i) => s + i.remaining, 0);

    ApiResponse.success(res, {
      today: { items: todayItems, total: todayTotal },
      overdue: { items: overdueItems, total: overdueTotal },
      week: { items: weekItems, total: weekTotal },
    });
  });

  /**
   * GET /api/v1/dashboard/aging-report
   * Debt Aging Report — 30/60/90 days breakdown
   */
  getAgingReport = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const branchId = req.query.branch ? new mongoose.Types.ObjectId(req.query.branch) : null;
    const today = new Date();

    // We still fetch all active customers (or could optimize to only those with invoices in branch)
    const customers = await Customer.find({ tenant: tenantId, isActive: true, 'financials.outstandingBalance': { $gt: 0 } }).lean();

    const invoiceFilter = { tenant: tenantId, remainingAmount: { $gt: 0 }, status: { $nin: ['paid', 'cancelled'] } };
    if (branchId) invoiceFilter.branch = branchId;

    const agingData = await Promise.all(
      customers.map(async (c) => {
        const invoices = await Invoice.find({
          ...invoiceFilter,
          customer: c._id,
        }).lean();

        if (invoices.length === 0) return null; // No debt in this branch

        let current = 0, days30 = 0, days60 = 0, days90 = 0, over90 = 0;

        invoices.forEach((inv) => {
          const daysDue = Math.floor((today - new Date(inv.createdAt)) / (1000 * 60 * 60 * 24));
          const amt = inv.remainingAmount || 0;
          if (daysDue <= 30) current += amt;
          else if (daysDue <= 60) days30 += amt;
          else if (daysDue <= 90) days60 += amt;
          else if (daysDue <= 120) days90 += amt;
          else over90 += amt;
        });

        const total = current + days30 + days60 + days90 + over90;
        let status = 'regular'; // منتظم
        if (over90 > 0 || days90 > 0) status = 'critical'; // خطر
        else if (days60 > 0) status = 'warning'; // متأخر
        else if (days30 > 0) status = 'delayed'; // متأخر قليلاً

        return {
          _id: c._id, name: c.name, phone: c.phone, tier: c.tier,
          current, days30, days60, days90, over90, total, status,
          invoiceCount: invoices.length,
        };
      })
    );

    // Filter nulls (customers with no debt in this branch)
    const filtered = agingData.filter((d) => d && d.total > 0);
    filtered.sort((a, b) => b.total - a.total);

    const summary = {
      current: filtered.reduce((s, d) => s + d.current, 0),
      days30: filtered.reduce((s, d) => s + d.days30, 0),
      days60: filtered.reduce((s, d) => s + d.days60, 0),
      days90: filtered.reduce((s, d) => s + d.days90, 0),
      over90: filtered.reduce((s, d) => s + d.over90, 0),
      total: filtered.reduce((s, d) => s + d.total, 0),
      customerCount: filtered.length,
      critical: filtered.filter((d) => d.status === 'critical').length,
      warning: filtered.filter((d) => d.status === 'warning').length,
    };

    ApiResponse.success(res, { customers: filtered, summary });
  });

  /**
   * GET /api/v1/dashboard/business-health
   * Business Health Score — overall business health metric
   */
  getBusinessHealth = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const branchId = req.query.branch ? new mongoose.Types.ObjectId(req.query.branch) : null;
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const filter = { tenant: tenantId };
    if (branchId) filter.branch = branchId;
    
    const expenseFilter = { tenant: tenantId, isActive: true, date: { $gte: thirtyDaysAgo } };
    // Note: Expense model doesn't have branch yet, so we return all expenses or 0
    // For accuracy in branch view, we might want to exclude expenses or distribute them
    // For now, we keep expenses global to avoid showing 100% profit

    // Get data for calculations
    const [salesLast30, salesPrev30, totalOutstanding, totalOverdue, stockSummary, expensesLast30, customerCount] = await Promise.all([
      Invoice.aggregate([
        { $match: { ...filter, createdAt: { $gte: thirtyDaysAgo }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, collected: { $sum: '$paidAmount' } } },
      ]),
      Invoice.aggregate([
        { $match: { ...filter, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      // Customer outstanding is global, but we can try to sum from invoices if needed. 
      // For simpler logic, we use global customer outstanding
      Customer.aggregate([
        { $match: { tenant: tenantId, isActive: true } },
        { $group: { _id: null, total: { $sum: '$financials.outstandingBalance' } } },
      ]),
      Invoice.countDocuments({ ...filter, status: 'overdue' }),
      Product.getStockSummary(req.tenantId, branchId),
      Expense.aggregate([
        { $match: expenseFilter },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Customer.countDocuments({ tenant: tenantId, isActive: true }),
    ]);

    const sales30 = salesLast30[0]?.total || 0;
    const salesPrev = salesPrev30[0]?.total || 1;
    const collected30 = salesLast30[0]?.collected || 0;
    const outstanding = totalOutstanding[0]?.total || 0;
    const expenses30 = expensesLast30[0]?.total || 0;

    // Calculate metrics
    const salesGrowth = ((sales30 - salesPrev) / salesPrev) * 100;
    const collectionRate = sales30 > 0 ? (collected30 / sales30) * 100 : 100;
    const stockHealth = stockSummary ? ((stockSummary.inStock || 0) / Math.max((stockSummary.inStock || 0) + (stockSummary.lowStock || 0) + (stockSummary.outOfStock || 0), 1)) * 100 : 100;
    const debtRatio = sales30 > 0 ? (outstanding / sales30) * 100 : 0;
    const netProfit = sales30 - expenses30;
    const profitMargin = sales30 > 0 ? (netProfit / sales30) * 100 : 0;

    // Calculate health score (0-100)
    let healthScore = 50; // Base score
    if (salesGrowth > 10) healthScore += 15;
    else if (salesGrowth > 0) healthScore += 10;
    else if (salesGrowth > -10) healthScore += 5;
    else healthScore -= 10;

    if (collectionRate > 80) healthScore += 15;
    else if (collectionRate > 60) healthScore += 10;
    else if (collectionRate > 40) healthScore += 5;
    else healthScore -= 10;

    if (stockHealth > 80) healthScore += 10;
    else if (stockHealth > 50) healthScore += 5;
    else healthScore -= 5;

    if (totalOverdue === 0) healthScore += 10;
    else if (totalOverdue < 5) healthScore += 5;
    else healthScore -= 10;

    healthScore = Math.max(0, Math.min(100, healthScore));

    let healthStatus = 'excellent'; // ممتاز
    if (healthScore < 40) healthStatus = 'critical'; // خطر
    else if (healthScore < 60) healthStatus = 'warning'; // يحتاج تحسين
    else if (healthScore < 80) healthStatus = 'good'; // جيد

    ApiResponse.success(res, {
      score: Math.round(healthScore),
      status: healthStatus,
      metrics: {
        salesGrowth: Math.round(salesGrowth),
        collectionRate: Math.round(collectionRate),
        stockHealth: Math.round(stockHealth),
        debtRatio: Math.round(debtRatio),
        profitMargin: Math.round(profitMargin),
        overdueInvoices: totalOverdue,
      },
      financials: {
        salesLast30Days: sales30,
        collectedLast30Days: collected30,
        expensesLast30Days: expenses30,
        netProfit,
        totalOutstanding: outstanding,
      },
      counts: {
        customers: customerCount,
        productsInStock: stockSummary?.inStock || 0,
        lowStockProducts: stockSummary?.lowStock || 0,
      },
    });
  });

  /**
   * GET /api/v1/dashboard/cash-flow-forecast
   * Cash Flow Forecast — predict next 30 days cash flow
   */
  getCashFlowForecast = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const branchId = req.query.branch ? new mongoose.Types.ObjectId(req.query.branch) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get expected income from installments (next 30 days)
    const next30Days = new Date(today);
    next30Days.setDate(next30Days.getDate() + 30);

    const invoiceFilter = {
      tenant: tenantId,
      'installments.dueDate': { $gte: today, $lte: next30Days },
      'installments.status': { $in: ['pending', 'partially_paid'] },
    };
    if (branchId) invoiceFilter.branch = branchId;

    const upcomingInstallments = await Invoice.find(invoiceFilter).lean();

    // Get expected recurring expenses (Global)
    const recurringExpenses = await Expense.find({
      tenant: tenantId, isActive: true, isRecurring: true,
    }).lean();

    // Calculate daily forecast
    const forecast = [];
    let runningBalance = 0;

    // Get current balance (collected - expenses this month)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [collectedThisMonth, expensesThisMonth] = await Promise.all([
      Invoice.aggregate([
        { $match: { tenant: tenantId, ...(branchId && { branch: branchId }), 'payments.date': { $gte: monthStart } } },
        { $unwind: '$payments' },
        { $match: { 'payments.date': { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$payments.amount' } } },
      ]),
      Expense.aggregate([
        { $match: { tenant: tenantId, isActive: true, date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const initialCollection = collectedThisMonth[0]?.total || 0;
    const initialExpenses = expensesThisMonth[0]?.total || 0;
    
    // If branch filtering is on, initial expenses is technically unknown for that branch, 
    // but we subtract global expenses? Or 0?
    // Let's subtract 0 if branch filtering is ON to avoid confusion, or assume expenses are for all branches
    
    runningBalance = initialCollection - initialExpenses;

    // Build 30-day forecast
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      let expectedIncome = 0;
      let expectedExpense = 0;

      // Sum installments due this day
      upcomingInstallments.forEach((inv) => {
        (inv.installments || []).forEach((inst) => {
          const dueDate = new Date(inst.dueDate);
          if (dueDate.toISOString().split('T')[0] === dateStr && ['pending', 'partially_paid'].includes(inst.status)) {
            expectedIncome += (inst.amount - (inst.paidAmount || 0));
          }
        });
      });

      // Add recurring expenses (monthly ones on day 1, etc.)
      // Only if NO branch filter, or if we decide expenses are shared
      // For now, if branch filter is applied, we SKIP expense forecast to show only INCOME forecast?
      // Let's include them for SAFETY (better to over-estimate cost than under-estimate)
      recurringExpenses.forEach((exp) => {
        if (exp.frequency === 'daily') expectedExpense += exp.amount;
        else if (exp.frequency === 'weekly' && date.getDay() === new Date(exp.date).getDay()) expectedExpense += exp.amount;
        else if (exp.frequency === 'monthly' && date.getDate() === new Date(exp.date).getDate()) expectedExpense += exp.amount;
      });

      runningBalance += expectedIncome - expectedExpense;

      forecast.push({
        date: dateStr,
        expectedIncome,
        expectedExpense,
        balance: runningBalance,
      });
    }

    // Calculate totals
    const totalExpectedIncome = forecast.reduce((s, f) => s + f.expectedIncome, 0);
    const totalExpectedExpense = forecast.reduce((s, f) => s + f.expectedExpense, 0);
    const lowestBalance = Math.min(...forecast.map((f) => f.balance));
    const hasLiquidityRisk = lowestBalance < 0;

    // Weekly breakdown
    const weekly = [];
    for (let w = 0; w < 4; w++) {
      const weekData = forecast.slice(w * 7, (w + 1) * 7);
      weekly.push({
        week: w + 1,
        income: weekData.reduce((s, d) => s + d.expectedIncome, 0),
        expense: weekData.reduce((s, d) => s + d.expectedExpense, 0),
        endBalance: weekData[weekData.length - 1]?.balance || 0,
      });
    }

    ApiResponse.success(res, {
      forecast,
      weekly,
      summary: {
        currentBalance: runningBalance, // Approximate
        totalExpectedIncome,
        totalExpectedExpense,
        projectedBalance: runningBalance,
        lowestBalance,
        hasLiquidityRisk,
      },
    });
  });

  /**
   * GET /api/v1/dashboard/smart-assistant
   * Smart Assistant — AI-like suggestions and alerts
   */
  getSmartAssistant = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const branchId = req.query.branch ? new mongoose.Types.ObjectId(req.query.branch) : null;
    const today = new Date();
    const suggestions = [];

    const filter = { tenant: tenantId };
    if (branchId) filter.branch = branchId;

    // 1. Overdue installments
    const overdueCount = await Invoice.countDocuments({
      ...filter,
      'installments.status': 'overdue',
    });
    if (overdueCount > 0) {
      suggestions.push({
        type: 'urgent',
        icon: '🔴',
        title: 'أقساط متأخرة',
        message: `لديك ${overdueCount} عميل لديه أقساط متأخرة — تواصل معهم اليوم`,
        action: 'collections',
      });
    }

    // 2. Today's collections
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    const todayDue = await Invoice.find({
      ...filter,
      'installments.dueDate': { $gte: todayStart, $lte: todayEnd },
      'installments.status': 'pending',
    });
    if (todayDue.length > 0) {
      suggestions.push({
        type: 'reminder',
        icon: '📅',
        title: 'تحصيل اليوم',
        message: `${todayDue.length} أقساط مستحقة اليوم — ابدأ التحصيل الآن`,
        action: 'collections',
      });
    }

    // 3. Low stock products (TODO: make branch specific once Product model supports it in countDocuments)
    // For now, if branch is selected, we can skip or use global.
    // Let's rely on global stock for now as Product model updates for low stock query are complex
    const lowStockProducts = await Product.countDocuments({
      tenant: tenantId,
      stockStatus: 'low_stock',
      isActive: true,
    });
    if (lowStockProducts > 0) {
      suggestions.push({
        type: 'warning',
        icon: '📦',
        title: 'مخزون منخفض',
        message: `${lowStockProducts} منتج يحتاج إعادة تخزين — تواصل مع الموردين`,
        action: 'products',
      });
    }

    // 4. Out of stock
    const outOfStock = await Product.countDocuments({
      tenant: tenantId,
      stockStatus: 'out_of_stock',
      isActive: true,
    });
    if (outOfStock > 0) {
      suggestions.push({
        type: 'urgent',
        icon: '❌',
        title: 'نفاد مخزون',
        message: `${outOfStock} منتج نفذ من المخزون — اطلب فوراً`,
        action: 'products',
      });
    }

    // 5. Supplier payments due (Global)
    const supplierPaymentsDue = await Supplier.find({
      tenant: tenantId,
      'payments.dueDate': { $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      'payments.status': 'pending',
    });
    if (supplierPaymentsDue.length > 0) {
      suggestions.push({
        type: 'reminder',
        icon: '🚛',
        title: 'مدفوعات موردين',
        message: `${supplierPaymentsDue.length} مورد لديه دفعات مستحقة قريباً`,
        action: 'suppliers',
      });
    }

    // 6. High-risk customers (Global)
    const highRiskCustomers = await Customer.countDocuments({
      tenant: tenantId,
      isActive: true,
      'financials.outstandingBalance': { $gt: 10000 },
    });
    if (highRiskCustomers > 0) {
      suggestions.push({
        type: 'insight',
        icon: '⚠️',
        title: 'عملاء بمخاطر عالية',
        message: `${highRiskCustomers} عميل لديه رصيد مستحق عالي — راجع تقرير المخاطر`,
        action: 'risk',
      });
    }

    // 7. Sales insight (Branch Specific)
    const lastWeekSales = await Invoice.aggregate([
      { $match: { ...filter, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]);
    if (lastWeekSales[0]) {
      const avg = lastWeekSales[0].total / 7;
      suggestions.push({
        type: 'insight',
        icon: '📊',
        title: 'متوسط المبيعات',
        message: `متوسط مبيعاتك ${Math.round(avg).toLocaleString('ar-EG')} ج.م/يوم — ${lastWeekSales[0].count} فاتورة هذا الأسبوع`,
        action: 'dashboard',
      });
    }

    // 8. Top customer to follow up
    const topCustomer = await Customer.findOne({
      tenant: tenantId,
      isActive: true,
    }).sort('-financials.totalPurchases');
    if (topCustomer) {
      suggestions.push({
        type: 'opportunity',
        icon: '⭐',
        title: 'عميل مميز',
        message: `${topCustomer.name} أفضل عميل لديك — حافظ على علاقة جيدة معه`,
        action: 'customers',
      });
    }

    ApiResponse.success(res, {
      suggestions: suggestions.slice(0, 8), // Max 8 suggestions
      generatedAt: new Date(),
    });
  });

  /**
   * GET /api/v1/dashboard/real-profit
   * Real Profit — net profit after all expenses
   */
  getRealProfit = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const { from, to } = req.query;
    const startDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = to ? new Date(to) : new Date();

    // Get sales revenue and cost
    const salesData = await Invoice.aggregate([
      { $match: { tenant: tenantId, createdAt: { $gte: startDate, $lte: endDate }, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
      { $unwind: '$prod' },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$items.totalPrice' },
          totalCost: { $sum: { $multiply: ['$prod.cost', '$items.quantity'] } },
          totalCollected: { $sum: '$paidAmount' },
          invoiceCount: { $addToSet: '$_id' },
        },
      },
    ]);

    // Get expenses
    const expenseData = await Expense.aggregate([
      { $match: { tenant: tenantId, isActive: true, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const revenue = salesData[0]?.totalRevenue || 0;
    const costOfGoods = salesData[0]?.totalCost || 0;
    const collected = salesData[0]?.totalCollected || 0;
    const invoices = salesData[0]?.invoiceCount?.length || 0;
    const totalExpenses = expenseData.reduce((s, e) => s + e.total, 0);

    const grossProfit = revenue - costOfGoods;
    const netProfit = grossProfit - totalExpenses;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    // Outstanding debt
    const outstandingDebt = await Customer.aggregate([
      { $match: { tenant: tenantId, isActive: true } },
      { $group: { _id: null, total: { $sum: '$financials.outstandingBalance' } } },
    ]);

    ApiResponse.success(res, {
      period: { from: startDate, to: endDate },
      revenue: {
        total: revenue,
        collected,
        outstanding: revenue - collected,
        invoiceCount: invoices,
      },
      costs: {
        costOfGoods,
        operatingExpenses: totalExpenses,
        expenseBreakdown: expenseData.map((e) => ({ category: e._id, amount: e.total, count: e.count })),
      },
      profit: {
        gross: grossProfit,
        net: netProfit,
        grossMargin: Math.round(grossMargin * 10) / 10,
        netMargin: Math.round(netMargin * 10) / 10,
      },
      outstandingDebt: outstandingDebt[0]?.total || 0,
      summary: `صافي الربح الفعلي: ${Math.round(netProfit).toLocaleString('ar-EG')} ج.م (${Math.round(netMargin)}% هامش)`,
    });
  });

  /**
   * GET /api/v1/dashboard/credit-engine
   * Credit Engine — calculate safe credit limit for customers
   */
  getCreditEngine = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);

    const customers = await Customer.find({ tenant: tenantId, isActive: true }).lean();

    const creditData = await Promise.all(
      customers.map(async (c) => {
        const invoices = await Invoice.find({ customer: c._id, tenant: tenantId }).lean();
        const totalInvoices = invoices.length;
        const paidOnTime = invoices.filter((i) => i.status === 'paid').length;
        const overdueHistory = invoices.filter((i) => i.status === 'overdue' || i.installments?.some((inst) => inst.status === 'overdue')).length;

        const avgPurchase = totalInvoices > 0 ? invoices.reduce((s, i) => s + i.totalAmount, 0) / totalInvoices : 0;
        const paymentScore = totalInvoices > 0 ? (paidOnTime / totalInvoices) * 100 : 50;

        // Calculate recommended credit limit
        let baseLimit = avgPurchase * 2;
        if (c.tier === 'vip') baseLimit *= 2;
        else if (c.tier === 'premium') baseLimit *= 1.5;

        if (paymentScore >= 90) baseLimit *= 1.3;
        else if (paymentScore >= 70) baseLimit *= 1.1;
        else if (paymentScore < 50) baseLimit *= 0.5;

        if (overdueHistory > 2) baseLimit *= 0.6;
        else if (overdueHistory > 0) baseLimit *= 0.8;

        const recommendedLimit = Math.round(Math.max(baseLimit, 1000));
        const currentOutstanding = c.financials?.outstandingBalance || 0;
        const availableCredit = Math.max(0, recommendedLimit - currentOutstanding);

        // Risk assessment for new sale
        let canSellOnCredit = true;
        let maxInstallments = 12;
        let riskNote = '';

        if (currentOutstanding > recommendedLimit) {
          canSellOnCredit = false;
          riskNote = 'العميل تجاوز حد الائتمان';
        } else if (overdueHistory > 2) {
          canSellOnCredit = false;
          riskNote = 'العميل لديه تاريخ تأخير كبير';
        } else if (paymentScore < 50) {
          maxInstallments = 3;
          riskNote = 'يُنصح بأقساط قليلة';
        } else if (paymentScore < 70) {
          maxInstallments = 6;
          riskNote = 'مخاطر متوسطة';
        }

        return {
          _id: c._id,
          name: c.name,
          phone: c.phone,
          tier: c.tier,
          totalInvoices,
          paymentScore: Math.round(paymentScore),
          overdueHistory,
          currentOutstanding,
          recommendedLimit,
          availableCredit,
          canSellOnCredit,
          maxInstallments,
          riskNote,
        };
      })
    );

    creditData.sort((a, b) => b.recommendedLimit - a.recommendedLimit);

    const summary = {
      totalCustomers: creditData.length,
      canSellOnCredit: creditData.filter((c) => c.canSellOnCredit).length,
      blocked: creditData.filter((c) => !c.canSellOnCredit).length,
      totalCreditLimit: creditData.reduce((s, c) => s + c.recommendedLimit, 0),
      totalAvailable: creditData.reduce((s, c) => s + c.availableCredit, 0),
    };

    ApiResponse.success(res, { customers: creditData, summary });
  });

  /**
   * GET /api/v1/dashboard/customer-lifetime-value
   * Customer Lifetime Value — CLV analysis
   */
  getCustomerLifetimeValue = catchAsync(async (req, res, next) => {
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);

    const customers = await Customer.find({ tenant: tenantId, isActive: true }).lean();

    const clvData = await Promise.all(
      customers.map(async (c) => {
        const invoices = await Invoice.find({ customer: c._id, tenant: tenantId, status: { $ne: 'cancelled' } })
          .sort('createdAt').lean();

        if (invoices.length === 0) {
          return { _id: c._id, name: c.name, phone: c.phone, tier: c.tier, clv: 0, avgOrderValue: 0, frequency: 0, lifespan: 0, invoiceCount: 0 };
        }

        const totalSpent = invoices.reduce((s, i) => s + i.totalAmount, 0);
        const avgOrderValue = totalSpent / invoices.length;

        // Calculate purchase frequency (orders per month)
        const firstOrder = new Date(invoices[0].createdAt);
        const lastOrder = new Date(invoices[invoices.length - 1].createdAt);
        const lifespanMonths = Math.max(1, Math.ceil((lastOrder - firstOrder) / (30 * 24 * 60 * 60 * 1000)));
        const frequency = invoices.length / lifespanMonths;

        // Simple CLV = Avg Order Value × Purchase Frequency × 12 months
        const clv = avgOrderValue * frequency * 12;

        // Profit from customer
        let totalProfit = 0;
        for (const inv of invoices) {
          for (const item of inv.items) {
            const product = await Product.findById(item.product).lean();
            if (product) {
              totalProfit += (item.unitPrice - (product.cost || 0)) * item.quantity;
            }
          }
        }

        return {
          _id: c._id,
          name: c.name,
          phone: c.phone,
          tier: c.tier,
          invoiceCount: invoices.length,
          totalSpent,
          totalProfit,
          avgOrderValue: Math.round(avgOrderValue),
          frequency: Math.round(frequency * 10) / 10,
          lifespanMonths,
          clv: Math.round(clv),
          profitMargin: totalSpent > 0 ? Math.round((totalProfit / totalSpent) * 100) : 0,
        };
      })
    );

    clvData.sort((a, b) => b.clv - a.clv);

    const avgCLV = clvData.length > 0 ? clvData.reduce((s, c) => s + c.clv, 0) / clvData.length : 0;
    const top20Percent = clvData.slice(0, Math.ceil(clvData.length * 0.2));
    const top20Revenue = top20Percent.reduce((s, c) => s + c.totalSpent, 0);
    const totalRevenue = clvData.reduce((s, c) => s + c.totalSpent, 0);

    ApiResponse.success(res, {
      customers: clvData,
      summary: {
        avgCLV: Math.round(avgCLV),
        topCLV: clvData[0]?.clv || 0,
        totalCustomers: clvData.length,
        activeCustomers: clvData.filter((c) => c.invoiceCount > 0).length,
        top20PercentContribution: totalRevenue > 0 ? Math.round((top20Revenue / totalRevenue) * 100) : 0,
      },
    });
  });
}

module.exports = new DashboardController();
