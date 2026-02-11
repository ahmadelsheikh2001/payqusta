const ReportsService = require('../services/ReportsService');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');

/**
 * Reports Controller
 * Handles all reporting endpoints
 */
class ReportsController {
  /**
   * GET /api/v1/reports/sales
   * Get sales report
   */
  async getSalesReport(req, res, next) {
    try {
      const { startDate, endDate, groupBy } = req.query;

      const report = await ReportsService.getSalesReport(req.tenantId, {
        startDate,
        endDate,
        groupBy: groupBy || 'day',
      });

      ApiResponse.success(res, report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/profit
   * Get profit analysis report
   */
  async getProfitReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const report = await ReportsService.getProfitReport(req.tenantId, {
        startDate,
        endDate,
      });

      ApiResponse.success(res, report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/inventory
   * Get inventory report
   */
  async getInventoryReport(req, res, next) {
    try {
      const { lowStockOnly, category } = req.query;

      const report = await ReportsService.getInventoryReport(req.tenantId, {
        lowStockOnly: lowStockOnly === 'true',
        category,
      });

      ApiResponse.success(res, report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/customers
   * Get customer report
   */
  async getCustomerReport(req, res, next) {
    try {
      const { startDate, endDate, minPurchases } = req.query;

      const report = await ReportsService.getCustomerReport(req.tenantId, {
        startDate,
        endDate,
        minPurchases: minPurchases ? parseInt(minPurchases) : 0,
      });

      ApiResponse.success(res, report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/products
   * Get product performance report
   */
  async getProductPerformanceReport(req, res, next) {
    try {
      const { startDate, endDate, limit } = req.query;

      const report = await ReportsService.getProductPerformanceReport(req.tenantId, {
        startDate,
        endDate,
        limit: limit ? parseInt(limit) : 50,
      });

      ApiResponse.success(res, report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/export/sales
   * Export sales report to Excel
   */
  async exportSalesReport(req, res, next) {
    try {
      const { startDate, endDate, groupBy } = req.query;

      const report = await ReportsService.getSalesReport(req.tenantId, {
        startDate,
        endDate,
        groupBy: groupBy || 'day',
      });

      const ExcelService = require('../services/ExcelService');
      const buffer = await ExcelService.generateSalesReport(report);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/export/profit
   * Export profit report to Excel
   */
  async exportProfitReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const report = await ReportsService.getProfitReport(req.tenantId, {
        startDate,
        endDate,
      });

      const ExcelService = require('../services/ExcelService');
      const buffer = await ExcelService.generateProfitReport(report);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=profit-report-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/export/inventory
   * Export inventory report to Excel
   */
  async exportInventoryReport(req, res, next) {
    try {
      const { lowStockOnly, category } = req.query;

      const report = await ReportsService.getInventoryReport(req.tenantId, {
        lowStockOnly: lowStockOnly === 'true',
        category,
      });

      const ExcelService = require('../services/ExcelService');
      const buffer = await ExcelService.generateInventoryReport(report);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=inventory-report-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/export/customers
   * Export customer report to Excel
   */
  async exportCustomerReport(req, res, next) {
    try {
      const { startDate, endDate, minPurchases } = req.query;

      const report = await ReportsService.getCustomerReport(req.tenantId, {
        startDate,
        endDate,
        minPurchases: minPurchases ? parseInt(minPurchases) : 0,
      });

      const ExcelService = require('../services/ExcelService');
      const buffer = await ExcelService.generateCustomerReport(report);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=customer-report-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/export/products
   * Export product performance report to Excel
   */
  async exportProductPerformanceReport(req, res, next) {
    try {
      const { startDate, endDate, limit } = req.query;

      const report = await ReportsService.getProductPerformanceReport(req.tenantId, {
        startDate,
        endDate,
        limit: limit ? parseInt(limit) : 50,
      });

      const ExcelService = require('../services/ExcelService');
      const buffer = await ExcelService.generateProductPerformanceReport(report);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=product-performance-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportsController();