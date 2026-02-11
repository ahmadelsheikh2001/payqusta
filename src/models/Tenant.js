/**
 * Tenant Model — Multi-Vendor SaaS
 * Each vendor/seller has their own tenant with isolated data
 */

const mongoose = require('mongoose');
const { CURRENCIES } = require('../config/constants');

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم المتجر مطلوب'],
      trim: true,
      maxlength: [100, 'اسم المتجر لا يتجاوز 100 حرف'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Branding customization
    branding: {
      logo: { type: String, default: null },
      primaryColor: { type: String, default: '#6366f1' },
      secondaryColor: { type: String, default: '#10b981' },
      darkMode: { type: Boolean, default: false },
    },
    // Business info
    businessInfo: {
      phone: { type: String },
      email: { type: String },
      address: { type: String },
      taxId: { type: String },
      commercialRegister: { type: String },
    },
    // Settings
    settings: {
      currency: {
        type: String,
        enum: Object.keys(CURRENCIES),
        default: 'EGP',
      },
      timezone: { type: String, default: 'Africa/Cairo' },
      language: { type: String, default: 'ar' },
      lowStockThreshold: { type: Number, default: 5 },
      autoRestockAlert: { type: Boolean, default: true },
      enableGamification: { type: Boolean, default: true },
    },
    // WhatsApp configuration
    whatsapp: {
      enabled: { type: Boolean, default: false },
      phoneNumber: { type: String },
      phoneNumberId: { type: String },
      accessToken: { type: String },
      notifications: {
        installmentReminder: { type: Boolean, default: true },
        invoiceCreated: { type: Boolean, default: true },
        lowStockAlert: { type: Boolean, default: true },
        supplierPaymentDue: { type: Boolean, default: true },
      },
    },
    // Subscription
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'basic', 'professional', 'enterprise'],
        default: 'free',
      },
      status: {
        type: String,
        enum: ['active', 'trial', 'suspended', 'cancelled'],
        default: 'trial',
      },
      trialEndsAt: { type: Date },
      currentPeriodEnd: { type: Date },
      maxProducts: { type: Number, default: 50 },
      maxCustomers: { type: Number, default: 100 },
      maxUsers: { type: Number, default: 3 },
    },
    // Dashboard widget configuration
    dashboardWidgets: [
      {
        widgetId: String,
        position: { x: Number, y: Number, w: Number, h: Number },
        visible: { type: Boolean, default: true },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
tenantSchema.index({ owner: 1 });
tenantSchema.index({ 'subscription.status': 1 });

// Pre-save: generate slug
tenantSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\u0621-\u064A\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

module.exports = mongoose.model('Tenant', tenantSchema);
