const mongoose = require('mongoose');

const cashShiftSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    branch: { // Optional if tenant has multiple branches, useful for filtering
      type: mongoose.Schema.Types.Mixed, 
    },
    user: { // The user who opened the shift
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    openingBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    totalCashSales: { // System calculated
      type: Number,
      default: 0,
    },
    expectedCash: { // opening + sales
      type: Number,
      default: 0,
    },
    actualCash: { // Counted by user
      type: Number,
    },
    variance: { // actual - expected
      type: Number,
    },
    notes: {
      type: String,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CashShift', cashShiftSchema);
