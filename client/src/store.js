/**
 * PayQusta — Global State Management (Zustand)
 * Manages auth, theme, and API communication
 */

import { create } from 'zustand';
import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Configure Axios defaults
export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('payqusta_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('payqusta_token');
      // Only redirect to admin login if NOT in portal
      if (!window.location.pathname.startsWith('/portal')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ========== AUTH STORE ==========
export const useAuthStore = create((set, get) => ({
  user: null,
  tenant: null,
  token: localStorage.getItem('payqusta_token'),
  isAuthenticated: !!localStorage.getItem('payqusta_token'),
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('payqusta_token', data.data.token);
      set({
        user: data.data.user,
        tenant: data.data.tenant,
        token: data.data.token,
        isAuthenticated: true,
        loading: false,
      });
      return data;
    } catch (error) {
      set({ loading: false });
      throw error.response?.data || error;
    }
  },

  register: async (formData) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/register', formData);
      localStorage.setItem('payqusta_token', data.data.token);
      set({
        user: data.data.user,
        tenant: data.data.tenant,
        token: data.data.token,
        isAuthenticated: true,
        loading: false,
      });
      return data;
    } catch (error) {
      set({ loading: false });
      throw error.response?.data || error;
    }
  },

  getMe: async () => {
    // Return existing promise if request is already in flight
    if (get().loadingUser) return;

    set({ loadingUser: true });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data.user, tenant: data.data.tenant, loadingUser: false });
    } catch (error) {
      set({ isAuthenticated: false, user: null, loadingUser: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      localStorage.removeItem('payqusta_token');
      set({ user: null, tenant: null, token: null, isAuthenticated: false });
      window.location.href = '/login';
    }
  },

  logoutAll: async () => {
    try {
      await api.post('/auth/logout-all');
    } catch (error) {
      console.error('Logout all API failed:', error);
    } finally {
      localStorage.removeItem('payqusta_token');
      set({ user: null, tenant: null, token: null, isAuthenticated: false });
      window.location.href = '/login';
    }
  },

  // --- Multi-Branch Actions ---
  switchTenant: async (tenantId) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/switch-tenant', { tenantId });
      localStorage.setItem('payqusta_token', data.data.token);

      // Reload user with new token
      const meRes = await api.get('/auth/me');
      set({
        token: data.data.token,
        user: meRes.data.data.user,
        tenant: meRes.data.data.tenant,
        loading: false
      });
      window.location.href = '/'; // Refresh to clear any stale state
    } catch (error) {
      set({ loading: false });
      throw error.response?.data || error;
    }
  },

  getBranches: async () => {
    try {
      // Unified endpoint: use /branches (branchController) instead of /tenants/my-branches
      const { data } = await api.get('/branches');
      const payload = data?.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.branches)) return payload.branches;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    } catch (error) {
      return [];
    }
  },

  createBranch: async (data) => {
    set({ loading: true });
    try {
      // Unified endpoint: use /branches (branchController) instead of /tenants/branch
      const res = await api.post('/branches', data);
      set({ loading: false });
      return res.data;
    } catch (error) {
      set({ loading: false });
      throw error.response?.data || error;
    }
  },
}));

// ========== THEME STORE ==========
export const useThemeStore = create((set) => ({
  dark: localStorage.getItem('payqusta_theme') === 'dark',
  toggleTheme: () =>
    set((state) => {
      const newDark = !state.dark;
      localStorage.setItem('payqusta_theme', newDark ? 'dark' : 'light');
      return { dark: newDark };
    }),
}));

// ========== API HELPERS ==========


// Products API
export const productsApi = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getByBarcode: (code) => api.get(`/products/barcode/${code}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  updateStock: (id, data) => api.patch(`/products/${id}/stock`, data),
  getLowStock: () => api.get('/products/low-stock'),
  getSummary: () => api.get('/products/summary'),
  getCategories: () => api.get('/products/categories'),
  requestRestock: (id, quantity) => api.post(`/products/${id}/request-restock`, { quantity }),
  requestRestockBulk: () => api.post('/products/request-restock-bulk'),
  uploadImage: (id, formData) => api.post(`/products/${id}/upload-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteImage: (id, imageUrl) => api.delete(`/products/${id}/images/${encodeURIComponent(imageUrl)}`),
};

