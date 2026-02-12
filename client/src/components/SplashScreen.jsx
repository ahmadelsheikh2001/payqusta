import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState(0); // 0: logo, 1: text, 2: loading, 3: fade out

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => onFinish?.(), 2500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {phase < 3 && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
        >
          {/* Background animated grid */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }}
            />
            {/* Glowing orbs */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary-500/20 blur-[120px]"
            />
            <motion.div
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.15, 0.1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet-500/20 blur-[100px]"
            />
          </div>

          <div className="relative flex flex-col items-center gap-6">
            {/* Logo Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            >
              <div className="relative">
                {/* Outer ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute -inset-4 rounded-3xl border-2 border-primary-500/20"
                  style={{ borderRadius: '28px' }}
                />
                {/* Pulse effect */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -inset-2 rounded-2xl bg-primary-500/10"
                />
                {/* Icon container */}
                <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-2xl shadow-primary-500/40">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  >
                    <Zap className="w-12 h-12 text-white" strokeWidth={2.5} />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Brand Name */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-center"
            >
              <h1 className="text-5xl font-black tracking-tight text-white">
                Pay<span className="bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">Qusta</span>
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={phase >= 1 ? { opacity: 1 } : {}}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-gray-400 text-sm mt-2 font-medium tracking-wide"
              >
                Smart Sales & Inventory Management
              </motion.p>
            </motion.div>

            {/* Loading Bar */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={phase >= 2 ? { opacity: 1, width: 200 } : {}}
              transition={{ duration: 0.4 }}
              className="h-1 rounded-full bg-gray-800 overflow-hidden"
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={phase >= 2 ? { x: '100%' } : {}}
                transition={{ duration: 1, ease: 'easeInOut', repeat: Infinity }}
                className="h-full w-1/2 rounded-full bg-gradient-to-r from-primary-500 via-violet-500 to-primary-500"
              />
            </motion.div>

            {/* Loading text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={phase >= 2 ? { opacity: 1 } : {}}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-gray-500 text-xs font-medium"
            >
              ...Loading
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
