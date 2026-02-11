/**
 * Product Model — Inventory & Stock Management
 * Multi-tenant product catalog with low-stock alerts
 */

const mongoose = require('mongoose');
const { STOCK_STATUS } = require('../config/constants');

const productSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'اسم المنتج مطلوب'],
      trim: true,
      maxlength: [200, 'اسم المنتج لا يتجاوز 200 حرف'],
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
    description: { type: String, maxlength: 2000 },
    category: {
      type: String,
      required: [true, 'فئة المنتج مطلوبة'],
      trim: true,
    },
    // Pricing (no tax — as per BRD)
    price: {
      type: Number,
      required: [true, 'سعر البيع مطلوب'],
      min: [0, 'السعر لا يمكن أن يكون سالباً'],
    },
    cost: {
      type: Number,
      required: [true, 'سعر التكلفة مطلوب'],
      min: [0, 'التكلفة لا يمكن أن تكون سالبة'],
    },
    // Stock
    stock: {
      quantity: { type: Number, default: 0, min: 0 },
      minQuantity: { type: Number, default: 5, min: 0 },
      unit: { type: String, default: 'قطعة' },
    },
    stockStatus: {
      type: String,
      enum: Object.values(STOCK_STATUS),
      default: STOCK_STATUS.IN_STOCK,
    },
    // Supplier link
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    // Media
    images: [{ type: String }],
    thumbnail: { type: String },
    // Metadata
    barcode: { type: String },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    // Stock alerts
    lowStockAlertSent: { type: Boolean, default: false },
    outOfStockAlertSent: { type: Boolean, default: false },
    // Auto-restock
    autoRestock: {
      enabled: { type: Boolean, default: false },
      quantity: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
productSchema.index({ tenant: 1, sku: 1 }, { unique: true, sparse: true });
productSchema.index({ tenant: 1, name: 'text', description: 'text' });
productSchema.index({ tenant: 1, category: 1 });
productSchema.index({ tenant: 1, stockStatus: 1 });
productSchema.index({ tenant: 1, supplier: 1 });

// Virtual: profit margin
productSchema.virtual('profitMargin').get(function () {
  if (this.cost === 0) return 100;
  return (((this.price - this.cost) / this.cost) * 100).toFixed(1);
});

// Virtual: profit per unit
productSchema.virtual('profitPerUnit').get(function () {
  return this.price - this.cost;
});

// Pre-save: Update stock status
productSchema.pre('save', function (next) {
  if (this.isModified('stock.quantity') || this.isModified('stock.minQuantity')) {
    if (this.stock.quantity <= 0) {
      this.stockStatus = STOCK_STATUS.OUT_OF_STOCK;
    } else if (this.stock.quantity <= this.stock.minQuantity) {
      this.stockStatus = STOCK_STATUS.LOW_STOCK;
    } else {
      this.stockStatus = STOCK_STATUS.IN_STOCK;
      this.lowStockAlertSent = false;
      this.outOfStockAlertSent = false;
    }
  }
  next();
});

// Static: Find low stock products for a tenant
productSchema.statics.findLowStock = function (tenantId) {
  return this.find({
    tenant: tenantId,
    isActive: true,
    $or: [
      { stockStatus: STOCK_STATUS.LOW_STOCK },
      { stockStatus: STOCK_STATUS.OUT_OF_STOCK },
    ],
  }).populate('supplier', 'name contactPerson phone');
};

// Static: Get stock summary for a tenant
productSchema.statics.getStockSummary = async function (tenantId) {
  const result = await this.aggregate([
    { $match: { tenant: new mongoose.Types.ObjectId(tenantId), isActive: true } },
    {
      $group: {
        _id: '$stockStatus',
        count: { $sum: 1 },
        totalValue: { $sum: { $multiply: ['$stock.quantity', '$cost'] } },
      },
    },
  ]);

  const summary = { inStock: 0, lowStock: 0, outOfStock: 0, totalValue: 0 };
  result.forEach((item) => {
    if (item._id === 'in_stock') { summary.inStock = item.count; summary.totalValue += item.totalValue; }
    if (item._id === 'low_stock') { summary.lowStock = item.count; summary.totalValue += item.totalValue; }
    if (item._id === 'out_of_stock') summary.outOfStock = item.count;
  });

  return summary;
};

module.exports = mongoose.model('Product', productSchema);
