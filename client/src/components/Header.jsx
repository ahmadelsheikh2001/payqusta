import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Sun, Moon, Search } from 'lucide-react';
import { useThemeStore } from '../store';
import NotificationDropdown from './NotificationDropdown';
import GlobalSearch from './GlobalSearch';
import BranchSwitcher from './BranchSwitcher';

const pageTitles = {
  '/': 'لوحة التحكم',
  '/products': 'المنتجات',
  '/customers': 'العملاء',
  '/invoices': 'الفواتير',
  '/suppliers': 'الموردين',
  '/settings': 'الإعدادات',
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const { dark, toggleTheme } = useThemeStore();
  const title = pageTitles[location.pathname] || 'لوحة التحكم';
  const [searchOpen, setSearchOpen] = useState(false);

  // Keyboard shortcut: Ctrl+K or Cmd+K to open search
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-extrabold">{title}</h2>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Branch Switcher */}
          <BranchSwitcher />

          {/* Global Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            title="بحث سريع (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">بحث...</span>
            <kbd className="hidden lg:inline-block px-2 py-0.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded">
              Ctrl+K
            </kbd>
          </button>

          {/* Mobile Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-all active:scale-95"
            title="بحث سريع"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Real Notification System */}
          <NotificationDropdown />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-all active:scale-95"
          >
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
