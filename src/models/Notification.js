/**
 * Notification Model — In-App Notification System
 * Real-time notifications for installments, stock alerts, payments, etc.
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    // Who should see this notification (vendor/admin user)
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    // Customer recipient (for portal notifications)
    customerRecipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    // Notification type
    type: {
      type: String,
      required: true,
      enum: [
        'installment_due',       // قسط مستحق
        'installment_overdue',   // قسط متأخر
        'payment_received',      // تم استلام دفعة
        'invoice_created',       // فاتورة جديدة
        'low_stock',             // مخزون منخفض
        'out_of_stock',          // نفاد مخزون
        'supplier_payment_due',  // دفعة مورد مستحقة
        'restock_request',       // طلب إعادة تخزين
        'new_customer',          // عميل جديد
        'customer_vip',          // عميل ترقى لـ VIP
        'system',                // إشعار نظام
        'order',                 // طلب جديد
        'order_status',          // تحديث حالة طلب
        'support_reply',         // رد على رسالة دعم
      ],
    },
    // Display info
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    // Icon & color for frontend
    icon: {
      type: String,
      default: 'bell', // lucide icon name
    },
    color: {
      type: String,
      default: 'primary', // primary, success, warning, danger
    },
    // Link to related resource
    link: {
      type: String, // e.g., '/invoices', '/products', '/customers'
    },
    // Related entity
    relatedModel: {
      type: String,
      enum: ['Invoice', 'Product', 'Customer', 'Supplier', null],
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    // Read status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ tenant: 1, recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ tenant: 1, customerRecipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // Auto-delete after 90 days

// Static: Create a notification
notificationSchema.statics.notify = async function ({
  tenant, recipient, type, title, message, icon, color, link, relatedModel, relatedId,
}) {
  return this.create({
    tenant, recipient, type, title, message,
    icon: icon || getDefaultIcon(type),
    color: color || getDefaultColor(type),
    link, relatedModel, relatedId,
  });
};

// Static: Get unread count
notificationSchema.statics.getUnreadCount = function (tenantId, userId) {
  return this.countDocuments({ tenant: tenantId, recipient: userId, isRead: false });
};

// Static: Mark all as read
notificationSchema.statics.markAllRead = function (tenantId, userId) {
  return this.updateMany(
    { tenant: tenantId, recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Helper: Default icon by type
function getDefaultIcon(type) {
  const icons = {
    installment_due: 'clock',
    installment_overdue: 'alert-triangle',
    payment_received: 'credit-card',
    invoice_created: 'file-text',
    low_stock: 'alert-triangle',
    out_of_stock: 'package-x',
    supplier_payment_due: 'truck',
    restock_request: 'package-plus',
    new_customer: 'user-plus',
    customer_vip: 'star',
    system: 'bell',
  };
  return icons[type] || 'bell';
}

// Helper: Default color by type
function getDefaultColor(type) {
  const colors = {
    installment_due: 'warning',
    installment_overdue: 'danger',
    payment_received: 'success',
    invoice_created: 'primary',
    low_stock: 'warning',
    out_of_stock: 'danger',
    supplier_payment_due: 'warning',
    restock_request: 'primary',
    new_customer: 'success',
    customer_vip: 'warning',
    system: 'gray',
  };
  return colors[type] || 'primary';
}

module.exports = mongoose.model('Notification', notificationSchema);
