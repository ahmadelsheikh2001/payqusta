/**
 * Notification Center Component
 * Displays all notifications with mark as read
 */

import React, { useState, useEffect } from 'react';
import { X, Bell, Check, Trash2, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../store';
import toast from 'react-hot-toast';

const NotificationCenter = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?filter=${filter}` : '';
      const { data } = await api.get(`/notifications${params}`);
      setNotifications(data.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      toast.error('فشل تحديث الحالة');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('تم تحديد الكل كمقروء');
    } catch (error) {
      toast.error('فشل التحديث');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success('تم الحذف');
    } catch (error) {
      toast.error('فشل الحذف');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      payment: '💳',
      invoice: '📄',
      collection: '🚗',
      system: '⚙️',
      alert: '⚠️'
    };
    return icons[type] || '🔔';
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-end p-4">
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md h-[600px] flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="text-blue-600" size={24} />
                <h2 className="font-bold text-xl text-gray-900 dark:text-white">
                  الإشعارات
                </h2>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                غير مقروء
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="mr-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  تحديد الكل كمقروء
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Bell size={48} className="mb-3 opacity-50" />
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`
                    p-3 rounded-lg border transition cursor-pointer
                    ${notification.isRead
                      ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }
                  `}
                  onClick={() => !notification.isRead && markAsRead(notification._id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notification.createdAt).toLocaleString('ar-EG')}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification._id);
                          }}
                          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded"
                          title="تحديد كمقروء"
                        >
                          <Check size={16} className="text-blue-600" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification._id);
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded"
                        title="حذف"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NotificationCenter;
