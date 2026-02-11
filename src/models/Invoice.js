/**
 * Invoice Model — Sales & Installment Management
 * Supports cash, deferred, and installment payments
 * NO TAX — as per BRD requirements
 */

const mongoose = require('mongoose');
const {
  INVOICE_STATUS, PAYMENT_METHODS, INSTALLMENT_STATUS,
  INSTALLMENT_FREQUENCIES
} = require('../config/constants');

// Invoice line item
const invoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: { type: String, required: true },
  sku: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true },
});

// Installment schedule item
const installmentSchema = new mongoose.Schema({
  installmentNumber: { type: Number, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: {
    type: String,
    enum: Object.values(INSTALLMENT_STATUS),
    default: INSTALLMENT_STATUS.PENDING,
  },
  paidAmount: { type: Number, default: 0 },
  paidDate: { type: Date },
  reminderSent: { type: Boolean, default: false },
  lastReminderDate: { type: Date },
});

// Payment record
const paymentRecordSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  method: { type: String, default: 'cash' },
  reference: { type: String },
  notes: { type: String },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

const invoiceSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'العميل مطلوب'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Items
    items: [invoiceItemSchema],
    // Totals (NO TAX)
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    // Payment
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      required: [true, 'طريقة الدفع مطلوبة'],
    },
    // Payment tracking
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    // Installment configuration
    installmentConfig: {
      numberOfInstallments: { type: Number, default: 0 },
      frequency: {
        type: String,
        enum: Object.values(INSTALLMENT_FREQUENCIES),
        default: INSTALLMENT_FREQUENCIES.MONTHLY,
      },
      downPayment: { type: Number, default: 0 },
      startDate: { type: Date },
    },
    // Installment schedule
    installments: [installmentSchema],
    // Payment history
    payments: [paymentRecordSchema],
    // Status
    status: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.PENDING,
    },
    // WhatsApp
    whatsappSent: { type: Boolean, default: false },
    whatsappSentAt: { type: Date },
    // Notes
    notes: { type: String, maxlength: 2000 },
    // Due date (for deferred payment)
    dueDate: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
invoiceSchema.index({ tenant: 1, invoiceNumber: 1 });
invoiceSchema.index({ tenant: 1, customer: 1 });
invoiceSchema.index({ tenant: 1, status: 1 });
invoiceSchema.index({ tenant: 1, createdAt: -1 });
invoiceSchema.index({ 'installments.dueDate': 1, 'installments.status': 1 });

// Pre-save: Calculate totals and status
invoiceSchema.pre('save', function (next) {
  // Calculate subtotal from items
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.totalAmount = this.subtotal - this.discount;
  }

  // Calculate remaining amount
  this.remainingAmount = Math.max(0, this.totalAmount - this.paidAmount);

  // Update status based on payments
  if (this.paidAmount >= this.totalAmount) {
    this.status = INVOICE_STATUS.PAID;
    this.remainingAmount = 0;
  } else if (this.paidAmount > 0) {
    this.status = INVOICE_STATUS.PARTIALLY_PAID;
  }

  // Check for overdue installments
  const now = new Date();
  if (this.installments && this.installments.length > 0) {
    this.installments.forEach((inst) => {
      if (inst.status === 'pending' && inst.dueDate < now) {
        inst.status = INSTALLMENT_STATUS.OVERDUE;
      }
    });

    const hasOverdue = this.installments.some((i) => i.status === 'overdue');
    if (hasOverdue && this.status !== INVOICE_STATUS.PAID) {
      this.status = INVOICE_STATUS.OVERDUE;
    }
  }

  next();
});

// Instance: Record a payment
invoiceSchema.methods.recordPayment = function (amount, method = 'cash', userId = null, reference = '') {
  this.paidAmount += amount;
  this.remainingAmount = Math.max(0, this.totalAmount - this.paidAmount);

  this.payments.push({
    amount,
    method,
    reference,
    recordedBy: userId,
    date: new Date(),
  });

  // Update status
  if (this.paidAmount >= this.totalAmount) {
    this.status = INVOICE_STATUS.PAID;
    // Mark all pending installments as paid
    this.installments.forEach((inst) => {
      if (inst.status !== 'paid') {
        inst.status = 'paid';
        inst.paidAmount = inst.amount;
        inst.paidDate = new Date();
      }
    });
  } else {
    this.status = INVOICE_STATUS.PARTIALLY_PAID;
  }

  // Apply payment to installments in order
  if (this.installments.length > 0) {
    let remaining = amount;
    for (const inst of this.installments) {
      if (remaining <= 0) break;
      if (inst.status === 'paid') continue;

      const due = inst.amount - inst.paidAmount;
      const payment = Math.min(remaining, due);
      inst.paidAmount += payment;
      remaining -= payment;

      if (inst.paidAmount >= inst.amount) {
        inst.status = 'paid';
        inst.paidDate = new Date();
      } else {
        inst.status = 'partially_paid';
      }
    }
  }

  return this;
};

// Instance: Pay all remaining at once (سداد كل المبلغ المتبقي)
invoiceSchema.methods.payAllRemaining = function (userId = null) {
  const remainingToPay = this.remainingAmount;
  return this.recordPayment(remainingToPay, 'cash', userId, 'سداد كامل');
};

// Static: Get overdue invoices for a tenant
invoiceSchema.statics.getOverdueInvoices = function (tenantId) {
  return this.find({
    tenant: tenantId,
    status: { $in: [INVOICE_STATUS.OVERDUE, INVOICE_STATUS.PARTIALLY_PAID] },
    remainingAmount: { $gt: 0 },
  })
    .populate('customer', 'name phone')
    .sort({ 'installments.dueDate': 1 });
};

// Static: Get upcoming installments
invoiceSchema.statics.getUpcomingInstallments = function (tenantId, daysBefore = 1) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + daysBefore);
  targetDate.setHours(23, 59, 59, 999);

  return this.find({
    tenant: tenantId,
    'installments.status': { $in: ['pending', 'overdue'] },
    'installments.dueDate': { $gte: today, $lte: targetDate },
  })
    .populate('customer', 'name phone whatsapp')
    .select('invoiceNumber customer totalAmount paidAmount remainingAmount installments');
};

// Static: Sales summary for dashboard
invoiceSchema.statics.getSalesSummary = async function (tenantId, period = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const result = await this.aggregate([
    {
      $match: {
        tenant: new mongoose.Types.ObjectId(tenantId),
        createdAt: { $gte: startDate },
        status: { $ne: INVOICE_STATUS.CANCELLED },
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$totalAmount' },
        totalPaid: { $sum: '$paidAmount' },
        totalOutstanding: { $sum: '$remainingAmount' },
        invoiceCount: { $sum: 1 },
        avgInvoiceValue: { $avg: '$totalAmount' },
      },
    },
  ]);

  return result[0] || {
    totalSales: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    invoiceCount: 0,
    avgInvoiceValue: 0,
  };
};

module.exports = mongoose.model('Invoice', invoiceSchema);
