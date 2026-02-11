/**
 * Expense Model — Business Expense Tracking
 * Track all business expenses for real profit calculation
 */

const mongoose = require('mongoose');

const EXPENSE_CATEGORIES = {
  RENT: 'rent',           // إيجار
  SALARIES: 'salaries',   // رواتب
  UTILITIES: 'utilities', // كهرباء/ماء/غاز
  SUPPLIES: 'supplies',   // مستلزمات
  MARKETING: 'marketing', // تسويق
  TRANSPORT: 'transport', // نقل/مواصلات
  MAINTENANCE: 'maintenance', // صيانة
  OTHER: 'other',         // أخرى
};

const EXPENSE_FREQUENCIES = {
  ONCE: 'once',           // مرة واحدة
  DAILY: 'daily',         // يومي
  WEEKLY: 'weekly',       // أسبوعي
  MONTHLY: 'monthly',     // شهري
  YEARLY: 'yearly',       // سنوي
};

const expenseSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'عنوان المصروف مطلوب'],
      trim: true,
      maxlength: 200,
    },
    description: { type: String, maxlength: 500 },
    category: {
      type: String,
      enum: Object.values(EXPENSE_CATEGORIES),
      default: EXPENSE_CATEGORIES.OTHER,
    },
    amount: {
      type: Number,
      required: [true, 'مبلغ المصروف مطلوب'],
      min: [0, 'المبلغ لا يمكن أن يكون سالباً'],
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    frequency: {
      type: String,
      enum: Object.values(EXPENSE_FREQUENCIES),
      default: EXPENSE_FREQUENCIES.ONCE,
    },
    // For recurring expenses
    isRecurring: { type: Boolean, default: false },
    nextDueDate: { type: Date },
    // Payment info
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank', 'card', 'other'],
      default: 'cash',
    },
    reference: { type: String }, // رقم الإيصال أو المرجع
    // Attachments
    attachments: [{ type: String }],
    // Status
    isPaid: { type: Boolean, default: true },
    // Created by
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
expenseSchema.index({ tenant: 1, date: -1 });
expenseSchema.index({ tenant: 1, category: 1 });
expenseSchema.index({ tenant: 1, isRecurring: 1, nextDueDate: 1 });

// Static: Get expenses summary for a period
expenseSchema.statics.getSummary = async function (tenantId, startDate, endDate) {
  const matchStage = {
    tenant: new mongoose.Types.ObjectId(tenantId),
    isActive: true,
    date: { $gte: startDate, $lte: endDate },
  };

  const [byCategory, total, monthly] = await Promise.all([
    // By category
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    // Total
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    // Monthly trend
    this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    byCategory,
    total: total[0]?.total || 0,
    count: total[0]?.count || 0,
    monthly,
  };
};

// Static: Get recurring expenses due
expenseSchema.statics.getRecurringDue = function (tenantId) {
  const today = new Date();
  return this.find({
    tenant: tenantId,
    isActive: true,
    isRecurring: true,
    nextDueDate: { $lte: today },
  });
};

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
module.exports.EXPENSE_FREQUENCIES = EXPENSE_FREQUENCIES;
