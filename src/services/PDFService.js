/**
 * PDF Generation Service
 * Generate PDF documents for invoices, customer statements, etc.
 * Uses PDFKit for PDF generation
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Helpers = require('../utils/helpers');

class PDFService {
  constructor() {
    this.outputDir = path.join(__dirname, '../../uploads/pdfs');
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate Customer Statement PDF
   */
  async generateCustomerStatement(customer, transactions, tenantName = 'PayQusta') {
    return new Promise((resolve, reject) => {
      try {
        const filename = `statement_${customer._id}_${Date.now()}.pdf`;
        const filepath = path.join(this.outputDir, filename);
        
        const doc = new PDFDocument({ 
          size: 'A4', 
          margin: 50,
          info: {
            Title: `كشف حساب - ${customer.name}`,
            Author: tenantName,
          }
        });

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Register Arabic font if available, otherwise use default
        const fontPath = path.join(__dirname, '../fonts/Cairo-Regular.ttf');
        if (fs.existsSync(fontPath)) {
          doc.registerFont('Arabic', fontPath);
          doc.font('Arabic');
        }

        // Header
        doc.fontSize(24).text(tenantName, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(18).text('كشف حساب العميل', { align: 'center' });
        doc.moveDown();
        
        // Line separator
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown();

        // Customer Info
        doc.fontSize(12);
        doc.text(`الاسم: ${customer.name}`, { align: 'right' });
        doc.text(`الهاتف: ${customer.phone}`, { align: 'right' });
        doc.text(`الفئة: ${customer.tier === 'vip' ? 'VIP' : customer.tier === 'premium' ? 'Premium' : 'عادي'}`, { align: 'right' });
        doc.text(`تاريخ الكشف: ${new Date().toLocaleDateString('ar-EG')}`, { align: 'right' });
        doc.moveDown();

        // Financial Summary Box
        const boxY = doc.y;
        doc.rect(50, boxY, 495, 80).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.fillColor('#000');
        
        const col1X = 60, col2X = 220, col3X = 380;
        const summaryY = boxY + 15;
        
        doc.fontSize(10).fillColor('#666');
        doc.text('إجمالي المشتريات', col1X, summaryY);
        doc.text('إجمالي المدفوع', col2X, summaryY);
        doc.text('المتبقي', col3X, summaryY);
        
        doc.fontSize(16).fillColor('#000');
        doc.text(`${Helpers.formatCurrency(customer.financials?.totalPurchases || 0)}`, col1X, summaryY + 20);
        doc.fillColor('#059669').text(`${Helpers.formatCurrency(customer.financials?.totalPaid || 0)}`, col2X, summaryY + 20);
        const outstanding = customer.financials?.outstandingBalance || 0;
        doc.fillColor(outstanding > 0 ? '#dc2626' : '#059669').text(`${Helpers.formatCurrency(outstanding)}`, col3X, summaryY + 20);
        
        doc.y = boxY + 95;
        doc.fillColor('#000');

        // Transactions Table
        if (transactions && transactions.length > 0) {
          doc.moveDown();
          doc.fontSize(14).text('سجل المعاملات', { align: 'right' });
          doc.moveDown(0.5);

          // Table Header
          const tableTop = doc.y;
          const tableHeaders = ['الحالة', 'المتبقي', 'المدفوع', 'المبلغ', 'التاريخ', 'رقم الفاتورة'];
          const colWidths = [60, 70, 70, 70, 80, 100];
          let xPos = 545;

          doc.fontSize(9).fillColor('#fff');
          doc.rect(50, tableTop, 495, 20).fill('#374151');
          
          tableHeaders.forEach((header, i) => {
            xPos -= colWidths[i];
            doc.text(header, xPos + 5, tableTop + 5, { width: colWidths[i] - 10, align: 'center' });
          });

          // Table Rows
          doc.fillColor('#000');
          let rowY = tableTop + 25;
          
          transactions.slice(0, 15).forEach((inv, index) => {
            if (rowY > 700) return; // Page overflow protection
            
            // Alternate row colors
            if (index % 2 === 0) {
              doc.rect(50, rowY - 3, 495, 18).fill('#f9fafb');
              doc.fillColor('#000');
            }

            xPos = 545;
            const rowData = [
              inv.status === 'paid' ? 'مسدد' : inv.status === 'overdue' ? 'متأخر' : 'قيد السداد',
              Helpers.formatCurrency(inv.remainingAmount || 0),
              Helpers.formatCurrency(inv.paidAmount || 0),
              Helpers.formatCurrency(inv.totalAmount || 0),
              new Date(inv.createdAt).toLocaleDateString('ar-EG'),
              inv.invoiceNumber,
            ];

            doc.fontSize(8);
            rowData.forEach((data, i) => {
              xPos -= colWidths[i];
              // Color code status
              if (i === 0) {
                doc.fillColor(inv.status === 'paid' ? '#059669' : inv.status === 'overdue' ? '#dc2626' : '#d97706');
              } else {
                doc.fillColor('#000');
              }
              doc.text(data, xPos + 5, rowY, { width: colWidths[i] - 10, align: 'center' });
            });
            
            rowY += 18;
          });

          // Totals Row
          doc.rect(50, rowY, 495, 22).fill('#e5e7eb');
          doc.fillColor('#000').fontSize(9);
          xPos = 545;
          const totals = [
            '',
            Helpers.formatCurrency(transactions.reduce((s, i) => s + (i.remainingAmount || 0), 0)),
            Helpers.formatCurrency(transactions.reduce((s, i) => s + (i.paidAmount || 0), 0)),
            Helpers.formatCurrency(transactions.reduce((s, i) => s + (i.totalAmount || 0), 0)),
            '',
            'الإجمالي',
          ];
          totals.forEach((data, i) => {
            xPos -= colWidths[i];
            doc.text(data, xPos + 5, rowY + 6, { width: colWidths[i] - 10, align: 'center' });
          });
        }

        // Footer
        doc.fontSize(8).fillColor('#9ca3af');
        doc.text(`تم إنشاء هذا الكشف بواسطة ${tenantName} — PayQusta`, 50, 770, { align: 'center', width: 495 });

        doc.end();

        stream.on('finish', () => {
          resolve({
            success: true,
            filename,
            filepath,
            url: `/uploads/pdfs/${filename}`,
          });
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Invoice PDF
   */
  async generateInvoicePDF(invoice, tenant) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `invoice_${invoice.invoiceNumber}_${Date.now()}.pdf`;
        const filepath = path.join(this.outputDir, filename);
        
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Header
        doc.fontSize(24).text(tenant?.name || 'PayQusta', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(18).text('فاتورة', { align: 'center' });
        doc.moveDown();

        // Invoice Info
        doc.fontSize(12);
        doc.text(`رقم الفاتورة: ${invoice.invoiceNumber}`, { align: 'right' });
        doc.text(`التاريخ: ${new Date(invoice.createdAt).toLocaleDateString('ar-EG')}`, { align: 'right' });
        doc.text(`العميل: ${invoice.customer?.name || 'غير محدد'}`, { align: 'right' });
        doc.moveDown();

        // Items
        doc.fontSize(10);
        let y = doc.y;
        doc.text('الإجمالي', 50, y);
        doc.text('السعر', 150, y);
        doc.text('الكمية', 250, y);
        doc.text('المنتج', 350, y);
        doc.moveDown();

        (invoice.items || []).forEach(item => {
          y = doc.y;
          doc.text(Helpers.formatCurrency(item.totalPrice), 50, y);
          doc.text(Helpers.formatCurrency(item.unitPrice), 150, y);
          doc.text(item.quantity.toString(), 250, y);
          doc.text(item.productName || 'منتج', 350, y);
          doc.moveDown(0.5);
        });

        // Total
        doc.moveDown();
        doc.fontSize(14).text(`الإجمالي: ${Helpers.formatCurrency(invoice.totalAmount)}`, { align: 'left' });
        doc.text(`المدفوع: ${Helpers.formatCurrency(invoice.paidAmount)}`, { align: 'left' });
        doc.text(`المتبقي: ${Helpers.formatCurrency(invoice.remainingAmount)}`, { align: 'left' });

        doc.end();

        stream.on('finish', () => {
          resolve({ success: true, filename, filepath, url: `/uploads/pdfs/${filename}` });
        });
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Restock Request PDF for Supplier
   */
  async generateRestockRequest(products, supplier, tenant) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `restock_${supplier._id}_${Date.now()}.pdf`;
        const filepath = path.join(this.outputDir, filename);
        
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Header
        doc.fontSize(24).text(tenant?.name || 'PayQusta', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(18).text('طلب إعادة تخزين', { align: 'center' });
        doc.moveDown();

        // Supplier Info
        doc.fontSize(12);
        doc.text(`إلى: ${supplier.name}`, { align: 'right' });
        doc.text(`الهاتف: ${supplier.phone}`, { align: 'right' });
        doc.text(`التاريخ: ${new Date().toLocaleDateString('ar-EG')}`, { align: 'right' });
        doc.moveDown();

        doc.text('نرجو توفير المنتجات التالية:', { align: 'right' });
        doc.moveDown();

        // Products Table
        let y = doc.y;
        doc.fontSize(10);
        doc.text('الكمية المطلوبة', 50, y);
        doc.text('المخزون الحالي', 150, y);
        doc.text('SKU', 280, y);
        doc.text('المنتج', 380, y);
        doc.moveDown();

        products.forEach(p => {
          y = doc.y;
          const needed = Math.max(10, (p.stock?.minQuantity || 10) * 2 - (p.stock?.quantity || 0));
          doc.text(needed.toString(), 50, y);
          doc.text((p.stock?.quantity || 0).toString(), 150, y);
          doc.text(p.sku || '-', 280, y);
          doc.text(p.name, 380, y);
          doc.moveDown(0.5);
        });

        doc.moveDown();
        doc.fontSize(12).text('شكراً لتعاونكم', { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          resolve({ success: true, filename, filepath, url: `/uploads/pdfs/${filename}` });
        });
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Delete old PDF files (cleanup)
   */
  cleanupOldFiles(maxAgeHours = 24) {
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    const now = Date.now();

    fs.readdir(this.outputDir, (err, files) => {
      if (err) return;
      files.forEach(file => {
        const filepath = path.join(this.outputDir, file);
        fs.stat(filepath, (err, stats) => {
          if (err) return;
          if (now - stats.mtimeMs > maxAge) {
            fs.unlink(filepath, () => {});
          }
        });
      });
    });
  }
}

module.exports = new PDFService();
