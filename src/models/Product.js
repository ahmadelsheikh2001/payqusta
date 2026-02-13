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

// Post-findOneAndUpdate: Sync stockStatus when stock is modified via update queries
productSchema.post('findOneAndUpdate', async function (doc) {
  if (!doc) return;
  let newStatus;
  if (doc.stock.quantity <= 0) {
    newStatus = STOCK_STATUS.OUT_OF_STOCK;
  } else if (doc.stock.quantity <= doc.stock.minQuantity) {
    newStatus = STOCK_STATUS.LOW_STOCK;
  } else {
    newStatus = STOCK_STATUS.IN_STOCK;
  }
  if (doc.stockStatus !== newStatus) {
    doc.stockStatus = newStatus;
    if (newStatus === STOCK_STATUS.IN_STOCK) {
      doc.lowStockAlertSent = false;
      doc.outOfStockAlertSent = false;
    }
    await doc.save();
  }
});

// Static: Find low stock products for a tenant (uses aggregation for reliable field-to-field comparison)
productSchema.statics.findLowStock = async function (tenantId) {
  // Step 1: Aggregation pipeline to find products where quantity <= minQuantity
  const matched = await this.aggregate([
    {
      $match: {
        tenant: new mongoose.Types.ObjectId(tenantId),
        isActive: true,
      },
    },
    {
      $match: {
        $expr: { $lte: ['$stock.quantity', '$stock.minQuantity'] },
      },
    },
    { $project: { _id: 1 } },
  ]);

  if (matched.length === 0) return [];

  // Step 2: Fetch as Mongoose documents with populate (needed for .save() in StockMonitorJob)
  return this.find({ _id: { $in: matched.map((p) => p._id) } })
    .populate('supplier', 'name contactPerson phone');
};

// Static: Get stock summary for a tenant (compute status from actual quantities)
productSchema.statics.getStockSummary = async function (tenantId) {
  const result = await this.aggregate([
    { $match: { tenant: new mongoose.Types.ObjectId(tenantId), isActive: true } },
    {
      $addFields: {
        computedStatus: {
          $cond: {
            if: { $lte: ['$stock.quantity', 0] },
            then: 'out_of_stock',
            else: {
              $cond: {
                if: { $lte: ['$stock.quantity', '$stock.minQuantity'] },
                then: 'low_stock',
                else: 'in_stock',
              },
            },
          },
        },
      },
    },
    {
      $group: {
        _id: '$computedStatus',
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
