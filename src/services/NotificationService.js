/**
 * NotificationService — In-App Notification Engine
 * Creates notifications and broadcasts via Server-Sent Events (SSE)
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    // SSE clients map: { 'userId': [res1, res2, ...] }
    this.sseClients = new Map();
  }

  /**
   * Register an SSE client connection
   */
  addSSEClient(userId, res) {
    if (!this.sseClients.has(userId)) {
      this.sseClients.set(userId, []);
    }
    this.sseClients.get(userId).push(res);

    // Remove on disconnect
    res.on('close', () => {
      const clients = this.sseClients.get(userId) || [];
      const idx = clients.indexOf(res);
      if (idx > -1) clients.splice(idx, 1);
      if (clients.length === 0) this.sseClients.delete(userId);
    });
  }

  /**
   * Send SSE event to a specific user
   */
  broadcastToUser(userId, notification) {
    const clients = this.sseClients.get(userId.toString()) || [];
    const data = JSON.stringify(notification);
    clients.forEach((res) => {
      try {
        res.write(`data: ${data}\n\n`);
      } catch (e) {
        // Client disconnected
      }
    });
  }

  /**
   * Create and broadcast a notification
   */
  async send({ tenant, recipient, type, title, message, icon, color, link, relatedModel, relatedId }) {
    try {
      const notification = await Notification.create({
        tenant, recipient, type, title, message, icon, color, link, relatedModel, relatedId,
      });

      // Broadcast via SSE
      this.broadcastToUser(recipient, {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        icon: notification.icon,
        color: notification.color,
        link: notification.link,
        createdAt: notification.createdAt,
      });

      return notification;
    } catch (err) {
      logger.error(`Notification send error: ${err.message}`);
    }
  }

  /**
   * Notify the vendor (tenant owner) about something
   */
  async notifyVendor(tenantId, { type, title, message, icon, color, link, relatedModel, relatedId }) {
    const vendor = await User.findOne({ tenant: tenantId, role: 'vendor' });
    if (!vendor) return;

    return this.send({
      tenant: tenantId,
      recipient: vendor._id,
      type, title, message, icon, color, link, relatedModel, relatedId,
    });
  }

  // ============ SPECIFIC NOTIFICATION METHODS ============

  /**
   * Invoice created notification
   */
  async onInvoiceCreated(tenantId, invoice, customerName) {
    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    return this.notifyVendor(tenantId, {
      type: 'invoice_created',
      title: 'فاتورة جديدة',
      message: `تم إنشاء فاتورة ${invoice.invoiceNumber} للعميل ${customerName} بمبلغ ${fmt(invoice.totalAmount)} ج.م`,
      link: '/invoices',
      relatedModel: 'Invoice',
      relatedId: invoice._id,
    });
  }

  /**
   * Payment received notification
   */
  async onPaymentReceived(tenantId, invoice, amount, customerName) {
    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    return this.notifyVendor(tenantId, {
      type: 'payment_received',
      title: 'تم استلام دفعة 💰',
      message: `استلمت ${fmt(amount)} ج.م من ${customerName} — فاتورة ${invoice.invoiceNumber}. المتبقي: ${fmt(invoice.remainingAmount)} ج.م`,
      link: '/invoices',
      relatedModel: 'Invoice',
      relatedId: invoice._id,
    });
  }

  /**
   * Installment due tomorrow
   */
  async onInstallmentDue(tenantId, customerName, invoiceNumber, amount, dueDate) {
    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    const dateStr = new Date(dueDate).toLocaleDateString('ar-EG');
    return this.notifyVendor(tenantId, {
      type: 'installment_due',
      title: 'قسط مستحق غداً ⏰',
      message: `العميل ${customerName} عليه قسط ${fmt(amount)} ج.م مستحق ${dateStr} — فاتورة ${invoiceNumber}`,
      link: '/invoices',
    });
  }

  /**
   * Installment overdue
   */
  async onInstallmentOverdue(tenantId, customerName, invoiceNumber, amount) {
    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    return this.notifyVendor(tenantId, {
      type: 'installment_overdue',
      title: 'قسط متأخر! ⚠️',
      message: `العميل ${customerName} متأخر عن قسط ${fmt(amount)} ج.م — فاتورة ${invoiceNumber}`,
      link: '/invoices',
    });
  }

  /**
   * Low stock alert
   */
  async onLowStock(tenantId, product) {
    return this.notifyVendor(tenantId, {
      type: 'low_stock',
      title: 'مخزون منخفض ⚠️',
      message: `المنتج "${product.name}" وصل ${product.stock.quantity} ${product.stock.unit} فقط (الحد الأدنى: ${product.stock.minQuantity})`,
      link: '/products',
      relatedModel: 'Product',
      relatedId: product._id,
    });
  }

  /**
   * Out of stock alert
   */
  async onOutOfStock(tenantId, product) {
    return this.notifyVendor(tenantId, {
      type: 'out_of_stock',
      title: 'منتج نفذ من المخزون! 🚨',
      message: `المنتج "${product.name}" نفذ تماماً من المخزون`,
      link: '/products',
      relatedModel: 'Product',
      relatedId: product._id,
    });
  }

  /**
   * Supplier payment due
   */
  async onSupplierPaymentDue(tenantId, supplierName, amount, dueDate) {
    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    return this.notifyVendor(tenantId, {
      type: 'supplier_payment_due',
      title: 'خلي بالك! عليك قسط مورد 🚛',
      message: `عليك قسط ${fmt(amount)} ج.م للمورد ${supplierName} مستحق ${new Date(dueDate).toLocaleDateString('ar-EG')}`,
      link: '/suppliers',
    });
  }

  /**
   * New customer created
   */
  async onNewCustomer(tenantId, customerName) {
    return this.notifyVendor(tenantId, {
      type: 'new_customer',
      title: 'عميل جديد 🎉',
      message: `تم إضافة العميل "${customerName}" بنجاح`,
      link: '/customers',
    });
  }

  /**
   * Customer upgraded to VIP
   */
  async onCustomerVIP(tenantId, customerName) {
    return this.notifyVendor(tenantId, {
      type: 'customer_vip',
      title: 'ترقية عميل ⭐',
      message: `العميل "${customerName}" ترقى لعميل VIP! النقاط تخطت 2000`,
      link: '/customers',
    });
  }
}

// Singleton
module.exports = new NotificationService();
