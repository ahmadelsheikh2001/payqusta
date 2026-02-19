import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { usePortalStore } from "../store/portalStore";
import { ShoppingCart, LogOut, Home, Grid, User, Wallet } from 'lucide-react';

export default function PortalLayout() {
  const { customer, logout, isAuthenticated, fetchDashboard } = usePortalStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/portal/login');
    } else if (!customer) {
      fetchDashboard(); 
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !customer) return null;

  const navItems = [
    { icon: Home, label: 'الرئيسية', path: '/portal/dashboard' },
    { icon: Grid, label: 'المنتجات', path: '/portal/products' },
    { icon: ShoppingCart, label: 'السلة', path: '/portal/cart' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-['Cairo'] pb-16 md:pb-0">
      {/* Top Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
            {customer.name?.[0]}
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">{customer.name}</h1>
            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
              <Wallet className="w-3 h-3" />
              رصيد متاح: {customer.balance?.toLocaleString()} ج.م
            </p>
          </div>
        </div>
        <button 
          onClick={() => { logout(); navigate('/portal/login'); }}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:max-w-3xl md:mx-auto md:w-full">
        <Outlet />
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-2 px-4 transition-colors ${
                isActive(item.path) ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <item.icon className={`w-6 h-6 mb-1 ${isActive(item.path) ? 'fill-current' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
