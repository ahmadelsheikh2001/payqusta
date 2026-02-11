/**
 * Supplier Model — Vendor's Suppliers with Payment Tracking
 * Manages supplier products, payment terms, and WhatsApp reminders
 */

const mongoose = require('mongoose');
const { SUPPLIER_PAYMENT_TERMS } = require('../config/constants');

const supplierPaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  paidDate: { type: Date },
  paidAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'partially_paid'],
    default: 'pending',
  },
  notes: { type: String },
  reminderSent: { type: Boolean, default: false },
});

const supplierSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'اسم المورد مطلوب'],
      trim: true,
      maxlength: 100,
    },
    contactPerson: { type: String, trim: true },
    phone: {
      type: String,
      required: [true, 'رقم هاتف المورد مطلوب'],
      trim: true,
    },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    // Payment terms
    paymentTerms: {
      type: String,
      enum: Object.values(SUPPLIER_PAYMENT_TERMS),
      default: SUPPLIER_PAYMENT_TERMS.CASH,
    },
    // Financial tracking
    financials: {
      totalPurchases: { type: Number, default: 0 },
      totalPaid: { type: Number, default: 0 },
      outstandingBalance: { type: Number, default: 0 },
    },
    // Payment schedule for deferred/installment payments
    payments: [supplierPaymentSchema],
    // WhatsApp reminder settings
    whatsappReminder: {
      enabled: { type: Boolean, default: true },
      reminderDaysBefore: { type: Number, default: 1 }, // تذكير قبل الميعاد بيوم
    },
    // Products supplied
    productsCount: { type: Number, default: 0 },
    notes: { type: String, maxlength: 2000 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
supplierSchema.index({ tenant: 1, name: 1 });
supplierSchema.index({ tenant: 1, phone: 1 }, { unique: true });
supplierSchema.index({ 'payments.dueDate': 1, 'payments.status': 1 });

// Instance: Add a purchase and create payment schedule
supplierSchema.methods.addPurchase = function (amount, paymentType = 'cash', installments = 1) {
  this.financials.totalPurchases += amount;

  if (paymentType === 'cash') {
    this.financials.totalPaid += amount;
  } else {
    this.financials.outstandingBalance += amount;

    // Create payment schedule
    const installmentAmount = Math.ceil(amount / installments);
    const now = new Date();

    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(now);

      // Determine due date based on payment terms
      switch (this.paymentTerms) {
        case 'deferred_15':
          dueDate.setDate(dueDate.getDate() + 15 * (i + 1));
          break;
        case 'deferred_30':
          dueDate.setMonth(dueDate.getMonth() + (i + 1));
          break;
        case 'deferred_45':
          dueDate.setDate(dueDate.getDate() + 45 * (i + 1));
          break;
        case 'deferred_60':
          dueDate.setDate(dueDate.getDate() + 60 * (i + 1));
          break;
        default:
          dueDate.setMonth(dueDate.getMonth() + (i + 1));
      }

      const amt = i === installments - 1
        ? amount - installmentAmount * (installments - 1)
        : installmentAmount;

      this.payments.push({
        amount: amt,
        dueDate,
        status: 'pending',
      });
    }
  }

  return this;
};

// Instance: Record a payment to supplier
supplierSchema.methods.recordPayment = function (paymentId, amount) {
  const payment = this.payments.id(paymentId);
  if (!payment) throw new Error('الدفعة غير موجودة');

  payment.paidAmount += amount;
  payment.paidDate = new Date();

  if (payment.paidAmount >= payment.amount) {
    payment.status = 'paid';
  } else {
    payment.status = 'partially_paid';
  }

  this.financials.totalPaid += amount;
  this.financials.outstandingBalance = Math.max(
    0,
    this.financials.totalPurchases - this.financials.totalPaid
  );

  return this;
};

// Instance: Pay all outstanding at once (سداد كل الدفعات مرة واحدة)
supplierSchema.methods.payAllOutstanding = function () {
  const totalOutstanding = this.financials.outstandingBalance;

  this.payments.forEach((payment) => {
    if (payment.status !== 'paid') {
      payment.paidAmount = payment.amount;
      payment.paidDate = new Date();
      payment.status = 'paid';
    }
  });

  this.financials.totalPaid += totalOutstanding;
  this.financials.outstandingBalance = 0;

  return { paidAmount: totalOutstanding };
};

// Static: Get suppliers with upcoming payments
supplierSchema.statics.getUpcomingPayments = function (tenantId, daysBefore = 1) {
  const today = new Date();
  const targetDate = new Date();
  targetDate.setDate(today.getDate() + daysBefore);

  return this.find({
    tenant: tenantId,
    isActive: true,
    'payments.status': { $in: ['pending', 'partially_paid'] },
    'payments.dueDate': { $lte: targetDate },
  }).select('name contactPerson phone payments financials');
};

module.exports = mongoose.model('Supplier', supplierSchema);
