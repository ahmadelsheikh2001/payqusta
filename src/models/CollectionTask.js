/**
 * Collection Task Model
 * Represents a single collection task assigned to a field collector
 */

const mongoose = require('mongoose');

const collectionTaskSchema = new mongoose.Schema({
  // Relations
  collector: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FieldCollector',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },

  // Task Details
  amount: {
    type: Number,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'visited', 'collected', 'skipped', 'failed'],
    default: 'pending',
    index: true
  },

  // GPS Location (Customer)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    },
    address: String
  },

  // Visit Information
  visitedAt: Date,
  visitDuration: Number, // seconds
  travelDistance: Number, // meters from previous location
  
  // Collection
  collectedAmount: Number,
  collectedAt: Date,
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'mobile_wallet']
  },
  
  // Digital Signature & Receipt
  signature: String, // base64 encoded
  receiptPhoto: String, // URL or base64
  
  // Notes & Reasons
  notes: String,
  skipReason: String,
  failureReason: String,

  // Route Reference
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  },
  routeOrder: Number, // Position in the route

  // Metadata
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: Date,

  // Offline Support
  syncedAt: Date,
  localId: String, // For offline tracking
}, {
  timestamps: true
});

// Indexes
collectionTaskSchema.index({ collector: 1, status: 1, dueDate: 1 });
collectionTaskSchema.index({ customer: 1 });
collectionTaskSchema.index({ tenant: 1, createdAt: -1 });
collectionTaskSchema.index({ location: '2dsphere' });

// Mark as visited
collectionTaskSchema.methods.markVisited = function() {
  this.status = 'visited';
  this.visitedAt = new Date();
  return this.save();
};

// Mark as collected
collectionTaskSchema.methods.markCollected = function(amount, method, signature = null, photo = null) {
  this.status = 'collected';
  this.collectedAmount = amount;
  this.collectedAt = new Date();
  this.paymentMethod = method;
  
  if (signature) this.signature = signature;
  if (photo) this.receiptPhoto = photo;
  
  return this.save();
};

// Mark as skipped
collectionTaskSchema.methods.skip = function(reason) {
  this.status = 'skipped';
  this.skipReason = reason;
  this.visitedAt = new Date();
  return this.save();
};

// Mark as failed
collectionTaskSchema.methods.fail = function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  this.visitedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('CollectionTask', collectionTaskSchema);
