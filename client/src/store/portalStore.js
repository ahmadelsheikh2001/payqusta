import { create } from 'zustand';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const usePortalStore = create((set, get) => ({
  customer: null,
  token: localStorage.getItem('portal_token') || null,
  isAuthenticated: !!localStorage.getItem('portal_token'),
  loading: false,
  error: null,
  
  // Login
  login: async (phone, password, tenantSlug) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${API_URL}/portal/login`, { phone, password, tenantSlug });
      const { token, customer } = res.data.data;
      
      localStorage.setItem('portal_token', token);
      set({ customer, token, isAuthenticated: true, loading: false });
      return true;
    } catch (err) {
      const msg = err.response?.data?.message || 'فشل تسجيل الدخول';
      set({ error: msg, loading: false });
      return false;
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('portal_token');
    set({ customer: null, token: null, isAuthenticated: false });
  },

  // Fetch Dashboard Data
  fetchDashboard: async () => {
    set({ loading: true });
    try {
      const token = get().token;
      const res = await axios.get(`${API_URL}/portal/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ loading: false });
      return res.data.data;
    } catch (err) {
      if (err.response?.status === 401) get().logout();
      set({ loading: false, error: 'جلسة منتهية' });
      return null;
    }
  }
}));
