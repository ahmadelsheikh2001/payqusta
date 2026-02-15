/**
 * Permission Constants
 * Defines available resources and actions for the permission system
 */

module.exports = {
  RESOURCES: {
    PRODUCTS: 'products',
    CUSTOMERS: 'customers',
    SUPPLIERS: 'suppliers',
    INVOICES: 'invoices',
    EXPENSES: 'expenses',
    REPORTS: 'reports',
    SETTINGS: 'settings',
    USERS: 'users',
    STOCK_ADJUSTMENTS: 'stock_adjustments',
    CASH_SHIFTS: 'cash_shifts',
  },

  ACTIONS: {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
  },

  // Default role permissions
  DEFAULT_ROLES: {
    VENDOR: {
      name: 'Vendor Admin',
      permissions: [
        { resource: 'products', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'customers', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'suppliers', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'invoices', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'expenses', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'reports', actions: ['read'] },
        { resource: 'settings', actions: ['read', 'update'] },
        { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'stock_adjustments', actions: ['create', 'read', 'update', 'delete'] },
        { resource: 'cash_shifts', actions: ['create', 'read', 'update'] },
      ],
    },
    COORDINATOR: {
      name: 'Coordinator',
      permissions: [
        { resource: 'products', actions: ['read', 'update'] },
        { resource: 'customers', actions: ['read'] },
        { resource: 'suppliers', actions: ['read'] },
        { resource: 'invoices', actions: ['create', 'read'] },
        { resource: 'expenses', actions: ['read'] },
        { resource: 'reports', actions: ['read'] },
        { resource: 'stock_adjustments', actions: ['create', 'read'] },
        { resource: 'cash_shifts', actions: ['create', 'read'] },
      ],
    },
    CASHIER: {
      name: 'Cashier',
      permissions: [
        { resource: 'products', actions: ['read'] },
        { resource: 'customers', actions: ['read'] },
        { resource: 'invoices', actions: ['create', 'read'] },
        { resource: 'cash_shifts', actions: ['create', 'read'] },
      ],
    },
  },
};
