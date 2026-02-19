/**
 * Offline Banner Component
 * Displays network status and sync information in a compact, elegant way
 */

import React, { useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useNetworkStore from '../store/networkStore';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const OfflineBanner = () => {
  const {
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingCount,
    syncError,
    forceSync,
    init
  } = useNetworkStore();

  // Initialize network store on mount
  useEffect(() => {
    init();
  }, [init]);

  // Determine what to show
  const getBannerConfig = () => {
    if (!isOnline) {
      return {
        show: true,
        icon: WifiOff,
        gradient: 'from-orange-500 to-red-500',
        text: 'غير متصل',
        subtext: pendingCount > 0 ? `${pendingCount} عملية معلقة` : 'وضع عدم الاتصال',
        showButton: false,
      };
    }

    if (isSyncing) {
      return {
        show: true,
        icon: RefreshCw,
        gradient: 'from-blue-500 to-cyan-500',
        text: 'جاري المزامنة...',
        subtext: 'تحديث البيانات',
        showButton: false,
        animate: true,
      };
    }

    if (pendingCount > 0) {
      return {
        show: true,
        icon: Clock,
        gradient: 'from-amber-500 to-orange-500',
        text: `${pendingCount} عملية منتظرة`,
        subtext: 'انقر للمزامنة',
        showButton: true,
      };
    }

    if (syncError) {
      return {
        show: true,
        icon: AlertCircle,
        gradient: 'from-red-500 to-rose-500',
        text: 'فشلت المزامنة',
        subtext: 'انقر للمحاولة مجدداً',
        showButton: true,
      };
    }

    return { show: false };
  };

  const config = getBannerConfig();

  if (!config.show) return null;

  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -100, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -50, scale: 0.95 }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 25
        }}
        className="fixed top-6 left-6 z-[999] pointer-events-auto"
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`
            relative overflow-hidden
            bg-gradient-to-br ${config.gradient}
            rounded-2xl shadow-2xl
            px-4 py-3
            flex items-center gap-3
            max-w-[280px]
            backdrop-blur-xl
            cursor-pointer
          `}
          style={{
            boxShadow: '0 10px 40px rgba(0,0,0,0.25), 0 0 60px rgba(255,255,255,0.08)',
          }}
          onClick={config.showButton ? forceSync : undefined}
        >
          {/* Subtle Background */}
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

            {/* Pulse Animation */}
            {!isOnline && (
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
            <motion.p
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-white/90 text-xs mt-0.5 drop-shadow truncate"
            >
              {config.subtext}
            </motion.p>
          </div>

          {/* Button Indicator */}
          {config.showButton && (
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
              className="flex-shrink-0"
            >
              <RefreshCw className="w-4 h-4 text-white/80" />
            </motion.div>
          )}

          {/* Progress Bar for Syncing */}
          {isSyncing && (
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

          {/* Shine Effect */}
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
    </AnimatePresence>
  );
};

export default OfflineBanner;
