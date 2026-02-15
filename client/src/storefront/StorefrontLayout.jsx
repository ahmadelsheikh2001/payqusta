import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, X } from 'lucide-react';
import axios from 'axios';

export default function StorefrontLayout({ children }) {
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    loadSettings();
    loadCartCount();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await axios.get('/api/v1/settings');
      setSettings(res.data.data);
    } catch (err) {}
  };

  const loadCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
  };

  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = () => loadCartCount();
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/store" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-black text-xl">
                {settings?.store?.name?.[0] || 'P'}
              </div>
              <span className="text-xl font-black bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                {settings?.store?.name || 'PayQusta Store'}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/store" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 font-medium">
                الرئيسية
              </Link>
              <Link to="/store/products" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 font-medium">
                المنتجات
              </Link>
              <Link to="/store/about" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 font-medium">
                من نحن
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Link 
                to="/store/cart" 
                className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ShoppingCart className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              <button 
                className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
              <nav className="flex flex-col gap-3">
                <Link to="/store" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 font-medium py-2">
                  الرئيسية
                </Link>
                <Link to="/store/products" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 font-medium py-2">
                  المنتجات
                </Link>
                <Link to="/store/about" className="text-gray-700 dark:text-gray-300 hover:text-primary-600 font-medium py-2">
                  من نحن
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-3">{settings?.store?.name || 'PayQusta Store'}</h3>
              <p className="text-gray-500 text-sm">{settings?.store?.address || 'متجر إلكتروني متكامل'}</p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-3">روابط سريعة</h3>
              <div className="flex flex-col gap-2 text-sm">
                <Link to="/store" className="text-gray-500 hover:text-primary-600">الرئيسية</Link>
                <Link to="/store/products" className="text-gray-500 hover:text-primary-600">المنتجات</Link>
                <Link to="/store/cart" className="text-gray-500 hover:text-primary-600">سلة التسوق</Link>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-3">تواصل معنا</h3>
              <div className="text-sm text-gray-500 space-y-1">
                {settings?.store?.phone && <p>📞 {settings.store.phone}</p>}
                {settings?.store?.email && <p>📧 {settings.store.email}</p>}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-6 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} {settings?.store?.name || 'PayQusta'}. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>
    </div>
  );
}
