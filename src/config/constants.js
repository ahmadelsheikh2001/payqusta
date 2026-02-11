/**
 * Application Constants
 * Centralized configuration values
 */

module.exports = {
  // User Roles
  ROLES: {
    ADMIN: 'admin',
    VENDOR: 'vendor',
    SUPPLIER: 'supplier',
    CUSTOMER: 'customer',
    COORDINATOR: 'coordinator',
  },

  // Customer Tiers
  CUSTOMER_TIERS: {
    NORMAL: 'normal',
    PREMIUM: 'premium',
    VIP: 'vip',
  },

  // Payment Methods
  PAYMENT_METHODS: {
    CASH: 'cash',
    INSTALLMENT: 'installment',
    DEFERRED: 'deferred', // آجل
  },

  // Installment Frequencies
  INSTALLMENT_FREQUENCIES: {
    WEEKLY: 'weekly',         // أسبوعي
    BIWEEKLY: 'biweekly',    // كل 15 يوم
    MONTHLY: 'monthly',       // شهري
    BIMONTHLY: 'bimonthly',  // كل شهرين
  },

  // Invoice Status
  INVOICE_STATUS: {
    DRAFT: 'draft',
    PENDING: 'pending',
    PARTIALLY_PAID: 'partially_paid',
    PAID: 'paid',
    OVERDUE: 'overdue',
    CANCELLED: 'cancelled',
  },

  // Installment Status
  INSTALLMENT_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
    OVERDUE: 'overdue',
    PARTIALLY_PAID: 'partially_paid',
  },

  // Stock Status
  STOCK_STATUS: {
    IN_STOCK: 'in_stock',
    LOW_STOCK: 'low_stock',
    OUT_OF_STOCK: 'out_of_stock',
  },

  // Supplier Payment Terms
  SUPPLIER_PAYMENT_TERMS: {
    CASH: 'cash',
    DEFERRED_15: 'deferred_15',
    DEFERRED_30: 'deferred_30',
    DEFERRED_45: 'deferred_45',
    DEFERRED_60: 'deferred_60',
    INSTALLMENT: 'installment',
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    INSTALLMENT_REMINDER: 'installment_reminder',
    INSTALLMENT_OVERDUE: 'installment_overdue',
    LOW_STOCK_ALERT: 'low_stock_alert',
    OUT_OF_STOCK_ALERT: 'out_of_stock_alert',
    INVOICE_CREATED: 'invoice_created',
    PAYMENT_RECEIVED: 'payment_received',
    SUPPLIER_PAYMENT_DUE: 'supplier_payment_due',
    RESTOCK_REQUEST: 'restock_request',
  },

  // Gamification
  GAMIFICATION: {
    POINTS_PER_PURCHASE: 10,    // نقاط لكل 1000 جنيه شراء
    POINTS_PER_ON_TIME: 50,     // نقاط للسداد في الميعاد
    VIP_THRESHOLD: 2000,        // نقاط للوصول لـ VIP
    PREMIUM_THRESHOLD: 1000,    // نقاط للوصول لـ Premium
  },

  // Currencies
  CURRENCIES: {
    EGP: { code: 'EGP', symbol: 'ج.م', name: 'جنيه مصري' },
    SAR: { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي' },
    AED: { code: 'AED', symbol: 'د.إ', name: 'درهم إماراتي' },
    USD: { code: 'USD', symbol: '$', name: 'دولار أمريكي' },
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 25,
    MAX_LIMIT: 100,
  },

  // Audit Actions
  AUDIT_ACTIONS: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LOGIN: 'login',
    LOGOUT: 'logout',
    PAYMENT: 'payment',
    INVOICE: 'invoice',
    STOCK_CHANGE: 'stock_change',
  },
};
