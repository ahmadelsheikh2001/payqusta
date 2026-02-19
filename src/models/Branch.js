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
