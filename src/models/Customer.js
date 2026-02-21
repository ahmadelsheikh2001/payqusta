/**
 * Customer Model — Client Management with Gamification
 * Supports VIP/Premium tiers, points system, and WhatsApp integration
 */

const mongoose = require('mongoose');
const { CUSTOMER_TIERS, GAMIFICATION } = require('../config/constants');

const customerSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      // Optional: if not set, customer is global or assigned to main branch
      index: true,
    },
    name: {
      type: String,
      required: [true, 'اسم العميل مطلوب'],
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: [true, 'رقم الهاتف مطلوب'],
      trim: true,
    },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    // National ID or tax ID
    nationalId: { type: String, trim: true },
    // Extended profile fields
    profilePhoto: { type: String, default: null }, // base64 data URL or external URL
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', ''], default: '' },
    whatsappNumber: { type: String, trim: true }, // renamed to avoid conflict with whatsapp object
    bio: { type: String, maxlength: 300 }, // short personal note

    // KYC Documents
    documents: [{
      type: {
        type: String,
        enum: ['national_id', 'passport', 'utility_bill', 'contract', 'other'],
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      url: { type: String, required: true }, // base64 or external url
      rejectionReason: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    }],

    // Address Book
    addresses: [{
      label: { type: String, default: 'المنزل' }, // Home, Work, Other
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String },
      zipCode: { type: String },
      isDefault: { type: Boolean, default: false }
    }],

    // Portal Authentication
    password: {
      type: String,
      select: false,
      minlength: 6
    },
    isPortalActive: {
      type: Boolean,
      default: true
    },
    lastLogin: { type: Date },

    // Financial summary
    financials: {
      totalPurchases: { type: Number, default: 0 },
      totalPaid: { type: Number, default: 0 },
      outstandingBalance: { type: Number, default: 0 },
      creditLimit: { type: Number, default: 10000 }, // الحد الائتماني الافتراضي
      lifetimeValue: { type: Number, default: 0 }, // قيمة العميل الكلية
    },
    // Credit Engine (محرك الائتمان)
    creditEngine: {
      score: { type: Number, default: 100, min: 0, max: 100 }, // درجة الائتمان 0-100
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'blocked'],
        default: 'low',
      },
      maxInstallments: { type: Number, default: 12 }, // أقصى عدد أقساط مسموح
      allowDeferred: { type: Boolean, default: true }, // السماح بالآجل
      allowInstallments: { type: Boolean, default: true }, // السماح بالأقساط
      lastAssessment: { type: Date },
    },
    // Payment Behavior (سلوك الدفع)
    paymentBehavior: {
      onTimePayments: { type: Number, default: 0 }, // عدد الدفعات في الميعاد
      latePayments: { type: Number, default: 0 }, // عدد التأخيرات
      totalPayments: { type: Number, default: 0 }, // إجمالي الدفعات
      avgDaysLate: { type: Number, default: 0 }, // متوسط أيام التأخير
      longestStreak: { type: Number, default: 0 }, // أطول سلسلة التزام
      currentStreak: { type: Number, default: 0 }, // السلسلة الحالية
    },
    // Sales Control
    salesBlocked: { type: Boolean, default: false }, // منع البيع
    salesBlockedReason: { type: String },
    salesBlockedAt: { type: Date },
    // Customer Since
    firstPurchaseDate: { type: Date },
    lastPurchaseDate: { type: Date },
    lastPaymentDate: { type: Date },
    // Customer tier (Gamification)
    tier: {
      type: String,
      enum: Object.values(CUSTOMER_TIERS),
      default: CUSTOMER_TIERS.NORMAL,
    },
    // Gamification points
    gamification: {
      points: { type: Number, default: 0 },
      totalEarnedPoints: { type: Number, default: 0 },
      redeemedPoints: { type: Number, default: 0 },
      badges: [
        {
          name: String,
          earnedAt: Date,
          icon: String,
        },
      ],
      lastDailyRewardClaim: { type: Date },
    },
    // WhatsApp preferences
    whatsapp: {
      enabled: { type: Boolean, default: true },
      number: { type: String }, // Formatted for WhatsApp
      notifications: {
        invoices: { type: Boolean, default: true },      // إشعار الفواتير الجديدة
        reminders: { type: Boolean, default: true },     // تذكيرات الأقساط
        statements: { type: Boolean, default: true },    // كشف الحساب
        payments: { type: Boolean, default: true },      // تأكيد استلام الدفع
      },
    },
    // Wishlist
    wishlist: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    }],
    barcode: { type: String, trim: true },
    // Notes
    notes: { type: String, maxlength: 2000 },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Encrypt password using bcrypt
const bcrypt = require('bcryptjs');

customerSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match user entered password to hashed password in database
customerSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Pre-save Migration & Auto-generation
customerSchema.pre('save', function (next) {
  // 1. Handle legacy whatsapp string
  if (typeof this.whatsapp === 'string') {
    if (this.whatsapp.trim()) {
      this.whatsappNumber = this.whatsapp;
    }
    this.whatsapp = undefined;
  }

  // 2. Convert empty strings to undefined for sparse indexes
  if (this.whatsappNumber === '') this.whatsappNumber = undefined;
  if (this.barcode === '') this.barcode = undefined;

  // 3. Generate barcode if missing
  if (!this.barcode) {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    this.barcode = `CST-${datePart}-${randomPart}`;
  }

  next();
});

// Indexes
customerSchema.index({ tenant: 1, phone: 1 }, { unique: true });
customerSchema.index({ tenant: 1, barcode: 1 }, { unique: true, sparse: true });
customerSchema.index({ tenant: 1, whatsappNumber: 1 }, { unique: false, sparse: true });
customerSchema.index({ tenant: 1, name: 'text' });
customerSchema.index({ tenant: 1, tier: 1 });
customerSchema.index({ tenant: 1, 'financials.outstandingBalance': -1 });

// Instance: Add points and check tier upgrade
customerSchema.methods.addPoints = function (points) {
  this.gamification.points += points;
  this.gamification.totalEarnedPoints += points;

  // Auto-upgrade tier
  if (this.gamification.totalEarnedPoints >= GAMIFICATION.VIP_THRESHOLD) {
    this.tier = CUSTOMER_TIERS.VIP;
  } else if (this.gamification.totalEarnedPoints >= GAMIFICATION.PREMIUM_THRESHOLD) {
    this.tier = CUSTOMER_TIERS.PREMIUM;
  }

  return this;
};

// Instance: Record a purchase
customerSchema.methods.recordPurchase = function (amount, paidAmount = 0) {
  this.financials.totalPurchases += amount;
  this.financials.totalPaid += paidAmount;
  this.financials.outstandingBalance = this.financials.totalPurchases - this.financials.totalPaid;

  // Award gamification points (10 points per 1000 EGP)
  const earnedPoints = Math.floor(amount / 1000) * GAMIFICATION.POINTS_PER_PURCHASE;
  this.addPoints(earnedPoints);

  return this;
};

// Instance: Record a payment
customerSchema.methods.recordPayment = function (amount, onTime = true) {
  this.financials.totalPaid += amount;
  this.financials.outstandingBalance = Math.max(
    0,
    this.financials.totalPurchases - this.financials.totalPaid
  );

  // Bonus points for on-time payment
  if (onTime) {
    this.addPoints(GAMIFICATION.POINTS_PER_ON_TIME);
  }

  return this;
};

// Static: Get top customers by purchases
customerSchema.statics.getTopCustomers = function (tenantId, limit = 10) {
  return this.find({ tenant: tenantId, isActive: true })
    .sort({ 'financials.totalPurchases': -1 })
    .limit(limit)
    .select('name phone tier financials.totalPurchases financials.outstandingBalance gamification.points');
};

// Static: Get customers with outstanding balance
customerSchema.statics.getDebtors = function (tenantId) {
  return this.find({
    tenant: tenantId,
    isActive: true,
    'financials.outstandingBalance': { $gt: 0 },
  })
    .sort({ 'financials.outstandingBalance': -1 })
    .select('name phone financials.outstandingBalance');
};

// Instance: Calculate and update credit score
customerSchema.methods.calculateCreditScore = function () {
  let score = 100;
  const pb = this.paymentBehavior;
  const fin = this.financials;

  // Factor 1: Payment history (40% weight)
  if (pb.totalPayments > 0) {
    const onTimeRatio = pb.onTimePayments / pb.totalPayments;
    score -= Math.round((1 - onTimeRatio) * 40);
  }

  // Factor 2: Late payment frequency (20% weight)
  if (pb.latePayments > 3) score -= Math.min(pb.latePayments * 3, 20);

  // Factor 3: Outstanding balance vs credit limit (20% weight)
  if (fin.creditLimit > 0) {
    const utilizationRatio = fin.outstandingBalance / fin.creditLimit;
    if (utilizationRatio > 1) score -= 20;
    else if (utilizationRatio > 0.8) score -= 15;
    else if (utilizationRatio > 0.5) score -= 8;
  }

  // Factor 4: Average days late (10% weight)
  if (pb.avgDaysLate > 30) score -= 10;
  else if (pb.avgDaysLate > 14) score -= 6;
  else if (pb.avgDaysLate > 7) score -= 3;

  // Factor 5: Current streak bonus (10% weight)
  if (pb.currentStreak >= 5) score += 5;
  else if (pb.currentStreak >= 3) score += 3;

  // Ensure score is within bounds
  this.creditEngine.score = Math.max(0, Math.min(100, score));

  // Update risk level based on score
  if (this.creditEngine.score >= 70) {
    this.creditEngine.riskLevel = 'low';
    this.creditEngine.maxInstallments = 12;
    this.creditEngine.allowDeferred = true;
    this.creditEngine.allowInstallments = true;
  } else if (this.creditEngine.score >= 50) {
    this.creditEngine.riskLevel = 'medium';
    this.creditEngine.maxInstallments = 6;
    this.creditEngine.allowDeferred = true;
    this.creditEngine.allowInstallments = true;
  } else if (this.creditEngine.score >= 30) {
    this.creditEngine.riskLevel = 'high';
    this.creditEngine.maxInstallments = 3;
    this.creditEngine.allowDeferred = false;
    this.creditEngine.allowInstallments = true;
  } else {
    this.creditEngine.riskLevel = 'blocked';
    this.creditEngine.maxInstallments = 0;
    this.creditEngine.allowDeferred = false;
    this.creditEngine.allowInstallments = false;
  }

  this.creditEngine.lastAssessment = new Date();
  return this;
};

