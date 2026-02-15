import React, { useState, Suspense, lazy } from 'react';
import {
  Store, User, MessageCircle, Tag, CreditCard, Palette, Users
} from 'lucide-react';
import { useThemeStore } from '../store';
import { LoadingSpinner } from '../components/UI';

// Lazy load all settings components to improve performance
const SettingsStore = lazy(() => import('../components/settings/SettingsStore'));
const SettingsProfile = lazy(() => import('../components/settings/SettingsProfile'));
const SettingsWhatsApp = lazy(() => import('../components/settings/SettingsWhatsApp'));
const SettingsCategories = lazy(() => import('../components/settings/SettingsCategories'));
const SettingsInstallments = lazy(() => import('../components/settings/SettingsInstallments'));
const SettingsUsers = lazy(() => import('../components/settings/SettingsUsers'));

// Settings tabs configuration
const TABS = [
  { id: 'store', label: 'المتجر', icon: Store, color: 'primary' },
  { id: 'profile', label: 'حسابي', icon: User, color: 'emerald' },
  { id: 'users', label: 'المستخدمين', icon: Users, color: 'blue' },
  { id: 'whatsapp', label: 'واتساب', icon: MessageCircle, color: 'green' },
  { id: 'categories', label: 'التصنيفات', icon: Tag, color: 'purple' },
  { id: 'installments', label: 'الأقساط', icon: CreditCard, color: 'blue' },
  { id: 'appearance', label: 'المظهر', icon: Palette, color: 'pink' },
];

export default function SettingsPage() {
  const { dark, toggleTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState('store');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'store': return <SettingsStore />;
      case 'profile': return <SettingsProfile />;
      case 'users': return <SettingsUsers />;
      case 'whatsapp': return <SettingsWhatsApp />;
      case 'categories': return <SettingsCategories />;
      case 'installments': return <SettingsInstallments />;
      case 'appearance':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center shadow-lg">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">المظهر</h2>
                <p className="text-sm text-gray-400">تخصيص واجهة التطبيق</p>
              </div>
            </div>
            
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold">الوضع الليلي</h3>
                <p className="text-sm text-gray-400">تبديل بين الفاتح والداكن</p>
              </div>
              <button
                onClick={toggleTheme}
                className={`w-14 h-8 rounded-full transition-colors relative ${dark ? 'bg-primary-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${dark ? 'left-1 translate-x-0' : 'left-1 translate-x-6'}`} />
              </button> 
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)]">
      {/* Sidebar Navigation for Settings */}
      <div className="w-full lg:w-64 flex-shrink-0">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden sticky top-6">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-bold text-lg">الإعدادات</h2>
          </div>
          <nav className="p-2 space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              // Hardcoded colors for now to match original styles roughly
              const colorClass = isActive 
                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800';

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${colorClass}`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary-500' : 'text-gray-400'}`} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 overflow-y-auto">
        <Suspense fallback={<LoadingSpinner text="جاري التحميل..." />}>
          {renderTabContent()}
        </Suspense>
      </div>
    </div>
  );
}
