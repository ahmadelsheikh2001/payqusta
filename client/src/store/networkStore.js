/**
 * Network Store - Manages network state and sync status
 * Uses Zustand for state management
 */

import { create } from 'zustand';
import syncService from '../services/SyncService';

const useNetworkStore = create((set, get) => ({
  // Network state
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncTime: null,
  pendingCount: 0,
  
  // Sync events
  syncError: null,
  lastSyncedAction: null,

  // Actions
  setOnline: (isOnline) => set({ isOnline }),
  
  setSyncing: (isSyncing) => set({ isSyncing }),
  
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  
  setPendingCount: (count) => set({ pendingCount: count }),
  
  setSyncError: (error) => set({ syncError: error }),
  
  setLastSyncedAction: (action) => set({ lastSyncedAction: action }),

  // Initialize network monitoring
  init: () => {
    // Listen to sync service events
    syncService.addListener((event, data) => {
      const store = get();
      
      switch (event) {
        case 'online':
          set({ isOnline: true, syncError: null });
          break;
          
        case 'offline':
          set({ isOnline: false });
          break;
          
        case 'sync-start':
          set({ isSyncing: true, syncError: null });
          break;
          
        case 'sync-success':
          set({ 
            isSyncing: false,
            lastSyncTime: data.time,
            syncError: null,
            pendingCount: 0
          });
          break;
          
        case 'sync-error':
          set({ 
            isSyncing: false,
            syncError: data.error.message || 'فشلت المزامنة'
          });
          break;
          
        case 'action-synced':
          set({ lastSyncedAction: data.action });
          break;
          
        case 'action-failed':
          console.error('Action failed:', data.action, data.error);
          break;
      }
    });

    // Initial status
    const status = syncService.getStatus();
    set({
      isOnline: status.isOnline,
      isSyncing: status.isSyncing,
      lastSyncTime: status.lastSyncTime,
      pendingCount: status.pendingCount
    });
  },

  // Trigger manual sync
  forceSync: async () => {
    try {
      await syncService.forceSync();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  }
}));

export default useNetworkStore;
