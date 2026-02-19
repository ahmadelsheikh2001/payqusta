/**
 * Sync Service - Handles synchronization between offline storage and server
 * Monitors network status and syncs pending actions when online
 */

import offlineStorage, { STORES } from './OfflineStorageService';
import { api } from '../store';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
    this.listeners = [];
    this.lastSyncTime = null;
    this.pendingCount = 0;
  }

  /**
   * Initialize sync service
   */
  async init() {
    // Initialize offline storage
    await offlineStorage.init();

    // Set up network status listeners
    this.setupNetworkListeners();

    // Start periodic sync (every 30 seconds when online)
    this.startPeriodicSync(30000);

    // Sync on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        this.sync();
      }
    });

    console.log('[SyncService] Initialized');
  }

  /**
   * Set up network status listeners
   */
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('[SyncService] Network online - starting sync');
      this.notifyListeners('online');
      this.sync();
    });

    window.addEventListener('offline', () => {
      console.log('[SyncService] Network offline');
      this.notifyListeners('offline');
    });
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync(interval) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.sync();
      }
    }, interval);
  }

  /**
   * Main sync function
   */
  async sync() {
    if (this.isSyncing || !navigator.onLine) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners('sync-start');

    try {
      console.log('[SyncService] Starting sync...');

      // Step 1: Push pending actions to server
      await this.pushPendingActions();

      // Step 2: Pull latest data from server
      await this.pullLatestData();

      this.lastSyncTime = new Date();
      this.notifyListeners('sync-success', { time: this.lastSyncTime });

      console.log('[SyncService] Sync completed successfully');
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
      this.notifyListeners('sync-error', { error });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Push pending actions to server
   */
  async pushPendingActions() {
    const pendingActions = await offlineStorage.getPendingActions();
    this.pendingCount = pendingActions.length;

    if (pendingActions.length === 0) {
      console.log('[SyncService] No pending actions to sync');
      return;
    }

    console.log(`[SyncService] Pushing ${pendingActions.length} pending actions`);

    for (const action of pendingActions) {
      try {
        await this.executePendingAction(action);
        await offlineStorage.deletePendingAction(action.id);
        this.pendingCount--;
        this.notifyListeners('action-synced', { action });
      } catch (error) {
        console.error(`[SyncService] Failed to sync action ${action.id}:`, error);
        
        // Increment retry count
        await offlineStorage.incrementRetryCount(action.id);
        
        // Delete if retried too many times (max 5 attempts)
        if (action.retryCount >= 5) {
          console.warn(`[SyncService] Action ${action.id} exceeded retry limit, deleting`);
          await offlineStorage.deletePendingAction(action.id);
          this.notifyListeners('action-failed', { action, error });
        }
      }
    }
  }

  /**
   * Execute a pending action
   */
  async executePendingAction(action) {
    const { action: actionType, entity, data } = action;

    switch (entity) {
      case 'invoice':
        return this.syncInvoice(actionType, data);
      
      case 'payment':
        return this.syncPayment(actionType, data);
      
      case 'product':
        return this.syncProduct(actionType, data);
      
      default:
        throw new Error(`Unknown entity type: ${entity}`);
    }
  }

  /**
   * Sync invoice action
   */
  async syncInvoice(actionType, data) {
    switch (actionType) {
      case 'create':
        const response = await api.post('/invoices', data);
        // Update local invoice with server ID
        if (data._id.startsWith('offline-')) {
          await offlineStorage.delete(STORES.INVOICES, data._id);
          await offlineStorage.save(STORES.INVOICES, { ...response.data.data, synced: true });
        }
        return response;
      
      case 'update':
        return api.put(`/invoices/${data._id}`, data);
      
      case 'delete':
        return api.delete(`/invoices/${data._id}`);
      
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Sync payment action
   */
  async syncPayment(actionType, data) {
    if (actionType === 'create') {
      return api.post(`/invoices/${data.invoiceId}/pay`, data);
    }
    throw new Error(`Unknown action type: ${actionType}`);
  }

  /**
   * Sync product action
   */
  async syncProduct(actionType, data) {
    switch (actionType) {
      case 'update-stock':
        return api.patch(`/products/${data._id}/stock`, {
          quantity: data.quantity,
          type: data.type
        });
      
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Pull latest data from server
   */
  async pullLatestData() {
    try {
      // Pull products
      const productsResponse = await api.get('/products');
      if (productsResponse.data.success) {
        await offlineStorage.saveProducts(productsResponse.data.data.products || productsResponse.data.data);
        console.log('[SyncService] Products synced');
      }

      // Pull customers
      const customersResponse = await api.get('/customers');
      if (customersResponse.data.success) {
        await offlineStorage.saveCustomers(customersResponse.data.data.customers || customersResponse.data.data);
        console.log('[SyncService] Customers synced');
      }

      // Pull recent invoices (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const invoicesResponse = await api.get('/invoices', {
        params: {
          startDate: thirtyDaysAgo.toISOString(),
          limit: 100
        }
      });
      
      if (invoicesResponse.data.success) {
        const invoices = (invoicesResponse.data.data.invoices || invoicesResponse.data.data).map(inv => ({
          ...inv,
          synced: true
        }));
        
        // Save each invoice individually to avoid overwriting offline invoices
        for (const invoice of invoices) {
          await offlineStorage.save(STORES.INVOICES, invoice);
        }
        
        console.log('[SyncService] Invoices synced');
      }
    } catch (error) {
      console.error('[SyncService] Failed to pull latest data:', error);
      // Don't throw - partial sync is better than no sync
    }
  }

  /**
   * Manual sync trigger
   */
  async forceSync() {
    console.log('[SyncService] Force sync triggered');
    return this.sync();
  }

  /**
   * Add listener for sync events
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event, data = {}) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('[SyncService] Listener error:', error);
      }
    });
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isSyncing: this.isSyncing,
      isOnline: navigator.onLine,
      lastSyncTime: this.lastSyncTime,
      pendingCount: this.pendingCount
    };
  }

  /**
   * Stop sync service
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('[SyncService] Stopped');
  }
}

// Create singleton instance
const syncService = new SyncService();

export default syncService;
