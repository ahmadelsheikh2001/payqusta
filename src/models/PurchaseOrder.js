/**
 * PurchaseOrder Model — Supplier Order Management
 */

const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'received', 'cancelled'],
      default: 'draft',
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        variantId: mongoose.Schema.Types.ObjectId, // If product has variants
        quantity: { type: Number, required: true, min: 1 },
        unitCost: { type: Number, required: true, min: 0 },
        totalCost: { type: Number, required: true, min: 0 },
        receivedQuantity: { type: Number, default: 0, min: 0 },
      },
    ],
    totalAmount: { type: Number, required: true, default: 0 },
    notes: { type: String },
    expectedDeliveryDate: { type: Date },
    receivedDate: { type: Date },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index
purchaseOrderSchema.index({ tenant: 1, orderNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ tenant: 1, supplier: 1 });
purchaseOrderSchema.index({ tenant: 1, status: 1 });

// Auto-generate order number
purchaseOrderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderNumber) {
    const count = await this.constructor.countDocuments({ tenant: this.tenant });
    this.orderNumber = `PO-${Date.now()}-${count + 1}`;
  }
  
  // Calculate total
  this.totalAmount = this.items.reduce((sum, item) => sum + item.totalCost, 0);
  
  next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
