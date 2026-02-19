import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { ShoppingCart, LogOut, Home, Grid, User, Wallet, Receipt, FileText, Sun, Moon } from 'lucide-react';

export default function PortalLayout() {
  const { customer, logout, isAuthenticated, fetchDashboard, cart, isCartOpen, toggleCart, removeFromCart, checkout } = usePortalStore();
  const { dark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/portal/login');
    } else if (!customer) {
      fetchDashboard();
    }
  }, [isAuthenticated, navigate]);

  // Dynamic Branding Injection
  useEffect(() => {
    if (customer?.tenant?.branding || usePortalStore.getState().tenant?.branding) {
      const branding = customer.tenant?.branding || usePortalStore.getState().tenant?.branding || {};
      const primary = branding.primaryColor || '#6366f1'; 
      const secondary = branding.secondaryColor || '#10b981';
      
      const root = document.documentElement;
      root.style.setProperty('--color-primary', primary);
      root.style.setProperty('--color-secondary', secondary);
    }
  }, [customer, usePortalStore.getState().tenant]);

  if (!isAuthenticated || !customer) return null;

  const navItems = [
    { icon: Home, label: 'الرئيسية', path: '/portal/dashboard' },
    { icon: Receipt, label: 'فواتيري', path: '/portal/invoices' },
    { icon: Grid, label: 'المنتجات', path: '/portal/products' },
    { icon: ShoppingCart, label: 'السلة', path: '/portal/cart', badge: cart.length },
    { icon: User, label: 'حسابي', path: '/portal/profile' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className={`min-h-screen flex flex-col font-['Cairo'] pb-16 md:pb-0 ${dark ? 'dark' : ''}`} dir="rtl">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
        
        {/* ═══════════════ TOP HEADER ═══════════════ */}
        <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-20 px-4 py-3 flex justify-between items-center border-b border-gray-100 dark:border-gray-800">
          
          {/* User Info & Balance */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md border-2 border-white dark:border-gray-800">
                {customer.name?.[0]}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-none mb-1">
                مرحباً، {customer.name?.split(' ')[0]} 👋
              </h1>
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                <Wallet className="w-3 h-3 text-primary-600" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {customer.balance?.toLocaleString() || 0} <span className="text-[9px] font-normal text-gray-500">ج.م</span>
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <button
              onClick={toggleCart}
              className="relative w-9 h-9 flex items-center justify-center rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-white dark:border-gray-900 animate-bounce">
                  {cart.length}
                </span>
              )}
            </button>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

            <button
              onClick={() => { logout(); navigate('/portal/login'); }}
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ═══════════════ MAIN CONTENT ═══════════════ */}
        <main className="flex-1 p-4 w-full max-w-7xl mx-auto">
          <Outlet />
        </main>

        {/* ═══════════════ MOBILE NAV ═══════════════ */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
          <div className="flex justify-around items-center">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => item.path === '/portal/cart' ? toggleCart() : navigate(item.path)}
                className={`flex flex-col items-center py-2 px-2 transition-colors min-w-0 flex-1 ${
                  isActive(item.path) && item.path !== '/portal/cart'
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                }`}
              >
                <div className="relative">
                  <item.icon className={`w-5 h-5 mb-0.5 ${isActive(item.path) && item.path !== '/portal/cart' ? 'fill-current' : ''}`} />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white dark:border-gray-900">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* ═══════════════ CART DRAWER ═══════════════ */}
        {/* Overlay */}
        {isCartOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
            onClick={toggleCart}
          />
        )}
        
        {/* Drawer */}
        <div className={`fixed inset-y-0 left-0 w-full md:w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${isCartOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary-600" />
              سلة المشتريات
              <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs px-2 py-0.5 rounded-full">
                {cart.length} منتجات
              </span>
            </h2>
            <button onClick={toggleCart} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 transition-colors">
              <Grid className="w-4 h-4 rotate-45" /> {/* Close Icon substitute */}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                 <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                   <ShoppingCart className="w-10 h-10 text-gray-400" />
                 </div>
                 <p className="font-bold text-lg">السلة فارغة</p>
                 <p className="text-sm text-gray-500">تصفح المنتجات وابدأ التسوق الآن</p>
                 <button onClick={toggleCart} className="mt-6 bg-primary-600 text-white px-6 py-2 rounded-xl text-sm font-bold">
                   تصفح المتجر
                 </button>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex gap-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-xl overflow-hidden shrink-0">
                    {item.product.images?.[0] ? (
                      <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Grid className="w-full h-full p-4 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{item.product.name}</h4>
                      <button onClick={() => removeFromCart(item.cartKey)} className="text-gray-400 hover:text-red-500">
                        <LogOut className="w-4 h-4" /> {/* Using LogOut as Delete icon for now if trash not imported */}
                      </button>
                    </div>
                    {item.variant && <p className="text-xs text-gray-500">{item.variant.sku}</p>}
                    <div className="flex justify-between items-end">
                      <p className="font-bold text-primary-600">{item.price.toLocaleString()} ج.م</p>
                      <div className="text-xs font-medium bg-white dark:bg-gray-700 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-600">
                        الكمية: {item.quantity}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500 text-sm">الإجمالي</span>
                <span className="font-black text-xl text-gray-900 dark:text-white">{cartTotal.toLocaleString()} ج.م</span>
              </div>
              <button 
                onClick={() => { toggleCart(); navigate('/portal/checkout'); }}
                className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                < Receipt className="w-5 h-5" />
                إتمام الشراء
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
