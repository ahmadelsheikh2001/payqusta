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
        { header: 'سعر البيع', key: 'price', width: 12 },
        { header: 'سعر الشراء', key: 'cost', width: 12 },
        { header: 'الكمية', key: 'quantity', width: 10 },
        { header: 'الحد الأدنى', key: 'minQuantity', width: 12 },
        { header: 'الحالة', key: 'stockStatus', width: 12 },
      ];
      products.forEach(p => prodWs.addRow({
        name: p.name, sku: p.sku, barcode: p.barcode, category: p.category,
        price: p.price, cost: p.cost,
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
              category: row['الفئة'] || 'عام', price: Number(row['سعر البيع']) || 0,
              cost: Number(row['سعر الشراء']) || 0,
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
  /**
   * GET /api/v1/backup/export-json
   * Export all tenant data as JSON file (full backup)
   */
  async exportJSON(req, res, next) {
    try {
      const tenantId = req.tenantId;

      const [products, customers, suppliers, invoices, expenses] = await Promise.all([
        Product.find({ tenant: tenantId }).lean(),
        Customer.find({ tenant: tenantId }).lean(),
        Supplier.find({ tenant: tenantId }).lean(),
        Invoice.find({ tenant: tenantId }).populate('customer', 'name phone').lean(),
        Expense.find({ tenant: tenantId }).lean(),
      ]);

      // Remove internal fields that shouldn't be in backup
      const clean = (docs) => docs.map(d => {
        const { __v, ...rest } = d;
        return rest;
      });

      const backup = {
        version: '1.0',
        appName: 'PayQusta',
        exportedAt: new Date().toISOString(),
        tenant: tenantId,
        counts: {
          products: products.length,
          customers: customers.length,
          suppliers: suppliers.length,
          invoices: invoices.length,
          expenses: expenses.length,
          total: products.length + customers.length + suppliers.length + invoices.length + expenses.length,
        },
        data: {
          products: clean(products),
          customers: clean(customers),
          suppliers: clean(suppliers),
          invoices: clean(invoices),
          expenses: clean(expenses),
        },
      };

      const fileName = `PayQusta_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.send(JSON.stringify(backup, null, 2));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/backup/restore-json
   * Restore data from JSON backup file
   */
  async restoreJSON(req, res, next) {
    try {
      if (!req.file) return next(AppError.badRequest('يرجى رفع ملف النسخة الاحتياطية'));

      const fs = require('fs');
      const raw = fs.readFileSync(req.file.path, 'utf-8');
      fs.unlink(req.file.path, () => {});

      let backup;
      try {
        backup = JSON.parse(raw);
      } catch {
        return next(AppError.badRequest('ملف JSON غير صالح'));
      }

      if (!backup.data || !backup.appName) {
        return next(AppError.badRequest('ملف النسخة الاحتياطية غير صالح - يجب أن يكون ملف PayQusta'));
      }

      const tenantId = req.tenantId;
      const results = {
        products: { imported: 0, skipped: 0 },
        customers: { imported: 0, skipped: 0 },
        suppliers: { imported: 0, skipped: 0 },
        invoices: { imported: 0, skipped: 0 },
        expenses: { imported: 0, skipped: 0 },
      };

      // Restore Products
      if (backup.data.products?.length) {
        for (const p of backup.data.products) {
          const existing = await Product.findOne({ tenant: tenantId, name: p.name });
          if (existing) { results.products.skipped++; continue; }
          await Product.create({
            ...p, _id: undefined, tenant: tenantId,
          });
          results.products.imported++;
        }
      }

      // Restore Customers
      if (backup.data.customers?.length) {
        for (const c of backup.data.customers) {
          const existing = await Customer.findOne({ tenant: tenantId, phone: c.phone });
          if (existing) { results.customers.skipped++; continue; }
          await Customer.create({
            ...c, _id: undefined, tenant: tenantId,
          });
          results.customers.imported++;
        }
      }

      // Restore Suppliers
      if (backup.data.suppliers?.length) {
        for (const s of backup.data.suppliers) {
          const existing = await Supplier.findOne({ tenant: tenantId, name: s.name });
          if (existing) { results.suppliers.skipped++; continue; }
          await Supplier.create({
            ...s, _id: undefined, tenant: tenantId,
          });
          results.suppliers.imported++;
        }
      }

      // Restore Invoices
      if (backup.data.invoices?.length) {
        for (const inv of backup.data.invoices) {
          const existing = await Invoice.findOne({ tenant: tenantId, invoiceNumber: inv.invoiceNumber });
          if (existing) { results.invoices.skipped++; continue; }
          // Link customer by name/phone if possible
          let customerId = null;
          if (inv.customer?.name) {
            const cust = await Customer.findOne({ tenant: tenantId, name: inv.customer.name });
            if (cust) customerId = cust._id;
          }
          await Invoice.create({
            ...inv, _id: undefined, tenant: tenantId,
            customer: customerId || inv.customer?._id || inv.customer,
          });
          results.invoices.imported++;
        }
      }

      // Restore Expenses
      if (backup.data.expenses?.length) {
        for (const e of backup.data.expenses) {
          const existing = await Expense.findOne({
            tenant: tenantId,
            description: e.description,
            amount: e.amount,
            date: e.date,
          });
          if (existing) { results.expenses.skipped++; continue; }
          await Expense.create({
            ...e, _id: undefined, tenant: tenantId,
          });
          results.expenses.imported++;
        }
      }

      const totalImported = Object.values(results).reduce((sum, r) => sum + r.imported, 0);
      const totalSkipped = Object.values(results).reduce((sum, r) => sum + r.skipped, 0);

      ApiResponse.success(res, {
        ...results,
        totalImported,
        totalSkipped,
      }, `تم استعادة ${totalImported} سجل بنجاح (تم تخطي ${totalSkipped} مكرر)`);
    } catch (error) {
      if (req.file?.path) require('fs').unlink(req.file.path, () => {});
      next(error);
    }
  }
}

module.exports = new BackupController();
