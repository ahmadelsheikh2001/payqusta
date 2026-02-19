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
   * Create and broadcast a notification to a specific user
   */
  async send({ tenant, recipient, type, title, message, icon, color, link, relatedModel, relatedId }) {
    try {
      const notification = await Notification.create({
        tenant, recipient, type, title, message, icon, color, link, relatedModel, relatedId,
      });

      // Broadcast via SSE
      this.broadcastToUser(recipient, {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        icon: notification.icon,
        color: notification.color,
        link: notification.link,
        createdAt: notification.createdAt,
        isRead: false,
      });

      return notification;
    } catch (err) {
      logger.error(`Notification send error: ${err.message}`);
    }
  }

  /**
   * Notify all admins and the vendor of a tenant
   * This ensures that store managers and owners both see important alerts
   */
  async notifyTenantAdmins(tenantId, { type, title, message, icon, color, link, relatedModel, relatedId }) {
    try {
      // Find all users with role 'admin' or 'vendor' in this tenant
      // Also potentially 'manager' if that role exists, but for now 'admin' and 'vendor' are key
      const recipients = await User.find({
        tenant: tenantId,
        role: { $in: ['vendor', 'admin'] },
        isActive: true
      }).select('_id');

      if (!recipients.length) return;

      const notifications = recipients.map(user => 
        this.send({
          tenant: tenantId,
          recipient: user._id,
          type, title, message, icon, color, link, relatedModel, relatedId,
        })
      );

      await Promise.all(notifications);
    } catch (err) {
      logger.error(`notifyTenantAdmins error: ${err.message}`);
    }
  }

  /**
   * Legacy wrapper for backward compatibility, now uses notifyTenantAdmins
   */
  async notifyVendor(tenantId, payload) {
    return this.notifyTenantAdmins(tenantId, payload);
  }

  // ============ SPECIFIC NOTIFICATION METHODS ============

  /**
   * Invoice created notification
   */
  async onInvoiceCreated(tenantId, invoice, customerName) {
    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    return this.notifyTenantAdmins(tenantId, {
      type: 'invoice_created',
      title: 'فاتورة جديدة',
      message: `تم إنشاء فاتورة ${invoice.invoiceNumber} للعميل ${customerName} بمبلغ ${fmt(invoice.totalAmount)} ج.م`,
      icon: 'file-text',
      color: 'primary',
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
    return this.notifyTenantAdmins(tenantId, {
      type: 'payment_received',
      title: 'تم استلام دفعة 💰',
      message: `استلمت ${fmt(amount)} ج.م من ${customerName} — فاتورة ${invoice.invoiceNumber}. المتبقي: ${fmt(invoice.remainingAmount)} ج.م`,
      icon: 'credit-card',
      color: 'success',
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
    return this.notifyTenantAdmins(tenantId, {
      type: 'installment_due',
      title: 'قسط مستحق غداً ⏰',
      message: `العميل ${customerName} عليه قسط ${fmt(amount)} ج.م مستحق ${dateStr} — فاتورة ${invoiceNumber}`,
      icon: 'clock',
      color: 'warning',
      link: '/invoices',
    });
  }

  /**
   * Installment overdue
   */
  async onInstallmentOverdue(tenantId, customerName, invoiceNumber, amount) {
    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    return this.notifyTenantAdmins(tenantId, {
      type: 'installment_overdue',
      title: 'قسط متأخر! ⚠️',
      message: `العميل ${customerName} متأخر عن قسط ${fmt(amount)} ج.م — فاتورة ${invoiceNumber}`,
      icon: 'alert-triangle',
      color: 'danger',
      link: '/invoices',
    });
  }

  /**
   * Low stock alert
   */
  async onLowStock(tenantId, product) {
    return this.notifyTenantAdmins(tenantId, {
      type: 'low_stock',
      title: 'مخزون منخفض ⚠️',
      message: `المنتج "${product.name}" وصل ${product.stock.quantity} ${product.stock.unit} فقط (الحد الأدنى: ${product.stock.minQuantity})`,
      icon: 'package-x',
      color: 'warning',
      link: '/products',
      relatedModel: 'Product',
      relatedId: product._id,
    });
  }

  /**
   * Out of stock alert
   */
  async onOutOfStock(tenantId, product) {
    return this.notifyTenantAdmins(tenantId, {
      type: 'out_of_stock',
      title: 'منتج نفذ من المخزون! 🚨',
      message: `المنتج "${product.name}" نفذ تماماً من المخزون`,
      icon: 'package-x',
      color: 'danger',
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
    return this.notifyTenantAdmins(tenantId, {
      type: 'supplier_payment_due',
      title: 'خلي بالك! عليك قسط مورد 🚛',
      message: `عليك قسط ${fmt(amount)} ج.م للمورد ${supplierName} مستحق ${new Date(dueDate).toLocaleDateString('ar-EG')}`,
      icon: 'truck',
      color: 'warning',
      link: '/suppliers',
    });
  }

  /**
   * New customer created
   */
  async onNewCustomer(tenantId, customerName) {
    return this.notifyTenantAdmins(tenantId, {
      type: 'new_customer',
      title: 'عميل جديد 🎉',
      message: `تم إضافة العميل "${customerName}" بنجاح`,
      icon: 'user-plus',
      color: 'success',
      link: '/customers',
    });
  }

  /**
   * Customer upgraded to VIP
   */
  async onCustomerVIP(tenantId, customerName) {
    return this.notifyTenantAdmins(tenantId, {
      type: 'customer_vip',
      title: 'ترقية عميل ⭐',
      message: `العميل "${customerName}" ترقى لعميل VIP! النقاط تخطت 2000`,
      icon: 'star',
      color: 'primary',
      link: '/customers',
    });
  }

  /**
   * Expense created
   */
  async onExpenseCreated(tenantId, { title, amount, category, createdByName }) {
    const fmt = (n) => (n || 0).toLocaleString('ar-EG');
    return this.notifyTenantAdmins(tenantId, {
      type: 'expense_created',
      title: 'تم تسجيل مصروف 💸',
      message: `${createdByName} سجل مصروف "${title}" بقيمة ${fmt(amount)} ج.م`,
      icon: 'credit-card',
      color: 'gray',
      link: '/expenses',
    });
  }

  /**
   * Branch created
   */
  async onBranchCreated(tenantId, branchName, creatorName) {
    return this.notifyTenantAdmins(tenantId, {
      type: 'branch_created',
      title: 'تم افتتاح فرع جديد! 🏪',
      message: `تم إنشاء فرع "${branchName}" بنجاح بواسطة ${creatorName}`,
      icon: 'store', // Lucide icon name, might need mapping in frontend but 'store' is standard or mapped to something similar
      color: 'success',
      link: '/settings', // Or dashboard
    });
  }
}

// Singleton
module.exports = new NotificationService();