// Customers API
export const customersApi = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getTop: (limit) => api.get('/customers/top', { params: { limit } }),
  getDebtors: () => api.get('/customers/debtors'),
  getTransactions: (id) => api.get(`/customers/${id}/transactions`),
  getStatementPDF: (id, params) => api.get(`/customers/${id}/statement-pdf`, { params }),
  sendStatement: (id) => api.post(`/customers/${id}/send-statement`),
  sendStatementPDF: (id, data) => api.post(`/customers/${id}/send-statement-pdf`, data),
  updateWhatsAppPreferences: (id, data) => api.put(`/customers/${id}/whatsapp-preferences`, data),
};

// Invoices API
export const invoicesApi = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  pay: (id, data) => api.post(`/invoices/${id}/pay`, data),
  payAll: (id) => api.post(`/invoices/${id}/pay-all`),
  sendWhatsApp: (id) => api.post(`/invoices/${id}/send-whatsapp`),
  getOverdue: () => api.get('/invoices/overdue'),
  getUpcoming: (days) => api.get('/invoices/upcoming-installments', { params: { days } }),
  getSalesSummary: (period) => api.get('/invoices/sales-summary', { params: { period } }),
};

// Suppliers API
export const suppliersApi = {
  getAll: (params) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
  purchase: (id, data) => api.post(`/suppliers/${id}/purchase`, data),
  pay: (id, paymentId, data) => api.post(`/suppliers/${id}/payments/${paymentId}/pay`, data),
  payAll: (id) => api.post(`/suppliers/${id}/pay-all`),
  sendReminder: (id) => api.post(`/suppliers/${id}/send-reminder`),
  requestRestock: (id) => api.post(`/suppliers/${id}/request-restock`),
  getLowStockProducts: (id) => api.get(`/suppliers/${id}/low-stock-products`),
  getUpcomingPayments: (days) => api.get('/suppliers/upcoming-payments', { params: { days } }),
};

// Dashboard API
export const dashboardApi = {
  getOverview: (params) => api.get('/dashboard/overview', { params }),
  getSalesReport: (params) => api.get('/dashboard/sales-report', { params }),
  getProfitIntelligence: (params) => api.get('/dashboard/profit-intelligence', { params }),
  getRiskScoring: (params) => api.get('/dashboard/risk-scoring', { params }),
  getDailyCollections: (params) => api.get('/dashboard/daily-collections', { params }),
};

