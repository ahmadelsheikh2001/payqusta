/**
 * Sync Notification Component
 * Beautiful animated notifications for sync status
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import syncService from '../services/SyncService';

export default function SyncNotification() {
  const [syncStatus, setSyncStatus] = useState({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    pendingCount: 0,
  });
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState('idle'); // idle, syncing, success, error, offline

  useEffect(() => {
    // Listen to sync events
    const unsubscribe = syncService.addListener((event, data) => {
      switch (event) {
        case 'online':
          setNotificationType('online');
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 15000); // 15 ثانية
          break;

        case 'offline':
          setNotificationType('offline');
          setShowNotification(true);
          // Keep offline notification visible
          break;

        case 'sync-start':
          setNotificationType('syncing');
          setShowNotification(true);
          break;

        case 'sync-success':
          setNotificationType('success');
          setTimeout(() => setShowNotification(false), 20000); // 20 ثانية
          break;

        case 'sync-error':
          setNotificationType('error');
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 25000); // 25 ثانية
          break;

        case 'action-synced':
          // Flash a quick success indicator
          setNotificationType('action-synced');
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 12000); // 12 ثانية
          break;
      }

      // Update status
      const status = syncService.getStatus();
      setSyncStatus(status);
    });

    // Update status periodically
    const interval = setInterval(() => {
      const status = syncService.getStatus();
      setSyncStatus(status);
      
      // Show periodic sync reminder if there are pending items
      if (status.pendingCount > 0 && !status.isOnline) {
        setNotificationType('pending');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 18000); // 18 ثانية
      }
    }, 30000); // Every 30 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const getNotificationConfig = () => {
    switch (notificationType) {
      case 'syncing':
        return {
          icon: RefreshCw,
          gradient: 'from-blue-500 via-cyan-500 to-teal-500',
          text: 'جاري المزامنة...',
          description: syncStatus.pendingCount > 0 ? `${syncStatus.pendingCount} عناصر في الانتظار` : 'جاري تحديث البيانات',
          animate: true,
          pulse: true,
        };

      case 'success':
        return {
          icon: CheckCircle,
          gradient: 'from-emerald-500 via-green-500 to-teal-500',
          text: 'تمت المزامنة بنجاح! ✅',
          description: syncStatus.lastSyncTime ? `آخر تحديث: ${new Date(syncStatus.lastSyncTime).toLocaleTimeString('ar-EG')}` : '',
          animate: false,
          pulse: false,
        };

      case 'error':
        return {
          icon: AlertCircle,
          gradient: 'from-rose-500 via-red-500 to-pink-500',
          text: 'فشلت المزامنة',
          description: 'سيتم إعادة المحاولة تلقائياً',
          animate: false,
          pulse: true,
        };

      case 'offline':
        return {
          icon: WifiOff,
          gradient: 'from-amber-500 via-orange-500 to-red-500',
          text: 'غير متصل بالإنترنت',
          description: 'ستتم المزامنة عند عودة الاتصال',
          animate: false,
          pulse: true,
        };

      case 'online':
        return {
          icon: Wifi,
          gradient: 'from-green-500 via-emerald-500 to-teal-500',
          text: 'عاد الاتصال! 🎉',
          description: 'جاري المزامنة...',
          animate: false,
          pulse: false,
        };

      case 'pending':
        return {
          icon: Cloud,
          gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
          text: `${syncStatus.pendingCount} عناصر تنتظر المزامنة`,
          description: 'قم بالاتصال بالإنترنت للمزامنة',
          animate: false,
          pulse: true,
        };

      case 'action-synced':
        return {
          icon: CheckCircle,
          gradient: 'from-cyan-500 via-sky-500 to-blue-500',
          text: 'تمت المزامنة',
          description: '',
          animate: false,
          pulse: false,
        };

      default:
        return null;
    }
  };

  const config = getNotificationConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ opacity: 0, x: -100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -50, scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25
          }}
          className="fixed top-6 left-6 z-[1000] pointer-events-none"
        >
          <motion.div
            animate={config.pulse ? {
              scale: [1, 1.03, 1],
            } : {}}
            transition={config.pulse ? {
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse"
            } : {}}
            className={`
              relative overflow-hidden
              bg-gradient-to-br ${config.gradient}
              rounded-2xl shadow-2xl
              px-4 py-3
              flex items-center gap-3
              max-w-[280px]
              backdrop-blur-xl
            `}
            style={{
              boxShadow: '0 10px 40px rgba(0,0,0,0.25), 0 0 60px rgba(255,255,255,0.08)',
            }}
          >
            {/* Subtle Background Texture */}
            <div className="absolute inset-0 opacity-10">
              <div 
                className="w-full h-full"
                style={{
                  backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
                  backgroundSize: '15px 15px',
                }}
              />
            </div>

            {/* Icon */}
            <div className="relative flex-shrink-0">
              <motion.div
                animate={config.animate ? {
                  rotate: 360,
                } : {}}
                transition={config.animate ? {
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                } : {}}
                className="w-9 h-9 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center shadow-lg"
              >
                <Icon className="w-5 h-5 text-white drop-shadow-lg" />
              </motion.div>

              {/* Animated Ring */}
              {config.pulse && (
                <motion.div
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.4, 0, 0.4],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="absolute inset-0 rounded-xl bg-white"
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 relative z-10 min-w-0">
              <motion.p 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.05 }}
                className="text-white font-bold text-sm leading-tight drop-shadow-md truncate"
              >
                {config.text}
              </motion.p>
              {config.description && (
                <motion.p
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-white/90 text-xs mt-0.5 drop-shadow truncate"
                >
                  {config.description}
                </motion.p>
              )}
            </div>

            {/* Slim Progress Bar for Syncing */}
            {notificationType === 'syncing' && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 overflow-hidden"
              >
                <motion.div
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="h-full w-1/2 bg-white shadow-lg"
                  style={{
                    boxShadow: '0 0 10px rgba(255,255,255,0.8)',
                  }}
                />
              </motion.div>
            )}

            {/* Subtle Shine Effect */}
            <motion.div
              animate={{
                x: ['-150%', '250%'],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatDelay: 2,
              }}
              className="absolute inset-0 w-1/4 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
