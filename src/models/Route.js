/**
 * Route Model
 * Represents a collector's daily route with optimization
 */

const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  // Relations
  collector: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FieldCollector',
    required: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },

  // Route Details
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Tasks in route
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollectionTask'
  }],
  
  // Optimized order (task IDs in optimal sequence)
  optimizedOrder: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollectionTask'
  }],

  // Route Planning
  startLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number], // [longitude, latitude]
    address: String
  },
  
  endLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number],
    address: String
  },

  // Estimates
  totalDistance: Number, // meters
  estimatedDuration: Number, // minutes

  // Status
  status: {
    type: String,
    enum: ['planned', 'in-progress', 'completed', 'cancelled'],
    default: 'planned',
    index: true
  },

  // Actual tracking
  actualPath: [{
    coordinates: [Number], // [lng, lat]
    timestamp: Date,
    accuracy: Number // meters
  }],

  startedAt: Date,
  completedAt: Date,

  // Statistics
  stats: {
    totalCollected: {
      type: Number,
      default: 0
    },
    totalTasks: {
      type: Number,
      default: 0
    },
    completedTasks: {
      type: Number,
      default: 0
    },
    skippedTasks: {
      type: Number,
      default: 0
    },
    failedTasks: {
      type: Number,
      default: 0
    },
    actualDistance: {
      type: Number,
      default: 0
    },
    actualDuration: {
      type: Number,
      default: 0
    }
  },

  // Metadata
  optimizedBy: String, // Algorithm used
  optimizedAt: Date,
  notes: String
}, {
  timestamps: true
});

// Indexes
routeSchema.index({ collector: 1, date: -1 });
routeSchema.index({ tenant: 1, status: 1 });

// Start route
routeSchema.methods.start = function() {
  this.status = 'in-progress';
  this.startedAt = new Date();
  return this.save();
};

// Complete route
routeSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  
  // Calculate duration
  if (this.startedAt) {
    this.stats.actualDuration = Math.floor((this.completedAt - this.startedAt) / 60000); // minutes
  }
  
  return this.save();
};

// Add GPS point
routeSchema.methods.addGPSPoint = function(lng, lat, accuracy = null) {
  this.actualPath.push({
    coordinates: [lng, lat],
    timestamp: new Date(),
    accuracy: accuracy
  });
  
  // Calculate distance if we have previous point
  if (this.actualPath.length > 1) {
    const prev = this.actualPath[this.actualPath.length - 2];
    const distance = calculateDistance(
      prev.coordinates[1], prev.coordinates[0],
      lat, lng
    );
    this.stats.actualDistance += distance;
  }
  
  return this.save();
};

// Helper: Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

module.exports = mongoose.model('Route', routeSchema);