// Expenses API
export const expensesApi = {
  getAll: (params) => api.get('/expenses', { params }),
  getSummary: (params) => api.get('/expenses/summary', { params }),
  getCategories: () => api.get('/expenses/categories'),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

// Business Intelligence API
export const biApi = {
  getHealthScore: () => api.get('/bi/health-score'),
  getCashFlowForecast: () => api.get('/bi/cash-flow-forecast'),
  getCommandCenter: () => api.get('/bi/command-center'),
  getAchievements: () => api.get('/bi/achievements'),
  getCustomerLifetimeValue: () => api.get('/bi/customer-lifetime-value'),
  getAgingReport: () => api.get('/bi/aging-report'),
  getRealProfit: (params) => api.get('/bi/real-profit', { params }),
  whatIfSimulator: (data) => api.post('/bi/what-if', data),
};

// Audit Logs API (Tenant Level)
export const auditLogsApi = {
  getLogs: (params) => api.get('/audit-logs', { params }),
  getActiveUsers: () => api.get('/audit-logs/active-users'),
  getLoginHistory: () => api.get('/audit-logs/login-history'),
};

// Customer Credit API
export const creditApi = {
  getAssessment: (id) => api.get(`/customers/${id}/credit-assessment`),
  blockSales: (id, reason) => api.post(`/customers/${id}/block-sales`, { reason }),
  unblockSales: (id) => api.post(`/customers/${id}/unblock-sales`),
  sendStatement: (id) => api.post(`/customers/${id}/send-statement`),
  getStatementPDF: (id) => api.get(`/customers/${id}/statement-pdf`),
};

// Settings API
export const settingsApi = {
  get: () => api.get('/settings'),
  updateStore: (data) => api.put('/settings/store', data),
  updateWhatsApp: (data) => api.put('/settings/whatsapp', data),
  updateBranding: (data) => api.put('/settings/branding', data),
  updateUser: (data) => api.put('/settings/user', data),
  changePassword: (data) => api.put('/settings/password', data),
};

// Restock API
export const restockApi = {
  requestRestock: (productId, quantity) => api.post(`/products/${productId}/request-restock`, { quantity }),
  requestRestockBulk: () => api.post('/products/request-restock-bulk'),
};

// Super Admin API (New)
export const superAdminApi = {
  getTenants: (params) => api.get('/super-admin/tenants', { params }),
  createTenant: (data) => api.post('/super-admin/tenants', data),
  updateTenant: (id, data) => api.put(`/super-admin/tenants/${id}`, data),
  deleteTenant: (id) => api.delete(`/super-admin/tenants/${id}`),
  impersonateTenant: (id) => api.post(`/super-admin/tenants/${id}/impersonate`),
  getAnalytics: () => api.get('/super-admin/analytics'),
  getTenantDetails: (id) => api.get(`/super-admin/tenants/${id}/details`),
};

// Admin API (Legacy / Tenant Admin)
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getStatistics: () => api.get('/admin/statistics'),
  getTenants: (params) => api.get('/admin/tenants', { params }), // Legacy
  createTenant: (data) => api.post('/admin/tenants', data), // Legacy
  updateTenant: (id, data) => api.put(`/admin/tenants/${id}`, data), // Legacy
  deleteTenant: (id) => api.delete(`/admin/tenants/${id}`), // Legacy
  resetTenantPassword: (id, data) => api.post(`/admin/tenants/${id}/reset-password`, data),
  createBranch: (data) => api.post('/branches', data), // Create branch for tenant
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

// Reports API (Business Reports)
export const reportsApi = {
  // Get Reports
  getSalesReport: (params) => api.get('/reports/sales', { params }),
  getProfitReport: (params) => api.get('/reports/profit', { params }),
  getInventoryReport: (params) => api.get('/reports/inventory', { params }),
  getCustomerReport: (params) => api.get('/reports/customers', { params }),
  getProductPerformanceReport: (params) => api.get('/reports/products', { params }),

  // Export Reports (Excel)
  exportSalesReport: (params) => api.get('/reports/export/sales', { params, responseType: 'blob' }),
  exportProfitReport: (params) => api.get('/reports/export/profit', { params, responseType: 'blob' }),
  exportInventoryReport: (params) => api.get('/reports/export/inventory', { params, responseType: 'blob' }),
  exportCustomerReport: (params) => api.get('/reports/export/customers', { params, responseType: 'blob' }),
  exportProductPerformanceReport: (params) => api.get('/reports/export/products', { params, responseType: 'blob' }),
};

// Import API
export const importApi = {
  importProducts: (formData) => api.post('/import/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  importCustomers: (formData) => api.post('/import/customers', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  preview: (formData) => api.post('/import/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  downloadTemplate: (type) => api.get(`/import/template/${type}`, { responseType: 'blob' }),
};

// Backup API
export const backupApi = {
  exportData: () => api.get('/backup/export', { responseType: 'blob' }),
  getStats: () => api.get('/backup/stats'),
  restore: (formData) => api.post('/backup/restore', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Profile API
export const profileApi = {
  updateProfile: (data) => api.put('/auth/update-profile', data),
  updateAvatar: (formData) => api.put('/auth/update-avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  removeAvatar: () => api.delete('/auth/remove-avatar'),
};

// Coupons API
export const couponsApi = {
  getAll: (params) => api.get('/coupons', { params }),
  getStats: () => api.get('/coupons/stats'),
  getById: (id) => api.get(`/coupons/${id}`),
  create: (data) => api.post('/coupons', data),
  update: (id, data) => api.put(`/coupons/${id}`, data),
  delete: (id) => api.delete(`/coupons/${id}`),
  validate: (data) => api.post('/coupons/validate', data),
};

// Reviews API
export const reviewsApi = {
  getAll: (params) => api.get('/reviews', { params }),
  getStats: () => api.get('/reviews/stats'),
  getById: (id) => api.get(`/reviews/${id}`),
  updateStatus: (id, status) => api.patch(`/reviews/${id}/status`, { status }),
  addReply: (id, body) => api.post(`/reviews/${id}/reply`, { body }),
  delete: (id) => api.delete(`/reviews/${id}`),
  getProductReviews: (productId, params) => api.get(`/reviews/product/${productId}`, { params }),
};
