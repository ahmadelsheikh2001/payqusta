/**
 * AuditLog Model — Security & Compliance
 * Tracks all sensitive operations for audit purposes
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resource: {
      type: String,
      required: true, // e.g., 'product', 'invoice', 'customer'
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: mongoose.Schema.Types.Mixed, // Flexible JSON for details
    },
    // Changes tracking
    changes: {
      before: { type: mongoose.Schema.Types.Mixed },
      after: { type: mongoose.Schema.Types.Mixed },
    },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
auditLogSchema.index({ tenant: 1, createdAt: -1 });
auditLogSchema.index({ tenant: 1, user: 1 });
auditLogSchema.index({ tenant: 1, resource: 1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // TTL: 1 year

// Static: Log an action
auditLogSchema.statics.log = function ({
  tenant, user, action, resource, resourceId, details, changes, ipAddress, userAgent,
}) {
  return this.create({
    tenant, user, action, resource, resourceId, details, changes, ipAddress, userAgent,
  });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
