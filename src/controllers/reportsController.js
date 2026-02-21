const ReportsService = require('../services/ReportsService');
const ExcelService = require('../services/ExcelService');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Reports Controller
 * Handles all reporting endpoints
 */
class ReportsController {
  /**
   * GET /api/v1/reports/sales
   * Get sales report
   */
  getSalesReport = catchAsync(async (req, res, next) => {
    const { startDate, endDate, groupBy, branch } = req.query;

    const report = await ReportsService.getSalesReport(req.tenantId, {
      startDate,
      endDate,
      groupBy: groupBy || 'day',
      branchId: branch
    });

    ApiResponse.success(res, report);
  });

  /**
   * GET /api/v1/reports/profit
   * Get profit analysis report
   */
  getProfitReport = catchAsync(async (req, res, next) => {
    const { startDate, endDate, branch } = req.query;

    const report = await ReportsService.getProfitReport(req.tenantId, {
      startDate,
      endDate,
      branchId: branch
    });

    ApiResponse.success(res, report);
  });

  /**
   * GET /api/v1/reports/inventory
   * Get inventory report
   */
  getInventoryReport = catchAsync(async (req, res, next) => {
    const { lowStockOnly, category } = req.query;

    const report = await ReportsService.getInventoryReport(req.tenantId, {
      lowStockOnly: lowStockOnly === 'true',
      category,
    });

    ApiResponse.success(res, report);
  });

  /**
   * GET /api/v1/reports/customers
   * Get customer report
   */
  getCustomerReport = catchAsync(async (req, res, next) => {
    const { startDate, endDate, minPurchases } = req.query;

    const report = await ReportsService.getCustomerReport(req.tenantId, {
      startDate,
      endDate,
      minPurchases: minPurchases ? parseInt(minPurchases) : 0,
    });

    ApiResponse.success(res, report);
  });

  /**
   * GET /api/v1/reports/products
   * Get product performance report
   */
  getProductPerformanceReport = catchAsync(async (req, res, next) => {
    const { startDate, endDate, limit } = req.query;

    const report = await ReportsService.getProductPerformanceReport(req.tenantId, {
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 50,
    });

    ApiResponse.success(res, report);
  });

  /**
   * GET /api/v1/reports/export/sales
   * Export sales report to Excel
   */
  exportSalesReport = catchAsync(async (req, res, next) => {
    const { startDate, endDate, groupBy, branch } = req.query;

    const report = await ReportsService.getSalesReport(req.tenantId, {
      startDate,
      endDate,
      groupBy: groupBy || 'day',
      branchId: branch
    });

    const buffer = await ExcelService.generateSalesReport(report);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.xlsx`);
    res.send(buffer);
  });

  /**
   * GET /api/v1/reports/export/profit
   * Export profit report to Excel
   */
  exportProfitReport = catchAsync(async (req, res, next) => {
    const { startDate, endDate, branch } = req.query;

    const report = await ReportsService.getProfitReport(req.tenantId, {
      startDate,
      endDate,
      branchId: branch
    });

    const buffer = await ExcelService.generateProfitReport(report);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=profit-report-${Date.now()}.xlsx`);
    res.send(buffer);
  });

  /**
   * GET /api/v1/reports/export/inventory
   * Export inventory report to Excel
   */
  exportInventoryReport = catchAsync(async (req, res, next) => {
    const { lowStockOnly, category } = req.query;

    const report = await ReportsService.getInventoryReport(req.tenantId, {
      lowStockOnly: lowStockOnly === 'true',
      category,
    });

    const buffer = await ExcelService.generateInventoryReport(report);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=inventory-report-${Date.now()}.xlsx`);
    res.send(buffer);
  });

  /**
   * GET /api/v1/reports/export/customers
   * Export customer report to Excel
   */
  exportCustomerReport = catchAsync(async (req, res, next) => {
    const { startDate, endDate, minPurchases } = req.query;

    const report = await ReportsService.getCustomerReport(req.tenantId, {
      startDate,
      endDate,
      minPurchases: minPurchases ? parseInt(minPurchases) : 0,
    });

    const buffer = await ExcelService.generateCustomerReport(report);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=customer-report-${Date.now()}.xlsx`);
    res.send(buffer);
  });

  /**
   * GET /api/v1/reports/export/products
   * Export product performance report to Excel
   */
  exportProductPerformanceReport = catchAsync(async (req, res, next) => {
    const { startDate, endDate, limit } = req.query;

    const report = await ReportsService.getProductPerformanceReport(req.tenantId, {
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 50,
    });

    const buffer = await ExcelService.generateProductPerformanceReport(report);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=product-performance-${Date.now()}.xlsx`);
    res.send(buffer);
  });
}

module.exports = new ReportsController();