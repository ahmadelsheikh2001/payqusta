/**
 * Payment Transaction Model
 * Stores all payment transactions across different gateways
 */

const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  // Relations
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: [true, 'الفاتورة مطلوبة']
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'العميل مطلوب']
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Transaction Details
  transactionId: {
    type: String,
    unique: true,
    required: [true, 'رقم المعاملة مطلوب']
  },
  gateway: {
    type: String,
    enum: ['paymob', 'fawry', 'vodafone', 'instapay'],
    required: [true, 'بوابة الدفع مطلوبة']
  },
  gatewayTransactionId: {
    type: String, // ID from the payment gateway
    index: true
  },

  // Amount Details
  amount: {
    type: Number,
    required: [true, 'المبلغ مطلوب'],
    min: [0, 'المبلغ يجب أن يكون موجباً']
  },
  fees: {
    type: Number,
    default: 0,
    min: [0, 'الرسوم يجب أن تكون موجبة']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'الخصم يجب أن يكون موجباً']
  },
  netAmount: {
    type: Number,
    required: true // amount - discount + fees
  },
  currency: {
    type: String,
    default: 'EGP'
  },

  // Payment Method
  paymentMethod: {
    type: String,
    enum: ['card', 'wallet', 'cash', 'bank_transfer'],
    default: 'card'
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed', 'refunded', 'expired'],
    default: 'pending',
    index: true
  },

  // Payment Link
  paymentLink: String,
  linkExpiresAt: Date,

  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  expiredAt: Date,

  // Gateway Response Data
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed,
    select: false // Don't return by default
  },

  // Webhook Data
  webhookReceived: {
    type: Boolean,
    default: false
  },
  webhookData: {
    type: mongoose.Schema.Types.Mixed,
    select: false
  },

  // Customer Info (for Fawry reference)
  customerPhone: String,
  customerEmail: String,

  // Refund Info
  refundReason: String,
  refundedAt: Date,
  refundedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Notes
  notes: String,

  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: { type: String, enum: ['web', 'mobile', 'whatsapp'], default: 'web' }
  }
}, {
  timestamps: true
});

// Indexes
paymentTransactionSchema.index({ tenant: 1, status: 1 });
paymentTransactionSchema.index({ tenant: 1, gateway: 1 });
paymentTransactionSchema.index({ tenant: 1, createdAt: -1 });
paymentTransactionSchema.index({ customer: 1, createdAt: -1 });

// Generate transaction ID before saving
paymentTransactionSchema.pre('save', function(next) {
  if (!this.transactionId) {
    this.transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  
  // Calculate net amount
  if (this.isModified('amount') || this.isModified('fees') || this.isModified('discount')) {
    this.netAmount = this.amount - this.discount + this.fees;
  }
  
  next();
});

// Mark transaction as completed
paymentTransactionSchema.methods.markAsSuccess = function(gatewayData = {}) {
  this.status = 'success';
  this.completedAt = new Date();
  this.gatewayResponse = gatewayData;
  this.webhookReceived = true;
  return this.save();
};

// Mark transaction as failed
paymentTransactionSchema.methods.markAsFailed = function(reason, gatewayData = {}) {
  this.status = 'failed';
  this.notes = reason;
  this.gatewayResponse = gatewayData;
  return this.save();
};

// Refund transaction
paymentTransactionSchema.methods.refund = async function(userId, reason) {
  this.status = 'refunded';
  this.refundedAt = new Date();
  this.refundedBy = userId;
  this.refundReason = reason;
  return this.save();
};

// Virtual for fees percentage
paymentTransactionSchema.virtual('feesPercentage').get(function() {
  if (this.amount === 0) return 0;
  return ((this.fees / this.amount) * 100).toFixed(2);
});

// Ensure virtuals are included in JSON
paymentTransactionSchema.set('toJSON', { virtuals: true });
paymentTransactionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
