import { create } from 'zustand';
import axios from 'axios';

const API_URL = '/api/v1';

// Create axios instance for portal
export const portalApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Auto-inject token
portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('portal_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('portal_token');
      localStorage.removeItem('portal_customer');
      localStorage.removeItem('portal_tenant');
      if (window.location.pathname.startsWith('/portal') && !window.location.pathname.includes('/login')) {
        window.location.href = '/portal/login';
      }
    }
    return Promise.reject(error);
  }
);

export const usePortalStore = create((set, get) => ({
  customer: JSON.parse(localStorage.getItem('portal_customer') || 'null'),
  tenant: JSON.parse(localStorage.getItem('portal_tenant') || 'null'),
  token: localStorage.getItem('portal_token') || null,
  isAuthenticated: !!localStorage.getItem('portal_token'),
  loading: false,
  error: null,

  // ═══════════════ CART ═══════════════
  cart: JSON.parse(localStorage.getItem('portal_cart') || '[]'),
  isCartOpen: false,

  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

  addToCart: (product, quantity = 1, variant = null) => {
    set((state) => {
      const cartKey = variant ? `${product._id}-${variant.sku}` : product._id;
      const existingItemIndex = state.cart.findIndex((item) => item.cartKey === cartKey);

      let newCart;
      if (existingItemIndex > -1) {
        newCart = [...state.cart];
        newCart[existingItemIndex].quantity += quantity;
      } else {
        newCart = [...state.cart, {
          product,
          variant,
          quantity,
          cartKey,
          price: variant ? variant.price : product.price
        }];
      }

      localStorage.setItem('portal_cart', JSON.stringify(newCart));
      return { cart: newCart, isCartOpen: true }; // Open cart on add
    });
  },

  removeFromCart: (cartKey) => {
    set((state) => {
      const newCart = state.cart.filter((item) => item.cartKey !== cartKey);
      localStorage.setItem('portal_cart', JSON.stringify(newCart));
      return { cart: newCart };
    });
  },

  updateCartQuantity: (cartKey, quantity) => {
    set((state) => {
      const newCart = state.cart.map((item) => {
        if (item.cartKey === cartKey) {
          return { ...item, quantity: Math.max(1, quantity) };
        }
        return item;
      });
      localStorage.setItem('portal_cart', JSON.stringify(newCart));
      return { cart: newCart };
    });
  },

  clearCart: () => {
    localStorage.removeItem('portal_cart');
    set({ cart: [] });
  },

  // ═══════════════ AUTH ═══════════════

  login: async (phone, password, storeCode) => {
    set({ loading: true, error: null });
    try {
      const res = await portalApi.post('/portal/login', { phone, password, tenantSlug: storeCode });
      const { token, customer, tenant } = res.data.data;

      localStorage.setItem('portal_token', token);
      localStorage.setItem('portal_customer', JSON.stringify(customer));
      localStorage.setItem('portal_tenant', JSON.stringify(tenant));
      set({ customer, tenant, token, isAuthenticated: true, loading: false });
      return { success: true, message: res.data.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'فشل تسجيل الدخول';
      set({ error: msg, loading: false });
      return { success: false, message: msg };
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await portalApi.post('/portal/register', {
        name: data.name,
        phone: data.phone,
        password: data.password,
        confirmPassword: data.confirmPassword,
        storeCode: data.storeCode,
        tenantSlug: data.storeCode,
      });
      const { token, customer, tenant } = res.data.data;

      localStorage.setItem('portal_token', token);
      localStorage.setItem('portal_customer', JSON.stringify(customer));
      localStorage.setItem('portal_tenant', JSON.stringify(tenant));
      set({ customer, tenant, token, isAuthenticated: true, loading: false });
      return { success: true, message: res.data.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'فشل إنشاء الحساب';
      set({ error: msg, loading: false });
      return { success: false, message: msg };
    }
  },

  activate: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await portalApi.post('/portal/activate', {
        phone: data.phone,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
        storeCode: data.storeCode,
        tenantSlug: data.storeCode,
      });
      const { token, customer, tenant } = res.data.data;

      localStorage.setItem('portal_token', token);
      localStorage.setItem('portal_customer', JSON.stringify(customer));
      localStorage.setItem('portal_tenant', JSON.stringify(tenant));
      set({ customer, tenant, token, isAuthenticated: true, loading: false });
      return { success: true, message: res.data.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'فشل تفعيل الحساب';
      set({ error: msg, loading: false });
      return { success: false, message: msg };
    }
  },

  logout: () => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_customer');
    localStorage.removeItem('portal_tenant');
    localStorage.removeItem('portal_cart');
    set({ customer: null, tenant: null, token: null, isAuthenticated: false, error: null });
  },

  // ═══════════════ DASHBOARD ═══════════════

  fetchDashboard: async () => {
    set({ loading: true });
    try {
      const res = await portalApi.get('/portal/dashboard');
      const data = res.data.data;
      if (data.profile) {
        const updatedCustomer = {
          ...get().customer,
          name: data.profile.name,
          tier: data.profile.tier,
          points: data.profile.points,
          balance: data.wallet.availableCredit,
          creditLimit: data.wallet.creditLimit,
          outstanding: data.wallet.usedCredit,
        };
        localStorage.setItem('portal_customer', JSON.stringify(updatedCustomer));
        set({ customer: updatedCustomer });

        // Update tenant branding if available
        if (data.store) {
          const currentTenant = get().tenant || {};
          const updatedTenant = {
            ...currentTenant,
            name: data.store.name,
            branding: {
              ...currentTenant.branding,
              logo: data.store.logo,
              primaryColor: data.store.primaryColor,
              secondaryColor: data.store.secondaryColor,
            }
          };
          localStorage.setItem('portal_tenant', JSON.stringify(updatedTenant));
          set({ tenant: updatedTenant });
        }
      }
      set({ loading: false });
      return data;
    } catch (err) {
      set({ loading: false });
      return null;
    }
  },

  // ═══════════════ INVOICES ═══════════════

  fetchInvoices: async (page = 1, status = 'all') => {
    try {
      const params = { page, limit: 15 };
      if (status && status !== 'all') params.status = status;
      const res = await portalApi.get('/portal/invoices', { params });
      return res.data.data;
    } catch (err) {
      return null;
    }
  },

  fetchInvoiceDetails: async (id) => {
    try {
      const res = await portalApi.get(`/portal/invoices/${id}`);
      return res.data.data;
    } catch (err) {
      return null;
    }
  },

  // ═══════════════ STATEMENT ═══════════════

  fetchStatement: async (startDate, endDate) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await portalApi.get('/portal/statement', { params });
      return res.data.data;
    } catch (err) {
      return null;
    }
  },

  // ═══════════════ PRODUCTS ═══════════════

  fetchProducts: async (page = 1, search = '', category = '') => {
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (category) params.category = category;
      const res = await portalApi.get('/portal/products', { params });
      return res.data.data;
    } catch (err) {
      return null;
    }
  },

  // ═══════════════ CHECKOUT ═══════════════

  checkout: async (items) => {
    set({ loading: true });
    try {
      const res = await portalApi.post('/portal/cart/checkout', { items });
      set({ loading: false });
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (err) {
      set({ loading: false });
      const msg = err.response?.data?.message || 'فشل إتمام الطلب';
      return { success: false, message: msg };
    }
  },

  // ═══════════════ PROFILE ═══════════════

  updateProfile: async (data) => {
    set({ loading: true });
    try {
      const res = await portalApi.put('/portal/profile', data);
      const updatedCustomer = { ...get().customer, ...data };
      localStorage.setItem('portal_customer', JSON.stringify(updatedCustomer));
      set({ customer: updatedCustomer, loading: false });
      return { success: true, message: res.data.message };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'فشل تحديث البيانات' };
    }
  },

  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    set({ loading: true });
    try {
      const res = await portalApi.put('/portal/change-password', { currentPassword, newPassword, confirmPassword });
      set({ loading: false });
      return { success: true, message: res.data.message };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'فشل تغيير كلمة المرور' };
    }
  },

  // ═══════════════ POINTS ═══════════════

  fetchPoints: async () => {
    try {
      const res = await portalApi.get('/portal/points');
      return res.data.data;
    } catch (err) {
      return null;
    }
  },
}));
