/**
 * Coupon Model — Promo Codes & Discount Management
 */

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: [true, 'كود الخصم مطلوب'],
      trim: true,
      uppercase: true,
      maxlength: [30, 'الكود لا يتجاوز 30 حرف'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'الوصف لا يتجاوز 200 حرف'],
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    value: {
      type: Number,
      required: [true, 'قيمة الخصم مطلوبة'],
      min: [0, 'قيمة الخصم يجب أن تكون موجبة'],
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: null, // null = no cap on percentage discount
    },
    // Usage limits
    usageLimit: {
      type: Number,
      default: null, // null = unlimited
    },
    usagePerCustomer: {
      type: Number,
      default: 1,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    // Validity
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Restrictions
    applicableProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    }],
    applicableCustomers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    }],
    // Usage tracking
    usages: [{
      customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
      invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
      discountAmount: Number,
      usedAt: { type: Date, default: Date.now },
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Unique code per tenant
couponSchema.index({ tenant: 1, code: 1 }, { unique: true });
couponSchema.index({ tenant: 1, isActive: 1, endDate: 1 });

/**
 * Check if coupon is currently valid
 */
couponSchema.methods.isValid = function () {
  if (!this.isActive) return { valid: false, reason: 'الكوبون غير نشط' };

  const now = new Date();
  if (this.startDate && now < this.startDate) return { valid: false, reason: 'الكوبون لم يبدأ بعد' };
  if (this.endDate && now > this.endDate) return { valid: false, reason: 'انتهت صلاحية الكوبون' };
  if (this.usageLimit !== null && this.usageCount >= this.usageLimit) {
    return { valid: false, reason: 'تم استنفاد عدد مرات استخدام الكوبون' };
  }

  return { valid: true };
};

/**
 * Calculate discount amount for a given order total
 */
couponSchema.methods.calculateDiscount = function (orderTotal) {
  if (orderTotal < this.minOrderAmount) return 0;

  let discount = 0;
  if (this.type === 'percentage') {
    discount = (orderTotal * this.value) / 100;
    if (this.maxDiscountAmount !== null) {
      discount = Math.min(discount, this.maxDiscountAmount);
    }
  } else {
    discount = this.value;
  }

  return Math.min(discount, orderTotal); // Can't discount more than order total
};

module.exports = mongoose.model('Coupon', couponSchema);
