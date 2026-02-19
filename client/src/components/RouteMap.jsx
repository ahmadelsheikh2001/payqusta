/**
 * Route Map Component
 * Displays collector route with customer markers
 */

import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, CheckCircle, Clock } from 'lucide-react';

const RouteMap = ({ route, tasks, onTaskClick }) => {
  const [mapCenter, setMapCenter] = useState({ lat: 30.0444, lng: 31.2357 }); // Cairo default

  useEffect(() => {
    // Calculate map center from tasks
    if (tasks && tasks.length > 0) {
      const validTasks = tasks.filter(t => t.location?.coordinates);
      if (validTasks.length > 0) {
        const avgLat = validTasks.reduce((sum, t) => sum + t.location.coordinates[1], 0) / validTasks.length;
        const avgLng = validTasks.reduce((sum, t) => sum + t.location.coordinates[0], 0) / validTasks.length;
        setMapCenter({ lat: avgLat, lng: avgLng });
      }
    }
  }, [tasks]);

  const openInGoogleMaps = (task) => {
    if (task.location?.coordinates) {
      const [lng, lat] = task.location.coordinates;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank');
    }
  };

  // Group tasks by status
  const pendingTasks = tasks?.filter(t => ['pending', 'assigned'].includes(t.status)) || [];
  const inProgressTasks = tasks?.filter(t => ['in-progress', 'visited'].includes(t.status)) || [];
  const completedTasks = tasks?.filter(t => t.status === 'collected') || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Map Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
        <h3 className="font-bold text-lg mb-2">خريطة المسار</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <span>قيد الانتظار ({pendingTasks.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <span>جاري ({inProgressTasks.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span>تم ({completedTasks.length})</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative">
        {/* Static Map (will be replaced with Google Maps in production) */}
        <div className="w-full h-96 bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
          {/* Placeholder - replace with actual map library */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin size={48} className="mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">
                خريطة تفاعلية
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                (يتطلب Google Maps API)
              </p>
            </div>
          </div>

          {/* Simple visualization */}
          <svg className="absolute inset-0 w-full h-full">
            {/* Draw route line */}
            {route?.optimizedOrder && route.optimizedOrder.length > 1 && (
              <polyline
                points={route.optimizedOrder
                  .map((taskId, index) => {
                    const task = tasks.find(t => t._id === taskId);
                    if (!task?.location?.coordinates) return null;
                    // Simple projection (not accurate, just for demo)
                    const x = ((task.location.coordinates[0] - mapCenter.lng + 0.1) * 2000);
                    const y = ((-task.location.coordinates[1] + mapCenter.lat + 0.1) * 2000);
                    return `${x},${y}`;
                  })
                  .filter(Boolean)
                  .join(' ')}
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
                strokeDasharray="5,5"
              />
            )}

            {/* Draw markers */}
            {tasks?.map((task, index) => {
              if (!task.location?.coordinates) return null;
              
              const [lng, lat] = task.location.coordinates;
              const x = ((lng - mapCenter.lng + 0.1) * 2000);
              const y = ((-lat + mapCenter.lat + 0.1) * 2000);
              
              let color = '#eab308'; // yellow
              if (task.status === 'collected') color = '#22c55e'; // green
              else if (task.status === 'in-progress' || task.status === 'visited') color = '#3b82f6'; // blue
              
              return (
                <g key={task._id} transform={`translate(${x}, ${y})`}>
                  <circle r="8" fill={color} stroke="white" strokeWidth="2" />
                  <text x="15" y="5" fontSize="12" fill="currentColor">
                    {index + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Task List */}
      <div className="p-4 max-h-64 overflow-y-auto space-y-2">
        {tasks?.map((task, index) => (
          <div
            key={task._id}
            onClick={() => onTaskClick?.(task)}
            className={`
              p-3 rounded-lg border cursor-pointer transition
              ${task.status === 'collected'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : task.status === 'in-progress' || task.status === 'visited'
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm
                ${task.status === 'collected'
                  ? 'bg-green-500'
                  : task.status === 'in-progress' || task.status === 'visited'
                  ? 'bg-blue-500'
                  : 'bg-yellow-500'
                }
              `}>
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">
                  {task.customer?.name || 'عميل'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {task.amount?.toLocaleString()} ج.م
                </p>
              </div>

              <div className="flex items-center gap-2">
                {task.status === 'collected' && (
                  <CheckCircle size={20} className="text-green-600" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openInGoogleMaps(task);
                  }}
                  className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50"
                >
                  <Navigation size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Route Stats */}
      {route && (
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border-t border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{route.totalDistance ? (route.totalDistance / 1000).toFixed(1) : '0'}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">كم</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{route.estimatedDuration || '0'}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">دقيقة</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{tasks?.length || 0}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">نقطة</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteMap;
