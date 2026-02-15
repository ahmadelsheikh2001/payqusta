/**
 * Role Model — Custom Roles with Granular Permissions
 */

const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم الدور مطلوب'],
      trim: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    isSystem: {
      type: Boolean,
      default: false, // System roles cannot be edited/deleted
    },
    permissions: [
      {
        resource: {
          type: String,
          required: true,
          enum: [
            'products',
            'customers',
            'suppliers',
            'invoices',
            'expenses',
            'reports',
            'settings',
            'users',
            'stock_adjustments',
            'cash_shifts',
          ],
        },
        actions: {
          type: [String],
          enum: ['create', 'read', 'update', 'delete'],
          default: [],
        },
      },
    ],
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index
roleSchema.index({ tenant: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);
