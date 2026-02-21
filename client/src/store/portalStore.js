import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

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
      return { cart: newCart, isCartOpen: true };
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

  downloadInvoicePDF: async (id) => {
    try {
      const res = await portalApi.get(`/portal/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return { success: true };
    } catch (err) {
      return { success: false, message: 'فشل تحميل الفاتورة' };
    }
  },

  payInvoice: async (id, amount, paymentMethod, notes) => {
    set({ loading: true });
    try {
      const res = await portalApi.post(`/portal/invoices/${id}/pay`, {
        amount,
        paymentMethod: paymentMethod || 'online',
        notes
      });
      set({ loading: false });

      // Update customer balance
      const currentCustomer = get().customer;
      if (currentCustomer) {
        const updatedCustomer = {
          ...currentCustomer,
          outstanding: currentCustomer.outstanding - amount
        };
        localStorage.setItem('portal_customer', JSON.stringify(updatedCustomer));
        set({ customer: updatedCustomer });
      }

      return { success: true, data: res.data.data, message: res.data.message };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'فشل الدفع' };
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

  downloadStatementPDF: async (startDate, endDate) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await portalApi.get('/portal/statement/pdf', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statement.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return { success: true };
    } catch (err) {
      return { success: false, message: 'فشل تحميل كشف الحساب' };
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

  fetchProductDetails: async (id) => {
    try {
      const res = await portalApi.get(`/portal/products/${id}`);
      return res.data.data;
    } catch (err) {
      return null;
    }
  },

  // ═══════════════ ORDERS ═══════════════

  fetchOrders: async (page = 1, status = 'all') => {
    try {
      const params = { page, limit: 15 };
      if (status && status !== 'all') params.status = status;
      const res = await portalApi.get('/portal/orders', { params });
      return res.data.data;
    } catch (err) {
      return null;
    }
  },

  fetchOrderDetails: async (id) => {
    try {
      const res = await portalApi.get(`/portal/orders/${id}`);
      return res.data.data;
    } catch (err) {
      return null;
    }
  },

  cancelOrder: async (id) => {
    set({ loading: true });
    try {
      const res = await portalApi.post(`/portal/orders/${id}/cancel`);
      set({ loading: false });
      return { success: true, message: res.data.message };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'فشل إلغاء الطلب' };
    }
  },

  reorder: async (orderId) => {
    try {
      const res = await portalApi.post(`/portal/orders/${orderId}/reorder`);
      const { items } = res.data.data;
      // Add items to cart
      const currentCart = get().cart;
      const newCart = [...currentCart];
      items.forEach(item => {
        const existingIdx = newCart.findIndex(c => c.cartKey === item.cartKey);
        if (existingIdx > -1) {
          newCart[existingIdx].quantity += item.quantity;
        } else {
          newCart.push(item);
        }
      });
      localStorage.setItem('portal_cart', JSON.stringify(newCart));
      set({ cart: newCart, isCartOpen: true });
      return { success: true, message: res.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'فشل إعادة الطلب' };
    }
  },

  // Checkout (place order with shipping details)
  checkout: async (items, shippingAddress, notes, signature, couponCode) => {
    try {
      const body = { items, shippingAddress, notes, signature };
      if (couponCode) body.couponCode = couponCode;
      const res = await portalApi.post('/portal/cart/checkout', body);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'فشل إنشاء الطلب' };
    }
  },

  // ═══════════════ NOTIFICATIONS ═══════════════

  unreadCount: 0,

  fetchNotifications: async (page = 1) => {
    try {
      const res = await portalApi.get('/portal/notifications', { params: { page } });
      const data = res.data.data;
      set({ unreadCount: data.unreadCount || 0 });
      return data;
    } catch (err) {
      return null;
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await portalApi.get('/portal/notifications/unread-count');
      const count = res.data.data.count || 0;
      set({ unreadCount: count });
      return count;
    } catch (err) {
      return 0;
    }
  },

  markNotificationRead: async (id) => {
    try {
      await portalApi.put(`/portal/notifications/${id}/read`);
      set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) }));
      return true;
    } catch (err) {
      return false;
    }
  },

  markAllNotificationsRead: async () => {
    try {
      await portalApi.put('/portal/notifications/read-all');
      set({ unreadCount: 0 });
      return true;
    } catch (err) {
      return false;
    }
  },

  // ═══════════════ WISHLIST ═══════════════

  wishlistIds: JSON.parse(localStorage.getItem('portal_wishlist') || '[]'),

  toggleWishlist: async (productId) => {
    try {
      const res = await portalApi.post(`/portal/wishlist/${productId}`);
      const { wishlisted } = res.data.data;
      set((state) => {
        let newIds;
        if (wishlisted) {
          newIds = [...state.wishlistIds, productId];
        } else {
          newIds = state.wishlistIds.filter(id => id !== productId);
        }
        localStorage.setItem('portal_wishlist', JSON.stringify(newIds));
        return { wishlistIds: newIds };
      });
      return { success: true, wishlisted, message: res.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'فشل العملية' };
    }
  },

  fetchWishlist: async () => {
    try {
      const res = await portalApi.get('/portal/wishlist');
      const products = res.data.data.products || [];
      const ids = products.map(p => p._id);
      localStorage.setItem('portal_wishlist', JSON.stringify(ids));
      set({ wishlistIds: ids });
      return products;
    } catch (err) {
      return [];
    }
  },

  // ═══════════════ SUPPORT ═══════════════

  sendSupportMessage: async (subject, message, type = 'inquiry') => {
    set({ loading: true });
    try {
      const res = await portalApi.post('/portal/support', { subject, message, type });
      set({ loading: false });
      return { success: true, message: res.data.message, data: res.data.data };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'فشل إرسال الرسالة' };
    }
  },

  fetchSupportMessages: async () => {
    try {
      const res = await portalApi.get('/portal/support');
      return res.data.data;
    } catch (err) {
      return [];
    }
  },

  fetchSupportMessageById: async (id) => {
    try {
      const res = await portalApi.get(`/portal/support/${id}`);
      return res.data.data;
    } catch (err) {
      return null;
    }
  },

  replyToSupportMessage: async (id, message) => {
    set({ loading: true });
    try {
      const res = await portalApi.post(`/portal/support/${id}/reply`, { message });
      set({ loading: false });
      return { success: true, message: res.data.message, data: res.data.data };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'فشل إرسال الرد' };
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

  fetchDocuments: async () => {
    try {
      const res = await portalApi.get('/portal/documents');
      return res.data.data;
    } catch (err) {
      return [];
    }
  },

  uploadDocument: async (type, file) => {
    set({ loading: true });
    try {
      const res = await portalApi.post('/portal/documents', { type, file });
      set({ loading: false });
      return { success: true, message: res.data.message, documents: res.data.data };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'فشل رفع المستند' };
    }
  },

  deleteDocument: async (id) => {
    set({ loading: true });
    try {
      const res = await portalApi.delete(`/portal/documents/${id}`);
      set({ loading: false });
      return { success: true, message: res.data.message, documents: res.data.data };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'فشل حذف المستند' };
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

  // ═══════════════ RETURNS ═══════════════

  createReturnRequest: async (data) => {
    set({ loading: true });
    try {
      const res = await portalApi.post('/portal/returns', data);
      set({ loading: false });
      return { success: true, message: res.data.message };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'فشل تقديم الطلب' };
    }
  },

  fetchReturnRequests: async () => {
    try {
      const res = await portalApi.get('/portal/returns');
      return res.data.data;
    } catch (err) {
      return [];
    }
  },

  // ═══════════════ ADDRESSES ═══════════════

  fetchAddresses: async () => {
    try {
      const res = await portalApi.get('/portal/addresses');
      return res.data.data;
    } catch (err) {
      return [];
    }
  },

  addAddress: async (data) => {
    set({ loading: true });
    try {
      const res = await portalApi.post('/portal/addresses', data);
      set({ loading: false });
      return { success: true, message: res.data.message, addresses: res.data.data };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'فشل إضافة العنوان' };
    }
  },

  updateAddress: async (id, data) => {
    set({ loading: true });
    try {
      const res = await portalApi.put(`/portal/addresses/${id}`, data);
      set({ loading: false });
      return { success: true, message: res.data.message, addresses: res.data.data };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'فشل تحديث العنوان' };
    }
  },

  deleteAddress: async (id) => {
    set({ loading: true });
    try {
      const res = await portalApi.delete(`/portal/addresses/${id}`);
      set({ loading: false });
      return { success: true, message: res.data.message, addresses: res.data.data };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.response?.data?.message || 'فشل حذف العنوان' };
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

  claimDailyReward: async () => {
    try {
      const res = await portalApi.post('/portal/gamification/daily-reward');
      // Update customer points and tier in store if successful
      if (res.data.data) {
        const currentCustomer = get().customer;
        const updatedCustomer = {
          ...currentCustomer,
          points: res.data.data.points,
          tier: res.data.data.tier
        };
        localStorage.setItem('portal_customer', JSON.stringify(updatedCustomer));
        set({ customer: updatedCustomer });
      }
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'فشل جمع المكافأة' };
    }
  },

  fetchPointsHistory: async () => {
    try {
      const res = await portalApi.get('/portal/points/history');
      return res.data.data;
    } catch (err) {
      return null;
    }
  },

  // ═══════════════ REVIEWS ═══════════════

  submitReview: async (data) => {
    try {
      const res = await portalApi.post('/portal/reviews', data);
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'فشل إرسال التقييم' };
    }
  },

  fetchMyReviews: async () => {
    try {
      const res = await portalApi.get('/portal/reviews');
      return res.data.data;
    } catch (err) {
      return null;
    }
  },

  fetchStoreReviews: async (page = 1) => {
    try {
      const res = await portalApi.get('/portal/reviews/store', { params: { page } });
      return res.data.data;
    } catch (err) {
      return null;
    }
  },

  // ═══════════════ COUPONS ═══════════════

  validateCoupon: async (code, orderTotal) => {
    try {
      const res = await portalApi.post('/portal/coupons/validate', { code, orderTotal });
      return { success: true, data: res.data.data, message: res.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'كوبون غير صالح' };
    }
  },
}));
