import React, { useState, useEffect } from 'react';
import {
  TrendingUp, FileText, Clock, Boxes, CreditCard, AlertTriangle,
  Users, Truck, Calendar, DollarSign, Star, Zap, BarChart3, Store,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { dashboardApi, useAuthStore } from '../store';
import { StatCard, Card, Badge, LoadingSpinner } from '../components/UI';
import AIStockWidget from '../components/AIStockWidget';

export default function DashboardPage() {
  const { user, getBranches } = useAuthStore();
  const [data, setData] = useState(null);
  const [collections, setCollections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');

  useEffect(() => {
    // Fetch branches for filter
    if (user?.role === 'admin' || user?.isSuperAdmin) {
      getBranches().then(setBranches).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const params = selectedBranch !== 'all' ? { branch: selectedBranch } : {};

    Promise.all([
      dashboardApi.getOverview(params),
      dashboardApi.getDailyCollections(params),
    ]).then(([ovRes, colRes]) => {
      setData(ovRes.data.data);
      setCollections(colRes.data.data);
    }).catch(() => {
      setData({
        sales: { totalSales: 0, totalPaid: 0, totalOutstanding: 0, invoiceCount: 0 },
        stock: { inStock: 0, lowStock: 0, outOfStock: 0, totalValue: 0 },
        customers: { total: 0 }, suppliers: { total: 0 },
        installments: { upcomingCount: 0, overdueCount: 0 },
        monthlySales: [], topProducts: [], recentInvoices: [],
      });
    }).finally(() => setLoading(false));
  }, [selectedBranch]);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick Actions & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <Link to="/quick-sale" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold shadow-lg shadow-amber-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <Zap className="w-4 h-4" /> بيع سريع
          </Link>
          <Link to="/reports" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
            <BarChart3 className="w-4 h-4 text-violet-500" /> التقارير
          </Link>
        </div>

        {/* Branch Filter */}
        {(user?.role === 'admin' || user?.isSuperAdmin) && branches.length > 0 && (
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <Store className="w-4 h-4 text-gray-400 mr-2" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer"
            >
              <option value="all">كل الفروع</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي المبيعات" value={`${fmt(data.sales?.totalSales)} ج.م`} icon={<TrendingUp className="w-5 h-5" />} change={`${data.sales?.invoiceCount || 0} فاتورة`} gradient="bg-gradient-to-br from-primary-500 to-primary-700" />
        <StatCard title="تم التحصيل" value={`${fmt(data.sales?.totalPaid)} ج.م`} icon={<CreditCard className="w-5 h-5" />} change="المبالغ المحصلة" gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" />
        <StatCard title="أقساط مستحقة" value={`${fmt(data.sales?.totalOutstanding)} ج.م`} icon={<Clock className="w-5 h-5" />} change={`${data.installments?.overdueCount || 0} متأخرة`} gradient="bg-gradient-to-br from-amber-500 to-amber-700" />
        <StatCard title="المنتجات" value={`${(data.stock?.inStock || 0) + (data.stock?.lowStock || 0) + (data.stock?.outOfStock || 0)}`} icon={<Boxes className="w-5 h-5" />} change={`${data.stock?.lowStock || 0} منخفض, ${data.stock?.outOfStock || 0} نفذ`} gradient="bg-gradient-to-br from-red-500 to-red-700" />
      </div>

      {/* Overdue Alert Banner */}
      {(collections?.overdue?.items?.length || 0) > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20 flex items-center gap-3 animate-slide-up">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
          <div className="flex-1">
            <p className="font-bold text-sm text-red-700 dark:text-red-400">لديك {collections.overdue.items.length} قسط متأخر بإجمالي {fmt(collections.overdue.total)} ج.م</p>
            <p className="text-xs text-red-500/70">{collections.overdue.items.slice(0, 3).map((i) => i.customer?.name).join(' · ')}</p>
          </div>
          <Link to="/reports" className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold flex-shrink-0">التفاصيل</Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Stock Advisor Widget */}
        <AIStockWidget />

        {/* Sales Chart */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-base font-bold mb-4">المبيعات الشهرية</h3>
          {data.monthlySales?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.monthlySales}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13, fontFamily: 'Cairo' }} formatter={(v) => [`${v.toLocaleString('ar-EG')} ج.م`]} />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" fill="url(#colorSales)" strokeWidth={2.5} name="المبيعات" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-60 flex items-center justify-center text-gray-400 text-sm">لا توجد بيانات مبيعات بعد</div>}
        </Card>

        {/* Daily Collections Widget */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold flex items-center gap-2"><Calendar className="w-4 h-4 text-primary-500" /> جدول التحصيل</h3>
            <Link to="/reports" className="text-xs text-primary-500 font-semibold hover:underline">عرض الكل</Link>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20">
              <p className="text-[10px] font-bold text-primary-500 mb-1">مستحقة اليوم</p>
              <p className="text-xl font-black text-primary-600">{fmt(collections?.today?.total || 0)} ج.م</p>
              <p className="text-[10px] text-gray-400">{collections?.today?.items?.length || 0} قسط</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <p className="text-[10px] font-bold text-amber-500 mb-1">هذا الأسبوع</p>
              <p className="text-xl font-black text-amber-600">{fmt(collections?.week?.total || 0)} ج.م</p>
              <p className="text-[10px] text-gray-400">{collections?.week?.items?.length || 0} قسط</p>
            </div>
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <p className="text-[10px] font-bold text-red-500 mb-1">متأخرة</p>
              <p className="text-xl font-black text-red-600">{fmt(collections?.overdue?.total || 0)} ج.م</p>
              <p className="text-[10px] text-gray-400">{collections?.overdue?.items?.length || 0} قسط</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="p-5">
          <h3 className="text-base font-bold mb-4">الأكثر مبيعاً</h3>
          {data.topProducts?.length > 0 ? (
            <div className="space-y-2">
              {data.topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{p.productName}</p><p className="text-xs text-gray-400">{p.totalSold} قطعة</p></div>
                  <span className="text-sm font-bold text-emerald-500">{fmt(p.totalRevenue)} ج.م</span>
                </div>
              ))}
            </div>
          ) : <div className="h-40 flex items-center justify-center text-gray-400 text-sm">لا توجد مبيعات بعد</div>}
        </Card>

        {/* Recent Invoices */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold">آخر الفواتير</h3>
            <Link to="/invoices" className="text-xs text-primary-500 font-semibold hover:underline">عرض الكل</Link>
          </div>
          {data.recentInvoices?.length > 0 ? (
            <div className="space-y-2">
              {data.recentInvoices.slice(0, 6).map((inv, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${inv.status === 'paid' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-500'}`}><FileText className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{inv.invoiceNumber}</p><p className="text-[10px] text-gray-400">{inv.customer?.name || '—'}</p></div>
                  <span className="text-sm font-bold">{fmt(inv.totalAmount)}</span>
                  <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : 'warning'}>
                    {inv.status === 'paid' ? 'مدفوع' : inv.status === 'overdue' ? 'متأخر' : 'جزئي'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : <div className="py-10 text-center text-gray-400 text-sm">لا توجد فواتير بعد</div>}
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to="/customers" className="p-4 rounded-xl bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 hover:border-primary-200 transition-all">
          <Users className="w-5 h-5 text-primary-500 mb-2" /><p className="text-2xl font-black">{data.customers?.total || 0}</p><p className="text-xs text-gray-400">عميل</p>
        </Link>
        <Link to="/suppliers" className="p-4 rounded-xl bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 hover:border-emerald-200 transition-all">
          <Truck className="w-5 h-5 text-emerald-500 mb-2" /><p className="text-2xl font-black">{data.suppliers?.total || 0}</p><p className="text-xs text-gray-400">مورد</p>
        </Link>
        <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800">
          <DollarSign className="w-5 h-5 text-amber-500 mb-2" /><p className="text-lg font-black">{fmt(data.stock?.totalValue || 0)}</p><p className="text-xs text-gray-400">قيمة المخزون</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800">
          <Star className="w-5 h-5 text-violet-500 mb-2" /><p className="text-2xl font-black">{data.installments?.upcomingCount || 0}</p><p className="text-xs text-gray-400">أقساط قريبة</p>
        </div>
      </div>
    </div>
  );
}
