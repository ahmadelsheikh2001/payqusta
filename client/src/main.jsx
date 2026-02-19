import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
import syncService from './services/SyncService';

// Initialize Sync Service
syncService.init().then(() => {
  console.log('✅ Sync Service initialized');
}).catch(error => {
  console.error('❌ Failed to initialize Sync Service:', error);
});

// Register PWA Service Worker
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
