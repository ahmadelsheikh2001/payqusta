import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { ShoppingCart, LogOut, Home, Grid, User, Wallet, Receipt, FileText, Sun, Moon, Package, Bell, Heart, MessageCircle, X, Trash2, Calculator, RefreshCcw, MapPin, Award, Star } from 'lucide-react';

export default function PortalLayout() {
  const { customer, logout, isAuthenticated, fetchDashboard, cart, isCartOpen, toggleCart, removeFromCart, unreadCount, fetchUnreadCount } = usePortalStore();
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

  // Poll unread notifications count
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000); // every minute
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

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
    { icon: Package, label: 'طلباتي', path: '/portal/orders' },
    { icon: Receipt, label: 'فواتيري', path: '/portal/invoices' },
    { icon: RefreshCcw, label: 'المرتجعات', path: '/portal/returns' },
    { icon: Award, label: 'النقاط', path: '/portal/points' },
    { icon: Star, label: 'تقييماتي', path: '/portal/reviews' },
    { icon: Calculator, label: 'حاسبة الأقساط', path: '/portal/calculator' },
    { icon: FileText, label: 'المستندات', path: '/portal/documents' },
    { icon: MapPin, label: 'العناوين', path: '/portal/addresses' },
    { icon: ShoppingCart, label: 'السلة', path: '/portal/cart', badge: cart.length, isCart: true },
    { icon: User, label: 'حسابي', path: '/portal/profile' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className={`min-h-screen flex flex-col font-['Cairo'] pb-16 md:pb-0 ${dark ? 'dark' : ''}`} dir="rtl">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">

        {/* ═══════════════ TOP HEADER ═══════════════ */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-sm sticky top-0 z-20 px-4 py-3 flex justify-between items-center border-b border-gray-100 dark:border-gray-800 transition-all">
          <div className="flex items-center gap-4">
            {/* Brand Logo & Name */}
            <Link to="/portal/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl shadow-inner flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700 p-1.5 transition-transform group-hover:scale-105 active:scale-95">
                {customer?.tenant?.branding?.logo ? (
                  <img src={customer.tenant.branding.logo} alt={customer.tenant.name} className="w-full h-full object-contain" />
                ) : (
                  <Package className="w-full h-full text-primary-600" />
                )}
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-black text-gray-900 dark:text-white leading-tight uppercase tracking-wide">
                  {customer?.tenant?.name || 'PayQusta'}
                </span>
                <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-1.5 rounded w-fit">
                  PORTAL
                </span>
              </div>
            </Link>

            <div className="w-px h-8 bg-gray-200 dark:bg-gray-800 mx-1 hidden sm:block" />

            {/* User Info & Balance */}
            <Link to="/portal/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity select-none group">
              <div className="relative">
                <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md border-2 border-white dark:border-gray-800 overflow-hidden">
                  {customer.profilePhoto ? (
                    <img src={customer.profilePhoto} alt={customer.name} className="w-full h-full object-cover" />
                  ) : (
                    customer.name?.[0]
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xs font-bold text-gray-900 dark:text-white leading-none mb-1 group-hover:text-primary-600 transition-colors">
                  {customer.name?.split(' ')[0]}
                </h1>
                <div className="flex items-center gap-1">
                  <Wallet className="w-2.5 h-2.5 text-primary-600" />
                  <span className="text-[10px] font-black text-gray-700 dark:text-gray-300">
                    {customer.balance?.toLocaleString() || 0} <span className="text-[8px] font-normal opacity-60">ج.م</span>
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Wishlist */}
            <button
              onClick={() => navigate('/portal/wishlist')}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-90"
            >
              <Heart className="w-5 h-5" />
            </button>

            {/* Notifications Bell */}
            <button
              onClick={() => navigate('/portal/notifications')}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-90"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-90"
            >
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Cart */}
            <button
              onClick={toggleCart}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-90"
            >
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary-600 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900 animate-pulse">
                  {cart.length}
                </span>
              )}
            </button>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

            <button
              onClick={() => { logout(); navigate('/portal/login'); }}
              className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ═══════════════ MAIN CONTENT ═══════════════ */}
        <div className="flex-1 w-full max-w-7xl mx-auto flex">
          {/* Desktop Sidebar Navigation */}
          <aside className="hidden md:block w-64 p-4 shrink-0">
            <div className="sticky top-24 bg-white dark:bg-gray-900 rounded-3xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm space-y-2">
              <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-2">
                القائمة الرئيسية
              </h3>
              {navItems.map((item) => {
                if (item.isCart) return null; // Cart is handled in header
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group ${active
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-bold'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white font-medium'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl transition-colors ${active
                        ? 'bg-primary-100 dark:bg-primary-900/30'
                        : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-700'
                        }`}>
                        <item.icon className={`w-5 h-5 ${active ? 'fill-current/20' : ''}`} />
                      </div>
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Page Content */}
          <main className="flex-1 p-4 w-full min-w-0">
            <Outlet />
          </main>
        </div>

        {/* ═══════════════ MOBILE NAV ═══════════════ */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 md:hidden z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around items-center px-2 py-1">
            {navItems.map((item) => {
              // Hide some items on mobile to prevent crowding
              if (['/portal/calculator', '/portal/returns', '/portal/documents'].includes(item.path)) return null;

              const active = isActive(item.path) && !item.isCart;
              return (
                <button
                  key={item.path}
                  onClick={() => item.isCart ? toggleCart() : navigate(item.path)}
                  className={`flex flex-col items-center justify-center py-2 px-1 min-w-[64px] rounded-2xl transition-all active:scale-95 ${active
                      ? 'text-primary-600 dark:text-primary-400 font-bold'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                  <div className={`relative p-1.5 rounded-xl transition-all ${active ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                    <item.icon className={`w-6 h-6 ${active ? 'fill-current/20' : ''}`} strokeWidth={active ? 2.5 : 2} />
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] mt-0.5 truncate ${active ? 'opacity-100' : 'opacity-80'}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* ═══════════════ CART DRAWER ═══════════════ */}
        {isCartOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
            onClick={toggleCart}
          />
        )}

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
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* ═══════════════ UPSELLING BANNER ═══════════════ */}
            {cart.length > 0 && cartTotal < 1000 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-800/30 rounded-2xl p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">شحن مجاني!</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    أضف منتجات بقيمة {(1000 - cartTotal).toLocaleString()} ج.م إضافية للحصول على شحن مجاني
                  </p>
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${(cartTotal / 1000) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}

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
                      <Package className="w-full h-full p-4 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{item.product.name}</h4>
                      <button onClick={() => removeFromCart(item.cartKey)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
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
                <Receipt className="w-5 h-5" />
                إتمام الشراء
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
