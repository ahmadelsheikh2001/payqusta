/**
 * Push Notification Manager
 * Handles push notification subscription and display
 */

import { create } from 'zustand';

const useNotificationStore = create((set, get) => ({
  permission: 'default',
  subscription: null,
  isSupported: false,
  isSubscribed: false,

  // Initialize notifications
  init: async () => {
    // Check if notifications are supported
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      set({ isSupported: false });
      return { success: false, reason: 'not_supported' };
    }

    set({ 
      isSupported: true,
      permission: Notification.permission 
    });

    // If already granted, try to get existing subscription
    if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        set({ subscription, isSubscribed: true });
      }
    }

    return { success: true };
  },

  // Request permission and subscribe
  subscribe: async () => {
    const { isSupported } = get();
    
    if (!isSupported) {
      return { success: false, reason: 'not_supported' };
    }

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      set({ permission });

      if (permission !== 'granted') {
        return { success: false, reason: 'permission_denied' };
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
        )
      });

      set({ subscription, isSubscribed: true });

      // Send subscription to server
      await fetch('/api/v1/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('payqusta_token')}`
        },
        body: JSON.stringify(subscription)
      });

      return { success: true, subscription };
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return { success: false, error: error.message };
    }
  },

  // Unsubscribe from push notifications
  unsubscribe: async () => {
    const { subscription } = get();

    if (!subscription) {
      return { success: true };
    }

    try {
      await subscription.unsubscribe();
      
      // Notify server
      await fetch('/api/v1/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('payqusta_token')}`
        },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });

      set({ subscription: null, isSubscribed: false });
      return { success: true };
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return { success: false, error: error.message };
    }
  },

  // Show a local notification
  showNotification: async (title, options = {}) => {
    const { permission } = get();

    if (permission !== 'granted') {
      return { success: false, reason: 'permission_denied' };
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: [200, 100, 200],
        ...options
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to show notification:', error);
      return { success: false, error: error.message };
    }
  }
}));

// Helper: Convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default useNotificationStore;
