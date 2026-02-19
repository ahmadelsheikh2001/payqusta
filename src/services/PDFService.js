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
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate Customer Statement PDF - Matched to HTML Print Design
   */
  async generateCustomerStatement(customer, transactions, tenantName = 'PayQusta', options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const { startDate, endDate, openingBalance = 0 } = options;
        const filename = `statement_${customer._id}_${Date.now()}.pdf`;
        const filepath = path.join(this.outputDir, filename);
        
        const doc = new PDFDocument({ size: 'A4', margin: 30, autoFirstPage: true });
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Fonts
        const fontPath = path.join(__dirname, '../fonts/Cairo-Regular.ttf');
        const fontBoldPath = path.join(__dirname, '../fonts/Cairo-Bold.ttf');
        
        const regFont = fs.existsSync(fontPath) ? fontPath : 'Helvetica';
        const boldFont = fs.existsSync(fontBoldPath) ? fontBoldPath : (fs.existsSync(fontPath) ? fontPath : 'Helvetica-Bold');

        doc.registerFont('Cairo', regFont);
        doc.registerFont('Cairo-Bold', boldFont);
        doc.font('Cairo');

        // Helper
        const formatMoney = (amount) => Helpers.formatCurrency(amount);
        const formatDate = (date) => new Date(date).toLocaleDateString('ar-EG');

        // --- Header (Matches HTML .header) ---
        doc.fontSize(18).font('Cairo-Bold').text('كشف حساب العميل', { align: 'center' });
        doc.fontSize(10).font('Cairo').text(`${tenantName} — نظام إدارة المبيعات والأقساط`, { align: 'center' });
        
        doc.moveDown(0.5);
        doc.moveTo(30, doc.y).lineTo(565, doc.y).lineWidth(1.5).strokeColor('#333').stroke(); // Border bottom like HTML
        doc.moveDown(1);

        // --- Info Grid (Matches HTML .info-grid) ---
        // We will simulate a grid with 3 columns
        // HTML: Name, Phone, Status | Total Purchases, Total Paid, Remaining
        let y = doc.y;
        const colWidth = (535 - 20) / 3; // 3 columns with gap
        const boxHeight = 40;
        
        // Function to draw info box
        const drawInfoBox = (label, value, x, valColor = '#000') => {
          doc.rect(x, y, colWidth, boxHeight).fill('#f5f5f5');
          doc.fillColor('#666').fontSize(8).text(label, x + 5, y + 5, { width: colWidth - 10, align: 'right' });
          doc.fillColor(valColor).fontSize(10).font('Cairo-Bold').text(value, x + 5, y + 20, { width: colWidth - 10, align: 'right' });
          doc.font('Cairo');
        };

        // Row 1
        drawInfoBox('اسم العميل', customer.name, 565 - colWidth);
        drawInfoBox('رقم الهاتف', customer.phone, 565 - (colWidth * 2) - 10);
        drawInfoBox('الحالة', customer.tier === 'vip' ? '⭐ VIP' : customer.tier === 'premium' ? 'Premium' : 'عادي', 565 - (colWidth * 3) - 20);
        
        y += boxHeight + 10;
        
        // Row 2 (Financials)
        const totalPurchases = startDate 
           ? transactions.reduce((s, t) => s + t.totalAmount, 0)
           : (customer.financials?.totalPurchases || 0);
           
        const totalPaid = startDate 
           ? transactions.reduce((s, t) => s + t.paidAmount, 0)
           : (customer.financials?.totalPaid || 0);

        const outstanding = startDate
           ? openingBalance + transactions.reduce((s, t) => s + t.remainingAmount, 0)
           : (customer.financials?.outstandingBalance || 0);

        drawInfoBox('إجمالي المشتريات', formatMoney(totalPurchases), 565 - colWidth);
        drawInfoBox('إجمالي المدفوع', formatMoney(totalPaid), 565 - (colWidth * 2) - 10, 'green');
        drawInfoBox('المتبقي', formatMoney(outstanding), 565 - (colWidth * 3) - 20, outstanding > 0 ? 'red' : 'green');

        y += boxHeight + 20;
        doc.y = y;

        // --- Transactions List (Matches HTML .items-table structure) ---
        doc.fontSize(14).font('Cairo-Bold').fillColor('#000').text('سجل المعاملات', { align: 'right' });
        doc.moveDown(0.5);

        if (transactions.length > 0) {
          transactions.forEach((inv) => {
            if (doc.y > 700) doc.addPage();

            // Invoice Container Border
            const startY = doc.y;
            
            // Title Line: Invoice # - Date
            doc.fontSize(10).font('Cairo-Bold').text(
              `فاتورة: ${inv.invoiceNumber} — ${formatDate(inv.createdAt)}`, 
              30, doc.y, { align: 'right', width: 535 }
            );
            doc.moveDown(0.5);

            // Items Table Header
            const tableTop = doc.y;
            doc.rect(30, tableTop, 535, 15).fill('#666'); // Dark header
            doc.fillColor('#fff').fontSize(8);
            
            const cols = [200, 50, 80, 80]; // Product, Qty, Price, Total (width)
            // x positions:
            // Product: starts at 565 - 200 = 365
            // Qty: starts at 365 - 50 = 315
            // Price: starts at 315 - 80 = 235
            // Total: starts at 235 - 80 = 155
            
            const drawRow = (p, q, u, t, rY, bg = null, textCol = '#000') => {
                if (bg) doc.rect(30, rY, 535, 15).fill(bg);
                doc.fillColor(textCol);
                doc.text(p, 365, rY + 3, { width: 195, align: 'right' });
                doc.text(q, 315, rY + 3, { width: 45, align: 'center' });
                doc.text(u, 235, rY + 3, { width: 75, align: 'center' });
                doc.text(t, 25, rY + 3, { width: 125, align: 'center' }); // Wider for alignment
            };

            // Header Text
            doc.font('Cairo-Bold');
            drawRow('المنتج', 'الكمية', 'السعر', 'الإجمالي', tableTop, null, '#fff');
            
            let rowY = tableTop + 15;
            
            // Items
            doc.font('Cairo');
            const items = inv.items || [];
            items.forEach((item, i) => {
                const bg = i % 2 === 0 ? '#fafafa' : '#fff';
                const name = item.product?.name || item.productName || 'منتج';
                drawRow(
                    name, 
                    item.quantity.toString(), 
                    formatMoney(item.unitPrice), 
                    formatMoney(item.totalPrice), 
                    rowY, 
                    bg,
                    '#000'
                );
                rowY += 15;
            });

            // Invoice Footer (Total, Paid, Remaining)
            doc.rect(30, rowY, 535, 20).fill('#eee'); // Total row bg
            doc.font('Cairo-Bold').fontSize(9).fillColor('#000');
            
            const remainingColor = inv.remainingAmount > 0 ? 'red' : 'green';
            
            const footerText = `الإجمالي: ${formatMoney(inv.totalAmount)}  |  المدفوع: ${formatMoney(inv.paidAmount)}  |  المتبقي: ${formatMoney(inv.remainingAmount)}`;
            // doc.text(footerText, 30, rowY + 5, { align: 'center', width: 535 });
            
            // Custom positioning for colors
            let textX = 450;
            doc.text('الإجمالي:', textX, rowY + 5, { width: 50, align: 'right' });
            doc.text(formatMoney(inv.totalAmount), textX - 60, rowY + 5, { width: 60, align: 'right' });
            
            textX -= 130;
            doc.fillColor('green').text('المدفوع:', textX, rowY + 5, { width: 40, align: 'right' });
            doc.text(formatMoney(inv.paidAmount), textX - 60, rowY + 5, { width: 60, align: 'right' });

            textX -= 130;
            doc.fillColor(remainingColor).text('المتبقي:', textX, rowY + 5, { width: 40, align: 'right' });
            doc.text(formatMoney(inv.remainingAmount), textX - 60, rowY + 5, { width: 60, align: 'right' });

            doc.y = rowY + 25;
            doc.moveDown();
          });
        } else {
           doc.text('لا توجد معاملات', { align: 'center' });
        }

        // --- Final Summary ---
        doc.moveDown(2);
        doc.moveTo(30, doc.y).lineTo(565, doc.y).lineWidth(1.5).strokeColor('#333').stroke();
        doc.moveDown();

        doc.fontSize(12).font('Cairo-Bold').fillColor('#000').text('ملخص المستحقات', { align: 'right' });
        doc.moveDown(0.5);

        const summaryBoxTop = doc.y;
        doc.rect(30, summaryBoxTop, 535, 50).fill('#f1f5f9');
        
        // Reuse calculated totals or recalculate if needed (variables totalPurchases, totalPaid, outstanding are available from top scope)
        // But wait, previous replacement scope might not have captured them if they were local consts in the top block? 
        // In my full write (Step 525), they were defined in the main function scope.
        // Let's re-calculate to be safe or assume availability.
        // Calculating again based on transactions + opening if needed.
        
        // If date filter is on, we used startDate check.
        // Let's create new vars to be safe in this block if we can't see the top.
        // Actually, better to just use the values passed/calculated.
        // I'll re-calculate local totals for safety.
        
        const sumSales = startDate 
           ? transactions.reduce((s, t) => s + t.totalAmount, 0)
           : (customer.financials?.totalPurchases || 0);
           
        const sumPaid = startDate 
           ? transactions.reduce((s, t) => s + t.paidAmount, 0)
           : (customer.financials?.totalPaid || 0);

        const sumOutstanding = startDate
           ? openingBalance + transactions.reduce((s, t) => s + t.remainingAmount, 0)
           : (customer.financials?.outstandingBalance || 0);

        const colW = 535 / 3;
        const textY = summaryBoxTop + 15;
        
        // Net Balance
        doc.fillColor(sumOutstanding > 0 ? '#dc2626' : '#059669');
        doc.fontSize(14).text(`${formatMoney(sumOutstanding)}`, 30, textY + 15, { width: colW, align: 'center' });
        doc.fontSize(10).fillColor('#666').text('صافي المستحق', 30, textY, { width: colW, align: 'center' });

        // Paid
        doc.fillColor('#059669');
        doc.fontSize(14).text(`${formatMoney(sumPaid)}`, 30 + colW, textY + 15, { width: colW, align: 'center' });
        doc.fontSize(10).fillColor('#666').text('إجمالي المدفوع', 30 + colW, textY, { width: colW, align: 'center' });

        // Sales
        doc.fillColor('#000');
        doc.fontSize(14).text(`${formatMoney(sumSales)}`, 30 + (colW * 2), textY + 15, { width: colW, align: 'center' });
        doc.fontSize(10).fillColor('#666').text('إجمالي المشتريات', 30 + (colW * 2), textY, { width: colW, align: 'center' });
        
        doc.fillColor('#000');
        doc.moveDown(4);

        // --- Footer ---
        doc.fontSize(8).fillColor('#999');
        doc.text(`تم إنشاء هذا الكشف بواسطة PayQusta — ${new Date().toLocaleString('ar-EG')}`, 30, 780, { align: 'center', width: 535 });

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
        
        // Use Cairo font
        const fontPath = path.join(__dirname, '../fonts/Cairo-Regular.ttf');
        if (fs.existsSync(fontPath)) doc.registerFont('Cairo', fontPath).font('Cairo');

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
   * Generate Restock Request PDF
   */
  async generateRestockRequest(products, supplier, tenant) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `restock_${supplier._id}_${Date.now()}.pdf`;
        const filepath = path.join(this.outputDir, filename);
        
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);
        
        const fontPath = path.join(__dirname, '../fonts/Cairo-Regular.ttf');
        if (fs.existsSync(fontPath)) doc.registerFont('Cairo', fontPath).font('Cairo');

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
}

module.exports = new PDFService();
