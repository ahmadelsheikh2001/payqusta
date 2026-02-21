import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
import syncService from './services/SyncService';

// Initialize Sync Service only for authenticated backoffice users.
// Portal customers use a different auth token and should not hit /api/v1/products via sync.
const hasBackofficeToken = !!localStorage.getItem('payqusta_token');
const isPortalPath = window.location.pathname.startsWith('/portal');

if (hasBackofficeToken && !isPortalPath) {
  syncService.init().then(() => {
    console.log('✅ Sync Service initialized');
  }).catch(error => {
    console.error('❌ Failed to initialize Sync Service:', error);
  });
}

// Register PWA Service Worker in production only.
if (import.meta.env.PROD) {
  const updateSW = registerSW({
    onNeedRefresh() {
      if (confirm('تحديث جديد متاح. هل تريد التحديث؟')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });
} else if ('serviceWorker' in navigator) {
  // Prevent stale SW from hijacking Vite dev module requests.
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
