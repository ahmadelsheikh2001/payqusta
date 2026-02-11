import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Building2, FileText, DollarSign,
  TrendingUp, Activity, CheckCircle, UserPlus, Store,
  Calendar, ArrowRight, Crown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../store';
import { Card, LoadingSpinner, Badge } from '../components/UI';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDashboard();
      setData(res.data.data);
    } catch (err) {
      toast.error('خطأ في تحميل لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = data?.statistics || {};

  const StatCard = ({ icon: Icon, label, value, subtitle, color = 'primary', badge }) => (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-primary-600" />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${color}-500 to-${color}-600 flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {badge && (
            <Badge variant="success" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <h3 className="text-2xl font-extrabold mb-1">{value?.toLocaleString('ar-EG')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">لوحة تحكم الـ Admin</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">نظرة شاملة على كل النظام</p>
          </div>
        </div>
        <button
          onClick={loadDashboard}
          className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <Activity className="w-4 h-4" />
          <span className="text-sm font-medium">تحديث</span>
        </button>
      </div>

      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Building2}
          label="إجمالي المتاجر"
          value={stats.tenants?.total || 0}
          subtitle={`${stats.tenants?.active || 0} متجر نشط`}
          color="primary"
          badge={stats.tenants?.active > 0 ? `${Math.round((stats.tenants?.active / stats.tenants?.total) * 100)}%` : null}
        />
        <StatCard
          icon={Users}
          label="إجمالي المستخدمين"
          value={stats.users?.total || 0}
          subtitle="عبر كل المتاجر"
          color="blue"
        />
        <StatCard
          icon={FileText}
          label="إجمالي الفواتير"
          value={stats.invoices?.total || 0}
          subtitle="من كل المتاجر"
          color="emerald"
        />
        <StatCard
          icon={Users}
          label="إجمالي العملاء"
          value={stats.customers?.total || 0}
          subtitle="قاعدة بيانات موحدة"
          color="purple"
        />
      </div>

      {/* Revenue Statistics */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            إحصائيات الإيرادات
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">إجمالي الإيرادات</p>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats.revenue?.totalRevenue?.toLocaleString('ar-EG') || '0'} ج.م
              </p>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">إجمالي المدفوع</p>
              <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                {stats.revenue?.totalPaid?.toLocaleString('ar-EG') || '0'} ج.م
              </p>
            </div>
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">المتبقي</p>
              <p className="text-2xl font-extrabold text-red-600 dark:text-red-400">
                {stats.revenue?.totalOutstanding?.toLocaleString('ar-EG') || '0'} ج.م
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Tenants & Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Tenants */}
        <Card>
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Store className="w-5 h-5 text-primary-500" />
              أحدث المتاجر
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data?.recentTenants?.length > 0 ? (
              data.recentTenants.map((tenant) => (
                <div key={tenant._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-sm mb-1">{tenant.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={tenant.subscription?.plan === 'professional' ? 'primary' : 'gray'} className="text-xs">
                          {tenant.subscription?.plan || 'free'}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {format(new Date(tenant.createdAt), 'dd MMM yyyy', { locale: ar })}
                        </span>
                      </div>
                    </div>
                    <Badge variant={tenant.isActive ? 'success' : 'gray'}>
                      {tenant.isActive ? 'نشط' : 'معطل'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400">
                <Store className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>لا توجد متاجر حتى الآن</p>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Users */}
        <Card>
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" />
              أحدث المستخدمين
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[400px] overflow-y-auto">
            {data?.recentUsers?.length > 0 ? (
              data.recentUsers.map((user) => (
                <div key={user._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {user.name?.charAt(0) || 'م'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm truncate">{user.name}</h3>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        {user.tenant && (
                          <p className="text-xs text-gray-500 truncate">{user.tenant.name}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={
                      user.role === 'admin' ? 'warning' :
                      user.role === 'vendor' ? 'primary' :
                      'gray'
                    }>
                      {user.role}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>لا يوجد مستخدمين حتى الآن</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickLink to="/admin/tenants" icon={Building2} label="إدارة المتاجر" color="primary" />
        <QuickLink to="/admin/users" icon={Users} label="إدارة المستخدمين" color="emerald" />
        <QuickLink to="/admin/statistics" icon={TrendingUp} label="الإحصائيات المتقدمة" color="purple" />
        <QuickLink to="/admin/audit-logs" icon={FileText} label="سجلات النظام" color="blue" />
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, color = 'primary' }) {
  return (
    <a
      href={to}
      className={`group p-4 rounded-xl bg-gradient-to-br from-${color}-50 to-${color}-100 dark:from-${color}-500/10 dark:to-${color}-500/5 hover:shadow-lg transition-all duration-200 border border-${color}-100 dark:border-${color}-500/20`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 text-${color}-500`} />
          <span className="font-bold text-sm">{label}</span>
        </div>
        <ArrowRight className={`w-4 h-4 text-${color}-400 group-hover:translate-x-1 transition-transform`} />
      </div>
    </a>
  );
}
