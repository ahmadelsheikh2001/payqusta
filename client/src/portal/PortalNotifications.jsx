import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { Bell, CheckCircle, Clock, ShoppingBag, CreditCard, AlertTriangle, MessageCircle, Star, Check, CheckCheck } from 'lucide-react';

const iconMap = {
  'shopping-bag': ShoppingBag,
  'credit-card': CreditCard,
  'clock': Clock,
  'alert-triangle': AlertTriangle,
  'check-circle': CheckCircle,
  'message-circle': MessageCircle,
  'star': Star,
  'bell': Bell,
};

const colorMap = {
  success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  danger: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export default function PortalNotifications() {
  const navigate = useNavigate();
  const { fetchNotifications, markNotificationRead, markAllNotificationsRead, unreadCount } = usePortalStore();
  const { dark } = useThemeStore();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async (page = 1) => {
    setLoading(true);
    const res = await fetchNotifications(page);
    if (res) {
      setNotifications(res.notifications || []);
      setPagination(res.pagination || { page: 1, pages: 1 });
    }
    setLoading(false);
  };

  const handleMarkRead = async (id) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      handleMarkRead(notif._id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `منذ ${days} يوم`;
    return new Date(date).toLocaleDateString('ar-EG');
  };

  return (
    <div className="space-y-4 pb-20" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary-500" />
          الإشعارات
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:underline"
          >
            <CheckCheck className="w-4 h-4" />
            قراءة الكل
          </button>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد إشعارات</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">سيتم إعلامك بأي تحديثات جديدة</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const IconComponent = iconMap[notif.icon] || Bell;
            const colorClass = colorMap[notif.color] || colorMap.primary;

            return (
              <div
                key={notif._id}
                onClick={() => handleNotificationClick(notif)}
                className={`bg-white dark:bg-gray-800/80 rounded-2xl p-4 border transition-all cursor-pointer ${notif.isRead
                    ? 'border-gray-100 dark:border-gray-700 opacity-70'
                    : 'border-primary-200 dark:border-primary-800 shadow-sm shadow-primary-500/5'
                  }`}
              >
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">{notif.title}</h4>
                      {!notif.isRead && (
                        <div className="w-2.5 h-2.5 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">{timeAgo(notif.createdAt)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: pagination.pages }, (_, i) => (
            <button
              key={i}
              onClick={() => loadNotifications(i + 1)}
              className={`w-8 h-8 rounded-lg text-sm font-bold ${pagination.page === i + 1
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
