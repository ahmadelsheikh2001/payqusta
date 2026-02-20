/**
 * Branch Model — Multi-Branch Support
 * Each Tenant can have multiple branches (فروع)
 */

const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم الفرع مطلوب'],
      trim: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // CCTV Cameras for this branch
    cameras: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String, enum: ['stream', 'embed'], default: 'stream' },
      }
    ],
    // Current Shift (Gamification & Shift Management)
    currentShift: {
      startTime: { type: Date, default: null },
      endTime: { type: Date, default: null },
      openingBalance: { type: Number, default: 0 },
      closingBalance: { type: Number, default: 0 },
      startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      endedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      notes: { type: String, default: '' },
    },
    // Settlement History
    settlementHistory: [
      {
        date: { type: Date, required: true },
        totalSales: { type: Number, default: 0 },
        cashSales: { type: Number, default: 0 },
        cardSales: { type: Number, default: 0 },
        creditSales: { type: Number, default: 0 },
        totalExpenses: { type: Number, default: 0 },
        netCash: { type: Number, default: 0 },
        cashInHand: { type: Number, default: 0 },
        expectedCash: { type: Number, default: 0 },
        variance: { type: Number, default: 0 },
        invoicesCount: { type: Number, default: 0 },
        settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notes: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
branchSchema.index({ tenant: 1, isActive: 1 });

module.exports = mongoose.model('Branch', branchSchema);
