import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Building2, Users, DollarSign, Target,
  PieChart, BarChart3, Activity, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../store';
import { Card, LoadingSpinner, Badge } from '../components/UI';

export default function AdminStatisticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getStatistics();
      setData(res.data.data);
    } catch (err) {
      toast.error('خطأ في تحميل الإحصائيات');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">إحصائيات متقدمة</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">تحليل شامل للنظام</p>
          </div>
        </div>
        <button
          onClick={loadStatistics}
          className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <Activity className="w-4 h-4" />
          <span className="text-sm font-medium">تحديث</span>
        </button>
      </div>

      {/* Top Tenants by Revenue */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-500" />
            أفضل 10 متاجر (حسب الإيرادات)
          </h2>
          <div className="space-y-3">
            {data?.topTenants?.map((tenant, index) => (
              <div
                key={tenant._id}
                className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-500 text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{tenant.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{tenant.userCount} مستخدم</span>
                    <span>•</span>
                    <span>{tenant.invoiceCount} فاتورة</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    {tenant.totalRevenue?.toLocaleString('ar-EG')} ج.م
                  </p>
                  <p className="text-xs text-gray-500">
                    {tenant.totalPaid?.toLocaleString('ar-EG')} مدفوع
                  </p>
                </div>
              </div>
            ))}
            {(!data?.topTenants || data.topTenants.length === 0) && (
              <div className="text-center py-8 text-gray-400">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>لا توجد بيانات</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* User Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              توزيع المستخدمين حسب الدور
            </h2>
            <div className="space-y-3">
              {data?.usersByRole?.map((role) => (
                <div key={role._id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold capitalize">{role._id}</span>
                      <span className="text-sm font-bold">{role.count}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          role._id === 'admin'
                            ? 'bg-amber-500'
                            : role._id === 'vendor'
                            ? 'bg-primary-500'
                            : 'bg-gray-500'
                        }`}
                        style={{
                          width: `${
                            (role.count /
                              data.usersByRole.reduce((sum, r) => sum + r.count, 0)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-500" />
              الاشتراكات
            </h2>
            <div className="space-y-3">
              {data?.subscriptionDistribution?.map((sub) => (
                <div key={sub._id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold capitalize">{sub._id || 'free'}</span>
                      <span className="text-sm font-bold">{sub.count}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          sub._id === 'professional'
                            ? 'bg-purple-500'
                            : sub._id === 'basic'
                            ? 'bg-blue-500'
                            : 'bg-gray-400'
                        }`}
                        style={{
                          width: `${
                            (sub.count /
                              data.subscriptionDistribution.reduce(
                                (sum, s) => sum + s.count,
                                0
                              )) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue Trends */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            اتجاهات الإيرادات
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">إجمالي الإيرادات</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {data?.totalRevenue?.toLocaleString('ar-EG') || '0'} ج.م
              </p>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">المبالغ المدفوعة</span>
                <ArrowUpRight className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                {data?.totalPaid?.toLocaleString('ar-EG') || '0'} ج.م
              </p>
            </div>
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">المتبقي</span>
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-2xl font-extrabold text-red-600 dark:text-red-400">
                {data?.totalOutstanding?.toLocaleString('ar-EG') || '0'} ج.م
              </p>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">نسبة التحصيل</span>
                <Target className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
                {data?.totalRevenue > 0
                  ? Math.round((data?.totalPaid / data?.totalRevenue) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Active vs Inactive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4">المتاجر النشطة</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-extrabold">{data?.activeTenants || 0}</p>
                <p className="text-sm text-gray-500">من {data?.totalTenants || 0} إجمالي</p>
              </div>
              <div className="w-20 h-20 rounded-full border-8 border-emerald-500 flex items-center justify-center">
                <span className="text-xl font-extrabold text-emerald-600">
                  {data?.totalTenants > 0
                    ? Math.round((data?.activeTenants / data?.totalTenants) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4">المستخدمون النشطون</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-extrabold">{data?.activeUsers || 0}</p>
                <p className="text-sm text-gray-500">من {data?.totalUsers || 0} إجمالي</p>
              </div>
              <div className="w-20 h-20 rounded-full border-8 border-blue-500 flex items-center justify-center">
                <span className="text-xl font-extrabold text-blue-600">
                  {data?.totalUsers > 0
                    ? Math.round((data?.activeUsers / data?.totalUsers) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
