/**
 * PWA Install Prompt Component
 * Shows a beautiful prompt to install the app
 */

import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after 30 seconds of usage
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      console.log('✅ PWA was installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to install prompt: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    setShowPrompt(false);
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
      >
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative p-6 pb-4">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="flex items-start gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Smartphone size={32} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">ثبت التطبيق</h3>
                <p className="text-blue-50 text-sm leading-relaxed">
                  احصل على تجربة أسرع وأفضل مع تطبيق PayQusta
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="px-6 pb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-blue-50">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              <span>يعمل بدون إنترنت</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-50">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              <span>تحميل فوري وسريع</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-50">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              <span>إشعارات فورية</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white/10 backdrop-blur-sm p-4 flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2.5 rounded-lg text-white/90 hover:bg-white/10 transition-colors font-medium text-sm"
            >
              لاحقاً
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white text-blue-600 hover:bg-blue-50 transition-colors font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              <Download size={18} />
              ثبت الآن
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallPrompt;
