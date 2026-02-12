/**
 * Import Service — CSV/Excel Import for Products & Customers
 */

const ExcelJS = require('exceljs');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

class ImportService {
  /**
   * Parse Excel/CSV file and return rows as JSON
   */
  async parseFile(filePath) {
    const workbook = new ExcelJS.Workbook();

    if (filePath.endsWith('.csv')) {
      await workbook.csv.readFile(filePath);
    } else {
      await workbook.xlsx.readFile(filePath);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      throw new Error('الملف فارغ أو لا يحتوي على بيانات');
    }

    // Get headers from first row
    const headers = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value || '').trim().toLowerCase();
    });

    // Parse rows
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const obj = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) obj[header] = cell.value;
      });
      if (Object.keys(obj).length > 0) rows.push(obj);
    });

    return { headers: headers.filter(Boolean), rows, totalRows: rows.length };
  }

  /**
   * Import Products from parsed data
   */
  async importProducts(rows, tenantId, options = {}) {
    const { skipDuplicates = true, updateExisting = false } = options;
    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    // Map supplier names to IDs
    const supplierNames = [...new Set(rows.map(r => r.supplier || r['المورد']).filter(Boolean))];
    const suppliers = await Supplier.find({ tenant: tenantId, name: { $in: supplierNames } }).lean();
    const supplierMap = {};
    suppliers.forEach(s => { supplierMap[s.name.toLowerCase()] = s._id; });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const name = row.name || row['اسم المنتج'] || row['الاسم'];
        if (!name) { results.errors.push({ row: i + 2, error: 'اسم المنتج مطلوب' }); continue; }

        const sku = row.sku || row['كود المنتج'] || row['SKU'] || '';
        const barcode = row.barcode || row['الباركود'] || '';

        // Check for existing product
        const query = { tenant: tenantId, $or: [{ name }] };
        if (sku) query.$or.push({ sku });
        if (barcode) query.$or.push({ barcode });

        const existing = await Product.findOne(query);

        if (existing) {
          if (updateExisting) {
            await Product.findByIdAndUpdate(existing._id, {
              sellingPrice: Number(row.price || row['سعر البيع'] || row.sellingPrice) || existing.sellingPrice,
              costPrice: Number(row.cost || row['سعر الشراء'] || row.costPrice) || existing.costPrice,
              'stock.quantity': Number(row.stock || row['الكمية'] || row.quantity) ?? existing.stock?.quantity,
              category: row.category || row['الفئة'] || existing.category,
            });
            results.updated++;
          } else if (skipDuplicates) {
            results.skipped++;
          }
          continue;
        }

        const supplierName = (row.supplier || row['المورد'] || '').toLowerCase();

        await Product.create({
          tenant: tenantId,
          name,
          sku,
          barcode,
          category: row.category || row['الفئة'] || 'عام',
          sellingPrice: Number(row.price || row['سعر البيع'] || row.sellingPrice) || 0,
          costPrice: Number(row.cost || row['سعر الشراء'] || row.costPrice) || 0,
          stock: {
            quantity: Number(row.stock || row['الكمية'] || row.quantity) || 0,
            minQuantity: Number(row.minStock || row['الحد الأدنى'] || row.minQuantity) || 5,
          },
          description: row.description || row['الوصف'] || '',
          supplier: supplierMap[supplierName] || null,
        });
        results.created++;
      } catch (err) {
        results.errors.push({ row: i + 2, error: err.message });
      }
    }

    return results;
  }

  /**
   * Import Customers from parsed data
   */
  async importCustomers(rows, tenantId, options = {}) {
    const { skipDuplicates = true, updateExisting = false } = options;
    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const name = row.name || row['اسم العميل'] || row['الاسم'];
        const phone = String(row.phone || row['رقم الهاتف'] || row['الهاتف'] || '').trim();

        if (!name || !phone) {
          results.errors.push({ row: i + 2, error: 'الاسم ورقم الهاتف مطلوبين' });
          continue;
        }

        const existing = await Customer.findOne({ tenant: tenantId, $or: [{ phone }, { name }] });

        if (existing) {
          if (updateExisting) {
            await Customer.findByIdAndUpdate(existing._id, {
              email: row.email || row['البريد'] || existing.email,
              address: row.address || row['العنوان'] || existing.address,
              notes: row.notes || row['ملاحظات'] || existing.notes,
            });
            results.updated++;
          } else if (skipDuplicates) {
            results.skipped++;
          }
          continue;
        }

        await Customer.create({
          tenant: tenantId,
          name,
          phone,
          email: row.email || row['البريد'] || '',
          address: row.address || row['العنوان'] || '',
          notes: row.notes || row['ملاحظات'] || '',
        });
        results.created++;
      } catch (err) {
        results.errors.push({ row: i + 2, error: err.message });
      }
    }

    return results;
  }

  /**
   * Generate a template Excel file for import
   */
  async generateTemplate(type) {
    const workbook = new ExcelJS.Workbook();
    workbook.views = [{ rightToLeft: true }];

    if (type === 'products') {
      const ws = workbook.addWorksheet('المنتجات');
      ws.columns = [
        { header: 'اسم المنتج', key: 'name', width: 25 },
        { header: 'كود المنتج', key: 'sku', width: 15 },
        { header: 'الباركود', key: 'barcode', width: 18 },
        { header: 'الفئة', key: 'category', width: 15 },
        { header: 'سعر البيع', key: 'price', width: 12 },
        { header: 'سعر الشراء', key: 'cost', width: 12 },
        { header: 'الكمية', key: 'stock', width: 10 },
        { header: 'الحد الأدنى', key: 'minStock', width: 12 },
        { header: 'المورد', key: 'supplier', width: 20 },
        { header: 'الوصف', key: 'description', width: 30 },
      ];

      // Style header
      ws.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Sample row
      ws.addRow({ name: 'آيفون 15 برو', sku: 'IPH-15P', barcode: '6941812345678', category: 'هواتف', price: 55000, cost: 45000, stock: 25, minStock: 5, supplier: 'أبل مصر', description: 'آيفون 15 برو 256 جيجا' });
    } else {
      const ws = workbook.addWorksheet('العملاء');
      ws.columns = [
        { header: 'اسم العميل', key: 'name', width: 25 },
        { header: 'رقم الهاتف', key: 'phone', width: 15 },
        { header: 'البريد', key: 'email', width: 25 },
        { header: 'العنوان', key: 'address', width: 30 },
        { header: 'ملاحظات', key: 'notes', width: 30 },
      ];

      ws.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      ws.addRow({ name: 'أحمد محمد', phone: '01012345678', email: 'ahmed@email.com', address: 'القاهرة', notes: 'عميل VIP' });
    }

    return workbook;
  }
}

module.exports = new ImportService();
