/**
 * Import Controller — Handle CSV/Excel file imports
 */

const ImportService = require('../services/ImportService');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');
const fs = require('fs');
const path = require('path');

class ImportController {
  /**
   * POST /api/v1/import/products
   * Import products from Excel/CSV file
   */
  async importProducts(req, res, next) {
    try {
      if (!req.file) return next(AppError.badRequest('يرجى رفع ملف Excel أو CSV'));

      const filePath = req.file.path;
      const skipDuplicates = req.body.skipDuplicates !== 'false';
      const updateExisting = req.body.updateExisting === 'true';

      const parsed = await ImportService.parseFile(filePath);
      const results = await ImportService.importProducts(parsed.rows, req.tenantId, { skipDuplicates, updateExisting });

      // Cleanup uploaded file
      fs.unlink(filePath, () => {});

      ApiResponse.success(res, {
        totalRows: parsed.totalRows,
        ...results,
      }, `تم استيراد ${results.created} منتج بنجاح`);
    } catch (error) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      next(error);
    }
  }

  /**
   * POST /api/v1/import/customers
   * Import customers from Excel/CSV file
   */
  async importCustomers(req, res, next) {
    try {
      if (!req.file) return next(AppError.badRequest('يرجى رفع ملف Excel أو CSV'));

      const filePath = req.file.path;
      const skipDuplicates = req.body.skipDuplicates !== 'false';
      const updateExisting = req.body.updateExisting === 'true';

      const parsed = await ImportService.parseFile(filePath);
      const results = await ImportService.importCustomers(parsed.rows, req.tenantId, { skipDuplicates, updateExisting });

      fs.unlink(filePath, () => {});

      ApiResponse.success(res, {
        totalRows: parsed.totalRows,
        ...results,
      }, `تم استيراد ${results.created} عميل بنجاح`);
    } catch (error) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      next(error);
    }
  }

  /**
   * POST /api/v1/import/preview
   * Preview file contents before importing
   */
  async previewFile(req, res, next) {
    try {
      if (!req.file) return next(AppError.badRequest('يرجى رفع ملف'));

      const parsed = await ImportService.parseFile(req.file.path);

      fs.unlink(req.file.path, () => {});

      ApiResponse.success(res, {
        headers: parsed.headers,
        sampleRows: parsed.rows.slice(0, 5),
        totalRows: parsed.totalRows,
      });
    } catch (error) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      next(error);
    }
  }

  /**
   * GET /api/v1/import/template/:type
   * Download import template (products or customers)
   */
  async downloadTemplate(req, res, next) {
    try {
      const { type } = req.params;
      if (!['products', 'customers'].includes(type)) {
        return next(AppError.badRequest('النوع غير صحيح'));
      }

      const workbook = await ImportService.generateTemplate(type);
      const fileName = type === 'products' ? 'قالب_استيراد_المنتجات.xlsx' : 'قالب_استيراد_العملاء.xlsx';

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ImportController();
