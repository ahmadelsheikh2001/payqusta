import React, { useState, useEffect } from 'react';
import { 
  Crown, Building2, Users, TrendingUp, DollarSign, Activity, 
  Package, ShoppingCart, Plus, ArrowRight, CheckCircle, AlertCircle,
  Server, Zap, Eye
} from 'lucide-react';
import { Card, StatCard, LoadingSpinner, Button } from '../components/UI';
import { api } from '../store';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, tenantsRes] = await Promise.all([
        api.get('/super-admin/analytics'),
        api.get('/super-admin/tenants')
      ]);
      setAnalytics(analyticsRes.data.data);
      setTenants(tenantsRes.data.data.tenants || []);
    } catch (err) {
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');

  // Quick Stats
  const activeTenants = tenants.filter(t => t.isActive).length;
  const totalRevenue = analytics?.overview?.totalRevenue || 0;
  const totalCustomers = analytics?.overview?.customers || 0;
  const totalProducts = analytics?.overview?.products || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">لوحة تحكم Super Admin</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">نظرة شاملة على كل النظام</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button 
            variant="primary" 
            icon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/tenant-management')}
          >
            متجر جديد
          </Button>
        </div>
      </div>

      {/* System Health */}
      <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">حالة النظام</h3>
              <p className="text-sm text-white/80">كل الأنظمة تعمل بشكل طبيعي</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-bold">نشط</span>
          </div>
        </div>
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="إجمالي المتاجر" 
          value={analytics?.overview?.tenants || 0} 
          icon={<Building2 className="w-5 h-5" />} 
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
          subtext={`${activeTenants} نشط`}
        />
        <StatCard 
          title="إجمالي الفروع" 
          value={analytics?.overview?.branches || 0} 
          icon={<Activity className="w-5 h-5" />} 
          gradient="bg-gradient-to-br from-purple-500 to-purple-700" 
        />
        <StatCard 
          title="إجمالي المستخدمين" 
          value={analytics?.overview?.users || 0} 
          icon={<Users className="w-5 h-5" />} 
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" 
        />
        <StatCard 
          title="إجمالي الإيرادات" 
          value={`${fmt(totalRevenue)} ج.م`} 
          icon={<DollarSign className="w-5 h-5" />} 
          gradient="bg-gradient-to-br from-amber-500 to-amber-700" 
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-700 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <p className="text-2xl font-extrabold">{fmt(totalCustomers)}</p>
              <p className="text-xs text-gray-500">إجمالي العملاء</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-700 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-2xl font-extrabold">{fmt(totalProducts)}</p>
              <p className="text-xs text-gray-500">إجمالي المنتجات</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-700 transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-500/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <p className="text-2xl font-extrabold">{fmt(analytics?.overview?.invoices || 0)}</p>
              <p className="text-xs text-gray-500">إجمالي الفواتير</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-700 transition-all cursor-pointer group" onClick={() => navigate('/tenant-management')}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary-600 dark:text-primary-400">عرض جميع</p>
              <p className="text-xs text-gray-500">المتاجر والفروع</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Tenants */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            أعلى المحلات إيراداً
          </h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/tenant-management')}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            عرض الكل
          </Button>
        </div>

        {analytics?.topTenants?.length > 0 ? (
          <div className="space-y-2">
            {analytics.topTenants.map((tenant, i) => (
              <div 
                key={tenant._id} 
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => navigate('/tenant-management')}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold shrink-0 ${
                  i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 
                  i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' : 
                  i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-500'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{tenant.tenantName}</p>
                  <p className="text-xs text-gray-400">{tenant.invoices} فاتورة</p>
                </div>
                <div className="text-left shrink-0">
                  <p className="text-sm font-bold text-emerald-500">{fmt(tenant.revenue)} ج.م</p>
                  <p className="text-xs text-gray-400">إيراد</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد بيانات متاحة</p>
          </div>
        )}
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="p-5 cursor-pointer hover:shadow-lg transition-all group"
          onClick={() => navigate('/tenant-management')}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold">إدارة المتاجر</h4>
              <p className="text-xs text-gray-500">عرض وإدارة جميع المتاجر</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          </div>
        </Card>

        <Card 
          className="p-5 cursor-pointer hover:shadow-lg transition-all group"
          onClick={() => navigate('/admin/users')}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold">إدارة المستخدمين</h4>
              <p className="text-xs text-gray-500">عرض وإدارة المستخدمين</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          </div>
        </Card>

        <Card 
          className="p-5 cursor-pointer hover:shadow-lg transition-all group"
          onClick={() => navigate('/admin/audit-logs')}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold">سجل النشاطات</h4>
              <p className="text-xs text-gray-500">تتبع عمليات النظام</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          </div>
        </Card>
      </div>
    </div>
  );
}
