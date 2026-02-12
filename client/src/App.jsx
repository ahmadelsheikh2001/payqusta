import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore, useThemeStore } from './store';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AnimatedNotification from './components/AnimatedNotification';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import CustomersPage from './pages/CustomersPage';
import InvoicesPage from './pages/InvoicesPage';
import SuppliersPage from './pages/SuppliersPage';
import QuickSalePage from './pages/QuickSalePage';
import ReportsPage from './pages/ReportsPage';
import BusinessReportsPage from './pages/BusinessReportsPage';
import CommandCenterPage from './pages/CommandCenterPage';
import ExpensesPage from './pages/ExpensesPage';
import LowStockPage from './pages/LowStockPage';
import SettingsPage from './pages/SettingsPage';
import AgingReportPage from './pages/AgingReportPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminTenantsPage from './pages/AdminTenantsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';
import AdminStatisticsPage from './pages/AdminStatisticsPage';
import UserProfilePage from './pages/UserProfilePage';
import ImportDataPage from './pages/ImportDataPage';
import BackupRestorePage from './pages/BackupRestorePage';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// Admin Route wrapper - Only for Admin users
function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') {
    // Non-admin users trying to access admin pages
    return <Navigate to="/" replace />;
  }

  return children;
}

// Main Layout with Sidebar + Header
function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dark } = useThemeStore();
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className={`flex h-screen overflow-hidden ${dark ? 'dark' : ''}`}>
      <div className="flex h-full w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <ErrorBoundary>
            <Routes>
              {/* Admin Routes - Protected */}
              <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
              <Route path="/admin/statistics" element={<AdminRoute><AdminStatisticsPage /></AdminRoute>} />
              <Route path="/admin/tenants" element={<AdminRoute><AdminTenantsPage /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
              <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogsPage /></AdminRoute>} />

              {/* Regular Routes */}
              <Route path="/" element={<DashboardPage />} />
              <Route path="/quick-sale" element={<QuickSalePage />} />
              <Route path="/command-center" element={<CommandCenterPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/low-stock" element={<LowStockPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/business-reports" element={<BusinessReportsPage />} />
              <Route path="/aging-report" element={<AgingReportPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<UserProfilePage />} />
              <Route path="/import" element={<ImportDataPage />} />
              <Route path="/backup" element={<BackupRestorePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { dark } = useThemeStore();
  const { isAuthenticated, getMe } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      getMe().catch(() => {});
    }
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div className={dark ? 'dark' : ''}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {/* Beautiful Animated Notifications */}
        <AnimatedNotification />

        {/* Keep Toaster for backward compatibility */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: 'Cairo, sans-serif',
              direction: 'rtl',
              borderRadius: '14px',
            },
          }}
        />
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          } />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
