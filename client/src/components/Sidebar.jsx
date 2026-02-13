import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, FileText, Truck,
  Settings, LogOut, X, Zap, BarChart3, Target, Receipt,
  AlertTriangle, ChevronDown, ChevronLeft, Boxes, Clock,
  PieChart, TrendingUp, Crown, Building2, Shield, Activity,
  Upload, Database,
} from 'lucide-react';
import { useAuthStore } from '../store';

export default function Sidebar({ open, onClose }) {
  const { user, tenant, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Dropdown states
  const [adminOpen, setAdminOpen] = useState(
    location.pathname.startsWith('/admin')
  );
  const [productsOpen, setProductsOpen] = useState(
    location.pathname.startsWith('/products') || location.pathname === '/low-stock'
  );
  const [reportsOpen, setReportsOpen] = useState(
    location.pathname.startsWith('/reports') || location.pathname === '/aging-report' || location.pathname === '/business-reports'
  );
  const [toolsOpen, setToolsOpen] = useState(
    location.pathname === '/import' || location.pathname === '/backup'
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Check if paths are active
  const isAdminActive = location.pathname.startsWith('/admin');
  const isProductsActive = location.pathname.startsWith('/products') || location.pathname === '/low-stock';
  const isReportsActive = location.pathname.startsWith('/reports') || location.pathname === '/aging-report' || location.pathname === '/business-reports';
  const isToolsActive = location.pathname === '/import' || location.pathname === '/backup';

  const NavItem = ({ to, icon: Icon, label, end = false, badge = null }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-300'
        }`
      }
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
          {badge}
        </span>
      )}
    </NavLink>
  );

  const SubNavItem = ({ to, icon: Icon, label }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 pr-12 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
            : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-600 dark:hover:text-gray-300'
        }`
      }
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </NavLink>
  );

  const DropdownButton = ({ isOpen, isActive, onClick, icon: Icon, label }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 shadow-sm'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span>{label}</span>
      </div>
      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">
              Pay<span className="text-primary-500">Qusta</span>
            </h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 -mt-0.5">نظام إدارة المبيعات</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        {/* Admin Section - Only for Admin Users */}
        {user?.role === 'admin' && (
          <>
            <div className="px-2 py-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <Crown className="w-3 h-3" />
                <span>Admin Panel</span>
              </div>
            </div>
            <div>
              <DropdownButton
                isOpen={adminOpen}
                isActive={isAdminActive}
                onClick={() => setAdminOpen(!adminOpen)}
                icon={Crown}
                label="إدارة النظام"
              />
              <div className={`overflow-hidden transition-all duration-200 ${adminOpen ? 'max-h-72 mt-1' : 'max-h-0'}`}>
                <div className="space-y-1 py-1">
                  <SubNavItem to="/admin/dashboard" icon={LayoutDashboard} label="لوحة Admin" />
                  <SubNavItem to="/admin/statistics" icon={TrendingUp} label="إحصائيات متقدمة" />
                  <SubNavItem to="/admin/tenants" icon={Building2} label="المتاجر" />
                  <SubNavItem to="/admin/users" icon={Shield} label="المستخدمين" />
                  <SubNavItem to="/admin/audit-logs" icon={Activity} label="السجلات" />
                </div>
              </div>
            </div>
            <div className="my-3 border-t border-gray-200 dark:border-gray-700" />
          </>
        )}

        <NavItem to="/" icon={LayoutDashboard} label="لوحة التحكم" end />
        <NavItem to="/quick-sale" icon={Zap} label="بيع سريع ⚡" />
        <NavItem to="/command-center" icon={Target} label="مركز القيادة" />
        
        {/* Products Dropdown */}
        <div>
          <DropdownButton 
            isOpen={productsOpen}
            isActive={isProductsActive}
            onClick={() => setProductsOpen(!productsOpen)}
            icon={Package}
            label="المنتجات"
          />
          <div className={`overflow-hidden transition-all duration-200 ${productsOpen ? 'max-h-40 mt-1' : 'max-h-0'}`}>
            <div className="space-y-1 py-1">
              <SubNavItem to="/products" icon={Boxes} label="كل المنتجات" />
              <SubNavItem to="/low-stock" icon={AlertTriangle} label="نقص المخزون" />
            </div>
          </div>
        </div>

        <NavItem to="/customers" icon={Users} label="العملاء" />
        <NavItem to="/invoices" icon={FileText} label="الفواتير" />
        <NavItem to="/suppliers" icon={Truck} label="الموردين" />
        <NavItem to="/expenses" icon={Receipt} label="المصروفات" />
        
        {/* Reports Dropdown */}
        <div>
          <DropdownButton 
            isOpen={reportsOpen}
            isActive={isReportsActive}
            onClick={() => setReportsOpen(!reportsOpen)}
            icon={BarChart3}
            label="التقارير"
          />
          <div className={`overflow-hidden transition-all duration-200 ${reportsOpen ? 'max-h-60 mt-1' : 'max-h-0'}`}>
            <div className="space-y-1 py-1">
              <SubNavItem to="/reports" icon={PieChart} label="التقارير العامة" />
              <SubNavItem to="/business-reports" icon={TrendingUp} label="التقارير التجارية" />
              <SubNavItem to="/aging-report" icon={Clock} label="أعمار الديون" />
            </div>
          </div>
        </div>

        {/* Tools Dropdown */}
        <div>
          <DropdownButton
            isOpen={toolsOpen}
            isActive={isToolsActive}
            onClick={() => setToolsOpen(!toolsOpen)}
            icon={Database}
            label="الأدوات"
          />
          <div className={`overflow-hidden transition-all duration-200 ${toolsOpen ? 'max-h-40 mt-1' : 'max-h-0'}`}>
            <div className="space-y-1 py-1">
              <SubNavItem to="/import" icon={Upload} label="استيراد البيانات" />
              <SubNavItem to="/backup" icon={Database} label="النسخ الاحتياطي" />
            </div>
          </div>
        </div>

        <NavItem to="/settings" icon={Settings} label="الإعدادات" />
      </nav>

      {/* User Card */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.name?.charAt(0) || 'م'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{tenant?.name || 'متجري'}</p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email || ''}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <aside className="absolute right-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-2xl animate-slide-right flex flex-col">
            <button
              onClick={onClose}
              className="absolute left-3 top-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