// Instance: Record payment with behavior tracking
customerSchema.methods.recordPaymentWithBehavior = function (amount, daysLate = 0) {
  this.financials.totalPaid += amount;
  this.financials.outstandingBalance = Math.max(
    0,
    this.financials.totalPurchases - this.financials.totalPaid
  );
  this.lastPaymentDate = new Date();

  // Update payment behavior
  this.paymentBehavior.totalPayments += 1;
  if (daysLate <= 0) {
    this.paymentBehavior.onTimePayments += 1;
    this.paymentBehavior.currentStreak += 1;
    if (this.paymentBehavior.currentStreak > this.paymentBehavior.longestStreak) {
      this.paymentBehavior.longestStreak = this.paymentBehavior.currentStreak;
    }
    this.addPoints(GAMIFICATION.POINTS_PER_ON_TIME);
  } else {
    this.paymentBehavior.latePayments += 1;
    this.paymentBehavior.currentStreak = 0;
    // Update average days late
    const totalLate = this.paymentBehavior.avgDaysLate * (this.paymentBehavior.latePayments - 1) + daysLate;
    this.paymentBehavior.avgDaysLate = Math.round(totalLate / this.paymentBehavior.latePayments);
  }

  // Recalculate credit score
  this.calculateCreditScore();

  return this;
};

// Instance: Block sales
customerSchema.methods.blockSales = function (reason) {
  this.salesBlocked = true;
  this.salesBlockedReason = reason;
  this.salesBlockedAt = new Date();
  return this;
};

// Instance: Unblock sales
customerSchema.methods.unblockSales = function () {
  this.salesBlocked = false;
  this.salesBlockedReason = undefined;
  this.salesBlockedAt = undefined;
  return this;
};

// Static: Get Aging Report
customerSchema.statics.getAgingReport = async function (tenantId) {
  const Invoice = require('./Invoice');
  const customers = await this.find({
    tenant: tenantId,
    isActive: true,
    'financials.outstandingBalance': { $gt: 0 },
  }).lean();

  const today = new Date();
  const result = { current: [], days30: [], days60: [], days90: [], days90Plus: [] };

  for (const customer of customers) {
    const invoices = await Invoice.find({
      customer: customer._id,
      remainingAmount: { $gt: 0 },
    }).lean();

    let oldest = null;
    for (const inv of invoices) {
      if (!oldest || inv.createdAt < oldest) oldest = inv.createdAt;
    }

    if (!oldest) continue;

    const daysOld = Math.floor((today - new Date(oldest)) / (1000 * 60 * 60 * 24));
    const entry = {
      _id: customer._id,
      name: customer.name,
      phone: customer.phone,
      tier: customer.tier,
      outstanding: customer.financials.outstandingBalance,
      daysOld,
      creditScore: customer.creditEngine?.score || 100,
      riskLevel: customer.creditEngine?.riskLevel || 'low',
    };

    if (daysOld <= 0) result.current.push(entry);
    else if (daysOld <= 30) result.days30.push(entry);
    else if (daysOld <= 60) result.days60.push(entry);
    else if (daysOld <= 90) result.days90.push(entry);
    else result.days90Plus.push(entry);
  }

  return {
    ...result,
    summary: {
      current: result.current.reduce((s, c) => s + c.outstanding, 0),
      days30: result.days30.reduce((s, c) => s + c.outstanding, 0),
      days60: result.days60.reduce((s, c) => s + c.outstanding, 0),
      days90: result.days90.reduce((s, c) => s + c.outstanding, 0),
      days90Plus: result.days90Plus.reduce((s, c) => s + c.outstanding, 0),
      totalCustomers: customers.length,
      totalOutstanding: customers.reduce((s, c) => s + c.financials.outstandingBalance, 0),
    },
  };
};

module.exports = mongoose.model('Customer', customerSchema);
