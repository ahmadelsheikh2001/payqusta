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
      categories: { 
        type: [String], 
        default: [] // Start with empty categories for true isolation
      },
    },
    // WhatsApp configuration
    whatsapp: {
      enabled: { type: Boolean, default: false },
      phoneNumber: { type: String },
      phoneNumberId: { type: String },
      accessToken: { type: String },
      wabaId: { type: String }, // WhatsApp Business Account ID (dynamic)
      // Per-tenant template name mapping (auto-detected or manual)
      templateNames: {
        invoice: { type: String },      // e.g. 'payqusta_invoice' or 'invoice_notification'
        statement: { type: String },    // e.g. 'payqusta_statement' or 'customer_statement'
        reminder: { type: String },     // e.g. 'payqusta_reminder' or 'payment_reminder'
        payment: { type: String },      // e.g. 'payqusta_payment' or 'payment_received'
        restock: { type: String },      // e.g. 'payqusta_restock' or 'restock_request'
      },
      // Per-tenant template language mapping
      templateLanguages: {
        invoice: { type: String, default: 'ar_EG' },
        statement: { type: String, default: 'ar_EG' },
        reminder: { type: String, default: 'ar_EG' },
        payment: { type: String, default: 'ar_EG' },
        restock: { type: String, default: 'en' },
      },
      notifications: {
        installmentReminder: { type: Boolean, default: true },
        invoiceCreated: { type: Boolean, default: true },
        lowStockAlert: { type: Boolean, default: true },
        supplierPaymentDue: { type: Boolean, default: true },
      },
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'basic', 'pro', 'professional', 'enterprise'],
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
    // CCTV Cameras
    cameras: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true }, // HLS (.m3u8), MP4, or Embed URL
        type: { type: String, enum: ['stream', 'embed'], default: 'stream' },
        branch: { type: String }, // Optional: link to specific branch
      }
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
