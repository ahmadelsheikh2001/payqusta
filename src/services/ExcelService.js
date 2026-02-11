const ExcelJS = require('exceljs');
const { format } = require('date-fns');

/**
 * Excel Export Service
 * Generates Excel reports with Arabic RTL support
 */
class ExcelService {
  /**
   * Generate Sales Report Excel
   */
  async generateSalesReport(reportData) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('تقرير المبيعات', {
      views: [{ rightToLeft: true }],
    });

    // Set column widths
    sheet.columns = [
      { key: 'period', width: 15 },
      { key: 'count', width: 12 },
      { key: 'revenue', width: 15 },
      { key: 'paid', width: 15 },
      { key: 'profit', width: 15 },
    ];

    // Title
    sheet.mergeCells('A1:E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'تقرير المبيعات';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Date Range
    sheet.mergeCells('A2:E2');
    const dateCell = sheet.getCell('A2');
    dateCell.value = `الفترة: من ${format(new Date(reportData.dateRange.start), 'yyyy-MM-dd')} إلى ${format(new Date(reportData.dateRange.end), 'yyyy-MM-dd')}`;
    dateCell.alignment = { horizontal: 'center' };

    // Summary Section
    sheet.addRow([]);
    sheet.addRow(['الملخص العام']);
    sheet.getRow(4).font = { bold: true, size: 12 };

    sheet.addRow(['إجمالي الفواتير:', reportData.summary.totalInvoices]);
    sheet.addRow(['إجمالي الإيرادات:', `${reportData.summary.totalRevenue.toFixed(2)} جنيه`]);
    sheet.addRow(['المبالغ المدفوعة:', `${reportData.summary.totalPaid.toFixed(2)} جنيه`]);
    sheet.addRow(['المبالغ المتبقية:', `${reportData.summary.totalRemaining.toFixed(2)} جنيه`]);
    sheet.addRow(['إجمالي الأرباح:', `${reportData.summary.totalProfit.toFixed(2)} جنيه`]);
    sheet.addRow(['هامش الربح:', `${reportData.summary.profitMargin}%`]);
    sheet.addRow(['معدل التحصيل:', `${reportData.summary.collectionRate}%`]);

    // Sales by Period Section
    sheet.addRow([]);
    sheet.addRow(['المبيعات حسب الفترة']);
    sheet.getRow(sheet.lastRow.number).font = { bold: true, size: 12 };

    // Header row
    const headerRow = sheet.addRow(['الفترة', 'عدد الفواتير', 'الإيرادات', 'المدفوع', 'الأرباح']);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Data rows
    reportData.salesByPeriod.forEach(period => {
      sheet.addRow([
        period.period,
        period.count,
        `${period.revenue.toFixed(2)} جنيه`,
        `${period.paid.toFixed(2)} جنيه`,
        `${period.profit.toFixed(2)} جنيه`,
      ]);
    });

    // Top Customers Section
    if (reportData.topCustomers.length > 0) {
      sheet.addRow([]);
      sheet.addRow(['أفضل العملاء']);
      sheet.getRow(sheet.lastRow.number).font = { bold: true, size: 12 };

      const custHeaderRow = sheet.addRow(['العميل', 'رقم الهاتف', 'عدد الفواتير', 'الإيرادات', 'المدفوع']);
      custHeaderRow.font = { bold: true };
      custHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      reportData.topCustomers.forEach(customer => {
        sheet.addRow([
          customer.name,
          customer.phone,
          customer.count,
          `${customer.revenue} جنيه`,
          `${customer.paid} جنيه`,
        ]);
      });
    }

    // Payment Methods Section
    if (reportData.paymentMethods.length > 0) {
      sheet.addRow([]);
      sheet.addRow(['طرق الدفع']);
      sheet.getRow(sheet.lastRow.number).font = { bold: true, size: 12 };

      const pmHeaderRow = sheet.addRow(['طريقة الدفع', 'عدد المدفوعات', 'إجمالي المبلغ']);
      pmHeaderRow.font = { bold: true };
      pmHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      reportData.paymentMethods.forEach(method => {
        sheet.addRow([method.method, method.count, `${method.total} جنيه`]);
      });
    }

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Generate Profit Report Excel
   */
  async generateProfitReport(reportData) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('تقرير الأرباح', {
      views: [{ rightToLeft: true }],
    });

    // Title
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'تقرير تحليل الأرباح';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Summary
    sheet.addRow([]);
    sheet.addRow(['الملخص العام']);
    sheet.getRow(3).font = { bold: true, size: 12 };

    sheet.addRow(['إجمالي الإيرادات:', `${reportData.summary.totalRevenue.toFixed(2)} جنيه`]);
    sheet.addRow(['إجمالي التكاليف:', `${reportData.summary.totalCost.toFixed(2)} جنيه`]);
    sheet.addRow(['صافي الأرباح:', `${reportData.summary.totalProfit.toFixed(2)} جنيه`]);
    sheet.addRow(['هامش الربح:', `${reportData.summary.profitMargin}%`]);

    // By Category
    sheet.addRow([]);
    sheet.addRow(['الأرباح حسب الفئة']);
    sheet.getRow(sheet.lastRow.number).font = { bold: true, size: 12 };

    const catHeaderRow = sheet.addRow(['الفئة', 'الإيرادات', 'التكاليف', 'الأرباح', 'هامش الربح', 'الكمية']);
    catHeaderRow.font = { bold: true };
    catHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    reportData.byCategory.forEach(cat => {
      sheet.addRow([
        cat.category,
        `${cat.revenue.toFixed(2)} جنيه`,
        `${cat.cost.toFixed(2)} جنيه`,
        `${cat.profit.toFixed(2)} جنيه`,
        `${cat.profitMargin}%`,
        cat.quantity,
      ]);
    });

    // Top Products
    sheet.addRow([]);
    sheet.addRow(['أفضل المنتجات ربحاً']);
    sheet.getRow(sheet.lastRow.number).font = { bold: true, size: 12 };

    const prodHeaderRow = sheet.addRow(['المنتج', 'SKU', 'الفئة', 'الإيرادات', 'التكاليف', 'الأرباح', 'هامش الربح']);
    prodHeaderRow.font = { bold: true };
    prodHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    reportData.topProducts.forEach(prod => {
      sheet.addRow([
        prod.name,
        prod.sku,
        prod.category,
        `${prod.revenue.toFixed(2)} جنيه`,
        `${prod.cost.toFixed(2)} جنيه`,
        `${prod.profit.toFixed(2)} جنيه`,
        `${prod.profitMargin}%`,
      ]);
    });

    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 18;
    });

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Generate Inventory Report Excel
   */
  async generateInventoryReport(reportData) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('تقرير المخزون', {
      views: [{ rightToLeft: true }],
    });

    // Title
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'تقرير المخزون';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Summary
    sheet.addRow([]);
    sheet.addRow(['الملخص']);
    sheet.getRow(3).font = { bold: true, size: 12 };

    sheet.addRow(['إجمالي المنتجات:', reportData.summary.totalProducts]);
    sheet.addRow(['إجمالي العناصر:', reportData.summary.totalItems]);
    sheet.addRow(['قيمة المخزون:', `${reportData.summary.totalValue} جنيه`]);
    sheet.addRow(['نفذ من المخزون:', reportData.summary.stockLevels.outOfStock]);
    sheet.addRow(['مخزون منخفض:', reportData.summary.stockLevels.lowStock]);
    sheet.addRow(['مخزون طبيعي:', reportData.summary.stockLevels.normal]);

    // Items
    sheet.addRow([]);
    sheet.addRow(['تفاصيل المخزون']);
    sheet.getRow(sheet.lastRow.number).font = { bold: true, size: 12 };

    const headerRow = sheet.addRow(['المنتج', 'SKU', 'الفئة', 'الكمية', 'الحد الأدنى', 'سعر الشراء', 'سعر البيع', 'القيمة', 'الحالة', 'المورد']);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    reportData.items.forEach(item => {
      const row = sheet.addRow([
        item.name,
        item.sku,
        item.category,
        item.quantity,
        item.minQuantity,
        item.purchasePrice,
        item.sellingPrice,
        `${item.value.toFixed(2)} جنيه`,
        item.status === 'outOfStock' ? 'نفذ' : item.status === 'lowStock' ? 'منخفض' : 'طبيعي',
        item.supplier,
      ]);

      // Color code by status
      if (item.status === 'outOfStock') {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
        row.font = { color: { argb: 'FFFFFFFF' } };
      } else if (item.status === 'lowStock') {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      }
    });

    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 15;
    });

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Generate Customer Report Excel
   */
  async generateCustomerReport(reportData) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('تقرير العملاء', {
      views: [{ rightToLeft: true }],
    });

    // Title
    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'تقرير العملاء';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Summary
    sheet.addRow([]);
    sheet.addRow(['الملخص']);
    sheet.getRow(3).font = { bold: true, size: 12 };

    sheet.addRow(['إجمالي العملاء:', reportData.summary.totalCustomers]);
    sheet.addRow(['إجمالي الإيرادات:', `${reportData.summary.totalRevenue} جنيه`]);
    sheet.addRow(['المستحقات:', `${reportData.summary.totalOutstanding} جنيه`]);
    sheet.addRow(['متوسط قيمة العميل:', `${reportData.summary.averageCustomerValue} جنيه`]);

    // Customers
    sheet.addRow([]);
    sheet.addRow(['تفاصيل العملاء']);
    sheet.getRow(sheet.lastRow.number).font = { bold: true, size: 12 };

    const headerRow = sheet.addRow([
      'الاسم',
      'الهاتف',
      'البريد',
      'عدد الفواتير',
      'إجمالي المشتريات',
      'المدفوع',
      'المتبقي',
      'نسبة الدفع',
      'متوسط الفاتورة',
    ]);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    reportData.customers.forEach(customer => {
      sheet.addRow([
        customer.name,
        customer.phone,
        customer.email || '-',
        customer.totalInvoices,
        `${customer.totalPurchases} جنيه`,
        `${customer.totalPaid} جنيه`,
        `${customer.totalRemaining} جنيه`,
        `${customer.paymentRate}%`,
        `${customer.averageInvoice} جنيه`,
      ]);
    });

    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 16;
    });

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Generate Product Performance Report Excel
   */
  async generateProductPerformanceReport(reportData) {
    const workbook = new ExcelJS.Workbook();

    // Top by Revenue Sheet
    const revenueSheet = workbook.addWorksheet('الأفضل من حيث الإيرادات', {
      views: [{ rightToLeft: true }],
    });
    this._addProductPerformanceSheet(revenueSheet, reportData.topByRevenue, 'الإيرادات');

    // Top by Quantity Sheet
    const quantitySheet = workbook.addWorksheet('الأفضل من حيث الكمية', {
      views: [{ rightToLeft: true }],
    });
    this._addProductPerformanceSheet(quantitySheet, reportData.topByQuantity, 'الكمية');

    // Top by Profit Sheet
    const profitSheet = workbook.addWorksheet('الأفضل من حيث الأرباح', {
      views: [{ rightToLeft: true }],
    });
    this._addProductPerformanceSheet(profitSheet, reportData.topByProfit, 'الأرباح');

    return await workbook.xlsx.writeBuffer();
  }

  _addProductPerformanceSheet(sheet, products, sortBy) {
    // Title
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `أفضل المنتجات - ${sortBy}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    sheet.addRow([]);

    // Header
    const headerRow = sheet.addRow([
      'المنتج',
      'SKU',
      'الفئة',
      'الكمية المباعة',
      'الإيرادات',
      'الأرباح',
      'هامش الربح',
    ]);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // Data
    products.forEach(product => {
      sheet.addRow([
        product.name,
        product.sku,
        product.category,
        product.quantitySold,
        `${product.revenue.toFixed(2)} جنيه`,
        `${product.profit.toFixed(2)} جنيه`,
        `${product.profitMargin}%`,
      ]);
    });

    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 18;
    });
  }
}

module.exports = new ExcelService();