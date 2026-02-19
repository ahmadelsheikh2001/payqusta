/**
 * Field Collector Model
 * Represents a field collector user with their stats
 */

const mongoose = require('mongoose');

const fieldCollectorSchema = new mongoose.Schema({
  // Relations
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },

  // Collector Info
  isActive: {
    type: Boolean,
    default: true
  },
  assignedRegions: [{
    type: String, // e.g., 'Downtown', 'West Side'
  }],
  
  // Targets
  dailyTarget: {
    type: Number,
    default: 0
  },
  monthlyTarget: {
    type: Number,
    default: 0
  },

  // Statistics
  stats: {
    totalCollected: {
      type: Number,
      default: 0
    },
    totalVisits: {
      type: Number,
      default: 0
    },
    successfulVisits: {
      type: Number,
      default: 0
    },
    failedVisits: {
      type: Number,
      default: 0
    },
    totalDistance: {
      type: Number,
      default: 0 // in meters
    },
    avgCollectionTime: {
      type: Number,
      default: 0 // in minutes
    },
    lastActive: Date
  },

  // Current Route
  currentRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  },

  // Settings
  settings: {
    autoOptimizeRoute: {
      type: Boolean,
      default: true
    },
    gpsTrackingEnabled: {
      type: Boolean,
      default: true
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Indexes
fieldCollectorSchema.index({ tenant: 1, isActive: 1 });
fieldCollectorSchema.index({ user: 1 });

// Virtual: Success Rate
fieldCollectorSchema.virtual('successRate').get(function() {
  if (this.stats.totalVisits === 0) return 0;
  return ((this.stats.successfulVisits / this.stats.totalVisits) * 100).toFixed(2);
});

// Virtual: Today's Performance
fieldCollectorSchema.methods.getTodayPerformance = async function() {
  const CollectionTask = mongoose.model('CollectionTask');
  
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const tasks = await CollectionTask.find({
    collector: this._id,
    createdAt: { $gte: startOfDay }
  });

  const collected = tasks.filter(t => t.status === 'collected')
    .reduce((sum, t) => sum + t.collectedAmount, 0);
  
  return {
    tasksAssigned: tasks.length,
    tasksCompleted: tasks.filter(t => t.status === 'collected').length,
    amountCollected: collected,
    targetProgress: this.dailyTarget > 0 ? ((collected / this.dailyTarget) * 100).toFixed(1) : 0
  };
};

// Ensure virtuals are included
fieldCollectorSchema.set('toJSON', { virtuals: true });
fieldCollectorSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('FieldCollector', fieldCollectorSchema);
