/**
 * Review Model — Customer Product/Store Reviews & Ratings
 */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
    },
    type: {
      type: String,
      enum: ['product', 'store', 'service'],
      default: 'store',
    },
    rating: {
      type: Number,
      required: [true, 'التقييم مطلوب'],
      min: [1, 'الحد الأدنى للتقييم 1'],
      max: [5, 'الحد الأقصى للتقييم 5'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'العنوان لا يتجاوز 100 حرف'],
    },
    body: {
      type: String,
      trim: true,
      maxlength: [2000, 'المراجعة لا تتجاوز 2000 حرف'],
    },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    // Vendor reply
    reply: {
      body: { type: String, trim: true },
      repliedAt: { type: Date },
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    helpfulCount: { type: Number, default: 0 },
    helpfulVoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
    isVerifiedPurchase: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index: one review per customer per product per tenant
reviewSchema.index({ tenant: 1, customer: 1, product: 1 }, { unique: true, sparse: true });
reviewSchema.index({ tenant: 1, product: 1, status: 1 });
reviewSchema.index({ tenant: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
