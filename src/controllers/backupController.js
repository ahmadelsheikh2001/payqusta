/**
 * Backup Controller — Data Backup & Restore
 */

const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const ApiResponse = require('../utils/ApiResponse');
const AppError = require('../utils/AppError');

// Models
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');

class BackupController {
  /**
   * GET /api/v1/backup/export
   * Export all tenant data as Excel file
   */
  async exportData(req, res, next) {
    try {
      const tenantId = req.tenantId;

      const [products, customers, suppliers, invoices, expenses] = await Promise.all([
        Product.find({ tenant: tenantId }).lean(),
        Customer.find({ tenant: tenantId }).lean(),
        Supplier.find({ tenant: tenantId }).lean(),
        Invoice.find({ tenant: tenantId }).populate('customer', 'name phone').lean(),
        Expense.find({ tenant: tenantId }).lean(),
      ]);

      const workbook = new ExcelJS.Workbook();
      workbook.views = [{ rightToLeft: true }];

      // Products sheet
      const prodWs = workbook.addWorksheet('المنتجات');
      prodWs.columns = [
        { header: 'الاسم', key: 'name', width: 25 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'الباركود', key: 'barcode', width: 18 },
        { header: 'الفئة', key: 'category', width: 15 },
        { header: 'سعر البيع', key: 'sellingPrice', width: 12 },
        { header: 'سعر الشراء', key: 'costPrice', width: 12 },
        { header: 'الكمية', key: 'quantity', width: 10 },
        { header: 'الحد الأدنى', key: 'minQuantity', width: 12 },
        { header: 'الحالة', key: 'stockStatus', width: 12 },
      ];
      products.forEach(p => prodWs.addRow({
        name: p.name, sku: p.sku, barcode: p.barcode, category: p.category,
        sellingPrice: p.sellingPrice, costPrice: p.costPrice,
        quantity: p.stock?.quantity || 0, minQuantity: p.stock?.minQuantity || 0,
        stockStatus: p.stockStatus,
      }));

      // Customers sheet
      const custWs = workbook.addWorksheet('العملاء');
      custWs.columns = [
        { header: 'الاسم', key: 'name', width: 25 },
        { header: 'الهاتف', key: 'phone', width: 15 },
        { header: 'البريد', key: 'email', width: 25 },
        { header: 'العنوان', key: 'address', width: 25 },
        { header: 'إجمالي المشتريات', key: 'totalPurchases', width: 18 },
        { header: 'المتبقي', key: 'totalRemaining', width: 15 },
        { header: 'نقاط الولاء', key: 'points', width: 12 },
        { header: 'المستوى', key: 'tier', width: 12 },
      ];
      customers.forEach(c => custWs.addRow({
        name: c.name, phone: c.phone, email: c.email, address: c.address,
        totalPurchases: c.financials?.totalPurchases || 0,
        totalRemaining: c.financials?.totalRemaining || 0,
        points: c.gamification?.points || 0, tier: c.gamification?.tier || 'normal',
      }));

      // Suppliers sheet
      const suppWs = workbook.addWorksheet('الموردين');
      suppWs.columns = [
        { header: 'الاسم', key: 'name', width: 25 },
        { header: 'جهة الاتصال', key: 'contactPerson', width: 20 },
        { header: 'الهاتف', key: 'phone', width: 15 },
        { header: 'البريد', key: 'email', width: 25 },
        { header: 'شروط الدفع', key: 'paymentTerms', width: 15 },
        { header: 'المشتريات', key: 'totalPurchases', width: 15 },
        { header: 'المستحق', key: 'outstandingBalance', width: 15 },
      ];
      suppliers.forEach(s => suppWs.addRow({
        name: s.name, contactPerson: s.contactPerson, phone: s.phone, email: s.email,
        paymentTerms: s.paymentTerms,
        totalPurchases: s.financials?.totalPurchases || 0,
        outstandingBalance: s.financials?.outstandingBalance || 0,
      }));

      // Invoices sheet
      const invWs = workbook.addWorksheet('الفواتير');
      invWs.columns = [
        { header: 'رقم الفاتورة', key: 'invoiceNumber', width: 20 },
        { header: 'العميل', key: 'customer', width: 25 },
        { header: 'المبلغ', key: 'totalAmount', width: 15 },
        { header: 'المدفوع', key: 'paidAmount', width: 15 },
        { header: 'المتبقي', key: 'remainingAmount', width: 15 },
        { header: 'الحالة', key: 'status', width: 12 },
        { header: 'التاريخ', key: 'createdAt', width: 15 },
      ];
      invoices.forEach(inv => invWs.addRow({
        invoiceNumber: inv.invoiceNumber, customer: inv.customer?.name || '-',
        totalAmount: inv.totalAmount, paidAmount: inv.paidAmount, remainingAmount: inv.remainingAmount,
        status: inv.status, createdAt: inv.createdAt?.toLocaleDateString('ar-EG'),
      }));

      // Expenses sheet
      const expWs = workbook.addWorksheet('المصروفات');
      expWs.columns = [
        { header: 'الوصف', key: 'description', width: 30 },
        { header: 'المبلغ', key: 'amount', width: 15 },
        { header: 'الفئة', key: 'category', width: 15 },
        { header: 'التاريخ', key: 'date', width: 15 },
      ];
      expenses.forEach(e => expWs.addRow({
        description: e.description, amount: e.amount, category: e.category,
        date: e.date?.toLocaleDateString('ar-EG'),
      }));

      // Style all headers
      workbook.worksheets.forEach(ws => {
        ws.getRow(1).eachCell(cell => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      const fileName = `PayQusta_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/backup/stats
   * Get data counts for backup preview
   */
  async getStats(req, res, next) {
    try {
      const tenantId = req.tenantId;

      const [products, customers, suppliers, invoices, expenses] = await Promise.all([
        Product.countDocuments({ tenant: tenantId }),
        Customer.countDocuments({ tenant: tenantId }),
        Supplier.countDocuments({ tenant: tenantId }),
        Invoice.countDocuments({ tenant: tenantId }),
        Expense.countDocuments({ tenant: tenantId }),
      ]);

      ApiResponse.success(res, {
        products, customers, suppliers, invoices, expenses,
        total: products + customers + suppliers + invoices + expenses,
        lastBackup: null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/backup/restore
   * Restore data from Excel backup file
   */
  async restoreData(req, res, next) {
    try {
      if (!req.file) return next(AppError.badRequest('يرجى رفع ملف النسخة الاحتياطية'));

      const ImportService = require('../services/ImportService');
      const fs = require('fs');

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(req.file.path);

      const results = { products: 0, customers: 0, suppliers: 0 };

      // Restore Products
      const prodWs = workbook.getWorksheet('المنتجات');
      if (prodWs) {
        const rows = [];
        const headers = [];
        prodWs.getRow(1).eachCell((cell, col) => { headers[col] = String(cell.value).trim(); });
        prodWs.eachRow((row, num) => {
          if (num === 1) return;
          const obj = {};
          row.eachCell((cell, col) => { if (headers[col]) obj[headers[col]] = cell.value; });
          rows.push(obj);
        });

        for (const row of rows) {
          const name = row['الاسم'];
          if (!name) continue;
          const existing = await Product.findOne({ tenant: req.tenantId, name });
          if (!existing) {
            await Product.create({
              tenant: req.tenantId, name, sku: row['SKU'] || '', barcode: row['الباركود'] || '',
              category: row['الفئة'] || 'عام', sellingPrice: Number(row['سعر البيع']) || 0,
              costPrice: Number(row['سعر الشراء']) || 0,
              stock: { quantity: Number(row['الكمية']) || 0, minQuantity: Number(row['الحد الأدنى']) || 5 },
            });
            results.products++;
          }
        }
      }

      // Restore Customers
      const custWs = workbook.getWorksheet('العملاء');
      if (custWs) {
        const headers = [];
        custWs.getRow(1).eachCell((cell, col) => { headers[col] = String(cell.value).trim(); });
        custWs.eachRow(async (row, num) => {
          if (num === 1) return;
          const obj = {};
          row.eachCell((cell, col) => { if (headers[col]) obj[headers[col]] = cell.value; });
          const name = obj['الاسم'];
          const phone = String(obj['الهاتف'] || '');
          if (!name || !phone) return;
          const existing = await Customer.findOne({ tenant: req.tenantId, phone });
          if (!existing) {
            await Customer.create({ tenant: req.tenantId, name, phone, email: obj['البريد'] || '', address: obj['العنوان'] || '' });
            results.customers++;
          }
        });
      }

      fs.unlink(req.file.path, () => {});

      ApiResponse.success(res, results, `تم استعادة البيانات بنجاح`);
    } catch (error) {
      if (req.file?.path) require('fs').unlink(req.file.path, () => {});
      next(error);
    }
  }
}

module.exports = new BackupController();
