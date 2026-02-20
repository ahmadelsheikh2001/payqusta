const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema(
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
      index: true,
    },
    subject: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ['inquiry', 'complaint', 'suggestion', 'other'],
      default: 'inquiry',
    },
    status: {
      type: String,
      enum: ['open', 'replied', 'closed'],
      default: 'open',
      index: true,
    },
    replies: [
      {
        message: { type: String, required: true, maxlength: 2000 },
        sender: { type: String, enum: ['vendor', 'customer'], required: true },
        senderName: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    closedAt: { type: Date },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

supportMessageSchema.index({ tenant: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('SupportMessage', supportMessageSchema);
