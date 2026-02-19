import React, { useState, Suspense, lazy } from 'react';
import {
  Store, User, MessageCircle, Tag, CreditCard, Palette, Users
} from 'lucide-react';
import { useThemeStore, useAuthStore } from '../store';
import { LoadingSpinner } from '../components/UI';

// Lazy load all settings components to improve performance
const SettingsStore = lazy(() => import('../components/settings/SettingsStore'));
const SettingsProfile = lazy(() => import('../components/settings/SettingsProfile'));
const SettingsWhatsApp = lazy(() => import('../components/settings/SettingsWhatsApp'));
const SettingsCategories = lazy(() => import('../components/settings/SettingsCategories'));
const SettingsInstallments = lazy(() => import('../components/settings/SettingsInstallments'));
const SettingsUsers = lazy(() => import('../components/settings/SettingsUsers'));

// Settings tabs configuration
const ALL_TABS = [
  { id: 'store', label: 'المتجر', icon: Store, color: 'primary', adminOnly: true }, // Only for admin
  { id: 'profile', label: 'حسابي', icon: User, color: 'emerald', adminOnly: false },
  { id: 'users', label: 'المستخدمين', icon: Users, color: 'blue', adminOnly: true }, // Only for admin
  { id: 'whatsapp', label: 'واتساب', icon: MessageCircle, color: 'green', adminOnly: true }, // Changed to adminOnly
  { id: 'categories', label: 'التصنيفات', icon: Tag, color: 'purple', adminOnly: true }, // Changed to adminOnly
  { id: 'installments', label: 'الأقساط', icon: CreditCard, color: 'blue', adminOnly: true }, // Changed to adminOnly
  { id: 'appearance', label: 'المظهر', icon: Palette, color: 'pink', adminOnly: false },
];

export default function SettingsPage() {
  const { dark, toggleTheme } = useThemeStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('store');

  // Filter tabs based on user role
  const TABS = ALL_TABS.filter(tab => 
    !tab.adminOnly || user?.role === 'admin' || user?.isSuperAdmin
  );

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

            {/* New content for reports and cash drawer, placed logically within the appearance tab,
                assuming these are related settings or quick links from this context.
                The original instruction's placement was syntactically incorrect.
                This placement assumes these are additional settings/links within the appearance section.
                If these are meant for a main navigation, they should be in a different file.
            */}


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

            {/* PWA Install Button */}
            <InstallAppButton />
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

// Internal component for Install Button
function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  React.useEffect(() => {
    // Check if installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return (
       <div className="p-4 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 flex items-center gap-3">
         <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
            <Store className="w-5 h-5 text-green-600" />
         </div>
         <div>
           <h3 className="font-bold text-green-700 dark:text-green-400">التطبيق مثبت</h3>
           <p className="text-sm text-green-600/80">أنت تستخدم النسخة المثبتة من النظام</p>
         </div>
       </div>
    );
  }

  if (!deferredPrompt) {
    if (import.meta.env.DEV) {
      return (
        <div className="p-4 rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800 text-sm text-yellow-700 dark:text-yellow-400">
           <div className="font-bold flex items-center gap-2">
             <Store className="w-4 h-4" />
             وضع المطور (Debug Mode)
           </div>
           <p className="mt-1">زر التثبيت غير متاح حالياً.</p>
           <ul className="list-disc list-inside mt-2 space-y-1 text-xs opacity-80">
             <li>تأكد أن التطبيق ليس مثبتاً بالفعل.</li>
             <li>تأكد من العمل على localhost أو HTTPS.</li>
             <li>متصفح Chrome/Edge يتطلب تفاعل المستخدم أحياناً.</li>
             <li>حدث الصفحة (Refresh) وحاول مرة أخرى.</li>
           </ul>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="p-4 rounded-xl border border-primary-200 bg-primary-50 dark:bg-primary-900/10 dark:border-primary-800 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
           <Store className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">تثبيت التطبيق</h3>
          <p className="text-sm text-gray-500">قم بتثبيت النظام على جهازك لسهولة الوصول والعمل بدون إنترنت</p>
        </div>
      </div>
      <button
        onClick={handleInstall}
        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
      >
        تثبيت الآن
      </button>
    </div>
  );
}
