// Offline Sync Utility for PayQusta PWA

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

class OfflineSync {
  constructor() {
    this.dbName = 'PayQustaOffline';
    this.dbVersion = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains('pendingInvoices')) {
          db.createObjectStore('pendingInvoices', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: '_id' });
        }
        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: '_id' });
        }
      };
    });
  }

  async savePendingInvoice(invoiceData) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingInvoices'], 'readwrite');
      const store = transaction.objectStore('pendingInvoices');
      const request = store.add({
        data: invoiceData,
        timestamp: Date.now(),
        synced: false
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingInvoices() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingInvoices'], 'readonly');
      const store = transaction.objectStore('pendingInvoices');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePendingInvoice(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingInvoices'], 'readwrite');
      const store = transaction.objectStore('pendingInvoices');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async cacheProducts(products) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['products'], 'readwrite');
      const store = transaction.objectStore('products');

      // Clear existing products
      store.clear();

      // Add new products
      products.forEach(product => {
        store.add(product);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getProducts() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['products'], 'readonly');
      const store = transaction.objectStore('products');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async cacheCustomers(customers) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['customers'], 'readwrite');
      const store = transaction.objectStore('customers');

      // Clear existing customers
      store.clear();

      // Add new customers
      customers.forEach(customer => {
        store.add(customer);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getCustomers() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['customers'], 'readonly');
      const store = transaction.objectStore('customers');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async syncPendingData() {
    const pendingInvoices = await this.getPendingInvoices();
    const results = [];

    for (const invoice of pendingInvoices) {
      try {
        const response = await fetch(`${API_URL}/invoices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('payqusta_token')}`
          },
          body: JSON.stringify(invoice.data)
        });

        if (response.ok) {
          await this.deletePendingInvoice(invoice.id);
          results.push({ id: invoice.id, success: true });
        } else {
          results.push({ id: invoice.id, success: false, error: 'Server error' });
        }
      } catch (error) {
        results.push({ id: invoice.id, success: false, error: error.message });
      }
    }

    return results;
  }
}

export const offlineSync = new OfflineSync();
