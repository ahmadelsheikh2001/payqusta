/**
 * Route Optimization Service
 * Optimizes collection routes using various algorithms
 */

const CollectionTask = require('../models/CollectionTask');
const Route = require('../models/Route');

class RouteOptimizationService {
  /**
   * Optimize route using Nearest Neighbor algorithm
   * @param {Array} tasks - Collection tasks with location data
   * @param {Object} startLocation - Starting coordinates {lat, lng}
   * @returns {Array} Optimized task order
   */
  static nearestNeighbor(tasks, startLocation) {
    if (!tasks || tasks.length === 0) return [];
    
    const optimized = [];
    const remaining = [...tasks];
    let current = startLocation;

    while (remaining.length > 0) {
      // Find nearest customer
      let nearest = null;
      let minDistance = Infinity;

      remaining.forEach(task => {
        if (!task.location || !task.location.coordinates) return;
        
        const [lng, lat] = task.location.coordinates;
        const distance = this.calculateDistance(
          current.lat, current.lng,
          lat, lng
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearest = task;
        }
      });

      if (nearest) {
        optimized.push(nearest);
        const [lng, lat] = nearest.location.coordinates;
        current = { lat, lng };
        remaining.splice(remaining.indexOf(nearest), 1);
      } else {
        // Skip tasks without location
        break;
      }
    }

    return optimized;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @returns {Number} Distance in meters
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Create optimized route for a collector
   */
  static async createOptimizedRoute(collectorId, tasks, startLocation) {
    // Optimize task order
    const optimizedTasks = this.nearestNeighbor(tasks, startLocation);
    
    // Calculate total distance and duration
    let totalDistance = 0;
    let estimatedDuration = 0;
    let current = startLocation;

    optimizedTasks.forEach(task => {
      if (task.location && task.location.coordinates) {
        const [lng, lat] = task.location.coordinates;
        const distance = this.calculateDistance(
          current.lat, current.lng,
          lat, lng
        );
        
        totalDistance += distance;
        // Estimate: 30 km/h avg speed + 10 min per visit
        estimatedDuration += (distance / 500) + 10; // minutes
        
        current = { lat, lng };
      }
    });

    // Create route
    const route = new Route({
      collector: collectorId,
      tenant: tasks[0]?.tenant,
      date: new Date(),
      tasks: tasks.map(t => t._id),
      optimizedOrder: optimizedTasks.map(t => t._id),
      startLocation: {
        type: 'Point',
        coordinates: [startLocation.lng, startLocation.lat],
        address: startLocation.address || 'نقطة البداية'
      },
      totalDistance: Math.round(totalDistance),
      estimatedDuration: Math.round(estimatedDuration),
      optimizedBy: 'nearest-neighbor',
      optimizedAt: new Date(),
      stats: {
        totalTasks: tasks.length
      }
    });

    await route.save();

    // Update tasks with route reference
    await CollectionTask.updateMany(
      { _id: { $in: tasks.map(t => t._id) } },
      { 
        $set: { 
          route: route._id,
          status: 'assigned'
        }
      }
    );

    return route;
  }

  /**
   * Get today's route for a collector
   */
  static async getTodayRoute(collectorId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return Route.findOne({
      collector: collectorId,
      date: { $gte: startOfDay, $lte: endOfDay }
    })
    .populate({
      path: 'tasks',
      populate: { path: 'customer' }
    })
    .populate('collector');
  }

  /**
   * Update route statistics
   */
  static async updateRouteStats(routeId) {
    const route = await Route.findById(routeId).populate('tasks');
    
    if (!route) return null;

    const stats = {
      totalTasks: route.tasks.length,
      completedTasks: route.tasks.filter(t => t.status === 'collected').length,
      skippedTasks: route.tasks.filter(t => t.status === 'skipped').length,
      failedTasks: route.tasks.filter(t => t.status === 'failed').length,
      totalCollected: route.tasks
        .filter(t => t.status === 'collected')
        .reduce((sum, t) => sum + (t.collectedAmount || 0), 0)
    };

    route.stats = { ...route.stats, ...stats };
    await route.save();

    return route;
  }
}

module.exports = RouteOptimizationService;
