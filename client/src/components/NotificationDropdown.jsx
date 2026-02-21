import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, CheckCheck, Clock, AlertTriangle, CreditCard,
  FileText, Package, Truck, UserPlus, Star, X, Trash2, ChevronDown,
} from 'lucide-react';
import { api, API_URL } from '../store';

const iconMap = {
  clock: Clock,
  'alert-triangle': AlertTriangle,
  'credit-card': CreditCard,
  'file-text': FileText,
  'package-x': Package,
  'package-plus': Package,
  truck: Truck,
  'user-plus': UserPlus,
  star: Star,
  bell: Bell,
};

const colorMap = {
  primary: { bg: 'bg-primary-50 dark:bg-primary-500/10', text: 'text-primary-500', ring: 'ring-primary-500/20' },
  success: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-500', ring: 'ring-emerald-500/20' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-500', ring: 'ring-amber-500/20' },
  danger: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-500', ring: 'ring-red-500/20' },
  gray: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500', ring: 'ring-gray-500/20' },
};

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch unread count periodically
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnreadCount(data.data?.count || 0);
    } catch (e) { }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications', { params: { limit: 20 } });
      setNotifications(data.data || []);
    } catch (e) { }
    setLoading(false);
  }, []);

  // SSE real-time connection with auto-reconnect
  useEffect(() => {
    const token = localStorage.getItem('payqusta_token');
    if (!token) return;

    let eventSource;
    let retryTimeout;
    let retryCount = 0;

    const connect = () => {
      if (document.hidden) return; // Don't connect if hidden

      try {
        eventSource = new EventSource(`${API_URL}/notifications/stream?token=${token}`);

        eventSource.onopen = () => {
          retryCount = 0;
        };

        eventSource.onmessage = (event) => {
          try {
            const notification = JSON.parse(event.data);
            if (notification.type === 'connected') return;

            setNotifications((prev) => [notification, ...prev].slice(0, 30));
            setUnreadCount((prev) => prev + 1);

            if (window.Notification && window.Notification.permission === 'granted') {
              new window.Notification(notification.title, { body: notification.message, icon: '/favicon.svg' });
            }
          } catch (e) { }
        };

        eventSource.onerror = () => {
          eventSource.close();
          // Exponential backoff
          const delay = Math.min(3000 * Math.pow(2, retryCount), 30000);
          retryCount++;
          retryTimeout = setTimeout(connect, delay);
        };
      } catch (e) { }
    };

    // Initial connect if visible
    if (!document.hidden) connect();

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        eventSource?.close();
        clearTimeout(retryTimeout);
      } else {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(retryTimeout);
      eventSource?.close();
    };
  }, []);

  // Poll unread count every 30s
  // Poll unread count periodically (every 60s), only if visible
  useEffect(() => {
    let interval;

    const startPolling = () => {
      fetchUnreadCount();
      interval = setInterval(fetchUnreadCount, 60000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        startPolling();
      }
    };

    if (!document.hidden) startPolling();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) { }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) { }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (e) { }
  };

  const handleClick = (notification) => {
    if (!notification.isRead) markAsRead(notification._id);
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  const timeAgo = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
    return d.toLocaleDateString('ar-EG');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-all active:scale-95"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-primary-500' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -left-0.5 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-extrabold text-white px-1 animate-pulse-soft shadow-lg shadow-red-500/40">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
            <h4 className="font-bold text-base">الإشعارات</h4>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary-500 font-semibold hover:text-primary-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> قراءة الكل
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-gray-400">جاري التحميل...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-medium">لا توجد إشعارات</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">ستظهر الإشعارات هنا عند حدوث أي حدث</p>
              </div>
            ) : (
              notifications.map((n) => {
                const IconComp = iconMap[n.icon] || Bell;
                const colors = colorMap[n.color] || colorMap.primary;

                return (
                  <div
                    key={n._id}
                    onClick={() => handleClick(n)}
                    className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer border-b border-gray-50 dark:border-gray-800/50 transition-all hover:bg-gray-50 dark:hover:bg-gray-800/30 group ${!n.isRead ? 'bg-primary-50/30 dark:bg-primary-500/5' : ''
                      }`}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center flex-shrink-0 ring-2 ${colors.ring}`}>
                      <IconComp className="w-4.5 h-4.5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${!n.isRead ? 'font-bold' : 'font-medium text-gray-600 dark:text-gray-300'}`}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary-500 flex-shrink-0 mt-1.5 shadow-sm shadow-primary-500/50" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1.5">{timeAgo(n.createdAt)}</p>
                    </div>

                    {/* Actions (on hover) */}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-2.5 border-t border-gray-100 dark:border-gray-800 text-center">
              <span className="text-xs text-gray-400">{notifications.length} إشعار</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
