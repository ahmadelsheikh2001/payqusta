/**
 * Offline Storage Service using IndexedDB
 * Manages local data storage for offline-first functionality
 */

const DB_NAME = 'PayQustaOffline';
const DB_VERSION = 2;

// Store names
const STORES = {
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  INVOICES: 'invoices',
  PENDING_ACTIONS: 'pendingActions',
  SETTINGS: 'settings',
  SYNC_METADATA: 'syncMetadata'
};

class OfflineStorageService {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineStorage] Database initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Products store
        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: '_id' });
          productStore.createIndex('barcode', 'barcode', { unique: false });
          productStore.createIndex('category', 'category', { unique: false });
          productStore.createIndex('isActive', 'isActive', { unique: false });
        }

        // Customers store
        if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
          const customerStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: '_id' });
          customerStore.createIndex('phone', 'phone', { unique: false });
          customerStore.createIndex('tier', 'tier', { unique: false });
        }

        // Invoices store
        if (!db.objectStoreNames.contains(STORES.INVOICES)) {
          const invoiceStore = db.createObjectStore(STORES.INVOICES, { keyPath: '_id' });
          invoiceStore.createIndex('invoiceNumber', 'invoiceNumber', { unique: false });
          invoiceStore.createIndex('customer', 'customer', { unique: false });
          invoiceStore.createIndex('status', 'status', { unique: false });
          invoiceStore.createIndex('createdAt', 'createdAt', { unique: false });
          invoiceStore.createIndex('synced', 'synced', { unique: false });
        }

        // Pending Actions store (for offline operations)
        if (!db.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
          const pendingStore = db.createObjectStore(STORES.PENDING_ACTIONS, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          pendingStore.createIndex('action', 'action', { unique: false });
          pendingStore.createIndex('entity', 'entity', { unique: false });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }

        // Sync Metadata store
        if (!db.objectStoreNames.contains(STORES.SYNC_METADATA)) {
          db.createObjectStore(STORES.SYNC_METADATA, { keyPath: 'entity' });
        }

        console.log('[OfflineStorage] Database schema created');
      };
    });
  }

  /**
   * Generic method to save data to a store
   */
  async save(storeName, data) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = Array.isArray(data)
        ? Promise.all(data.map(item => store.put(item)))
        : store.put(data);

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get all items from a store
   */
  async getAll(storeName, filters = {}) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result;

        // Apply filters
        if (Object.keys(filters).length > 0) {
          results = results.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
              if (typeof value === 'function') {
                return value(item[key]);
              }
              return item[key] === value;
            });
          });
        }

        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get single item by ID
   */
  async getById(storeName, id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete item(s) from store
   */
  async delete(storeName, id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Clear all data from a store
   */
  async clear(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ========== Products Methods ==========

  async saveProducts(products) {
    await this.save(STORES.PRODUCTS, products);
    await this.updateSyncMetadata(STORES.PRODUCTS);
  }

  async getProducts(filters = {}) {
    return this.getAll(STORES.PRODUCTS, filters);
  }

  async getProductByBarcode(barcode) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.PRODUCTS], 'readonly');
      const store = transaction.objectStore(STORES.PRODUCTS);
      const index = store.index('barcode');
      const request = index.get(barcode);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ========== Customers Methods ==========

  async saveCustomers(customers) {
    await this.save(STORES.CUSTOMERS, customers);
    await this.updateSyncMetadata(STORES.CUSTOMERS);
  }

  async getCustomers(filters = {}) {
    return this.getAll(STORES.CUSTOMERS, filters);
  }

  async getCustomerByPhone(phone) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.CUSTOMERS], 'readonly');
      const store = transaction.objectStore(STORES.CUSTOMERS);
      const index = store.index('phone');
      const request = index.get(phone);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ========== Invoices Methods ==========

  async saveInvoice(invoice) {
    const invoiceData = {
      ...invoice,
      _id: invoice._id || `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      synced: false,
      createdAt: invoice.createdAt || new Date().toISOString()
    };

    await this.save(STORES.INVOICES, invoiceData);
    return invoiceData;
  }

  async getInvoices(filters = {}) {
    return this.getAll(STORES.INVOICES, filters);
  }

  async getUnsyncedInvoices() {
    return this.getInvoices({ synced: false });
  }

  async markInvoiceAsSynced(id) {
    const invoice = await this.getById(STORES.INVOICES, id);
    if (invoice) {
      invoice.synced = true;
      await this.save(STORES.INVOICES, invoice);
    }
  }

  // ========== Pending Actions Methods ==========

  async addPendingAction(action, entity, data) {
    const actionData = {
      action, // 'create', 'update', 'delete'
      entity, // 'invoice', 'payment', 'product'
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.PENDING_ACTIONS], 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_ACTIONS);
      const request = store.add(actionData);

      request.onsuccess = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getPendingActions() {
    return this.getAll(STORES.PENDING_ACTIONS);
  }

  async deletePendingAction(id) {
    return this.delete(STORES.PENDING_ACTIONS, id);
  }

  async incrementRetryCount(id) {
    const action = await this.getById(STORES.PENDING_ACTIONS, id);
    if (action) {
      action.retryCount = (action.retryCount || 0) + 1;
      action.lastRetry = new Date().toISOString();
      await this.save(STORES.PENDING_ACTIONS, action);
    }
  }

  // ========== Sync Metadata Methods ==========

 async updateSyncMetadata(entity) {
    const metadata = {
      entity,
      lastSync: new Date().toISOString(),
      count: (await this.getAll(entity)).length
    };
    await this.save(STORES.SYNC_METADATA, metadata);
  }

  async getSyncMetadata(entity) {
    return this.getById(STORES.SYNC_METADATA, entity);
  }

  async getAllSyncMetadata() {
    return this.getAll(STORES.SYNC_METADATA);
  }

  // ========== Settings Methods ==========

  async saveSetting(key, value) {
    return this.save(STORES.SETTINGS, { key, value, updatedAt: new Date().toISOString() });
  }

  async getSetting(key) {
    const setting = await this.getById(STORES.SETTINGS, key);
    return setting?.value;
  }

  // ========== Utility Methods ==========

  async getStorageUsage() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return null;
    }

    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2)
    };
  }

  async clearAllData() {
    const stores = Object.values(STORES);
    await Promise.all(stores.map(store => this.clear(store)));
    console.log('[OfflineStorage] All data cleared');
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorageService();

export default offlineStorage;
export { STORES };
