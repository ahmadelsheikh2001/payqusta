import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { create } from 'zustand';

/**
 * Beautiful Animated Notification System
 * Replaces all alerts and toasts with animated popups
 */

// Notification Store
export const useNotificationStore = create((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: notification.type || 'info', // success, error, warning, info
      title: notification.title,
      message: notification.message,
      duration: notification.duration || 4000,
      action: notification.action, // { label: 'Text', onClick: fn }
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Auto remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, newNotification.duration);
    }

    return id;
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => set({ notifications: [] }),
}));

// Notification helpers (easier to use)
export const notify = {
  success: (message, title = 'نجح العملية') =>
    useNotificationStore.getState().addNotification({ type: 'success', title, message }),

  error: (message, title = 'حدث خطأ') =>
    useNotificationStore.getState().addNotification({ type: 'error', title, message }),

  warning: (message, title = 'تحذير') =>
    useNotificationStore.getState().addNotification({ type: 'warning', title, message }),

  info: (message, title = 'معلومة') =>
    useNotificationStore.getState().addNotification({ type: 'info', title, message }),

  custom: (config) =>
    useNotificationStore.getState().addNotification(config),
};

// Notification Component
const ICON_MAP = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    title: 'text-green-900 dark:text-green-100',
    message: 'text-green-700 dark:text-green-300',
    button: 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    title: 'text-red-900 dark:text-red-100',
    message: 'text-red-700 dark:text-red-300',
    button: 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-600 dark:text-yellow-400',
    title: 'text-yellow-900 dark:text-yellow-100',
    message: 'text-yellow-700 dark:text-yellow-300',
    button: 'text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    message: 'text-blue-700 dark:text-blue-300',
    button: 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300',
  },
};

function NotificationItem({ notification, onRemove }) {
  const Icon = ICON_MAP[notification.type];
  const colors = COLORS[notification.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`${colors.bg} ${colors.border} border rounded-xl shadow-lg overflow-hidden max-w-sm w-full`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <motion.div
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
          >
            <Icon className={`w-6 h-6 ${colors.icon}`} />
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold ${colors.title} mb-1`}>
              {notification.title}
            </h4>
            <p className={`text-sm ${colors.message}`}>
              {notification.message}
            </p>

            {/* Action Button */}
            {notification.action && (
              <button
                onClick={() => {
                  notification.action.onClick();
                  onRemove();
                }}
                className={`mt-2 text-sm font-medium ${colors.button}`}
              >
                {notification.action.label}
              </button>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onRemove}
            className={`p-1 rounded-lg ${colors.button} transition-colors`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {notification.duration > 0 && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: notification.duration / 1000, ease: 'linear' }}
          className={`h-1 ${colors.icon} origin-left`}
        />
      )}
    </motion.div>
  );
}

// Main Notifications Container
export default function AnimatedNotification() {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed top-4 left-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationItem
              notification={notification}
              onRemove={() => removeNotification(notification.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
