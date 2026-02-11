import React, { useState, useEffect } from 'react';
import {
  Target, TrendingUp, AlertTriangle, Package, Truck, Users, Calendar,
  DollarSign, Award, ChevronLeft, RefreshCw, Zap, BarChart3, Heart,
  ArrowUpRight, ArrowDownRight, Lightbulb, Phone, Clock, ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { biApi, dashboardApi } from '../store';
import { Card, Badge, LoadingSpinner } from '../components/UI';

const RISK_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', blocked: '#991b1b' };

export default function CommandCenterPage() {
  const [commandData, setCommandData] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [achievements, setAchievements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cmdRes, healthRes, cashRes, achRes] = await Promise.all([
        biApi.getCommandCenter(),
        biApi.getHealthScore(),
        biApi.getCashFlowForecast(),
        biApi.getAchievements(),
      ]);
      setCommandData(cmdRes.data.data);
      setHealthData(healthRes.data.data);
      setCashFlow(cashRes.data.data);
      setAchievements(achRes.data.data);
    } catch { toast.error('خطأ في تحميل البيانات'); }
    finally { setLoading(false); }
  };

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/25">
          <Target className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-black">مركز القيادة</h2>
          <p className="text-xs text-gray-400">ماذا تفعل اليوم؟ — {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button onClick={loadAll} className="p-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Health Score + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Health Score Card */}
        {healthData && (
          <Card className="p-5 lg:col-span-1 relative overflow-hidden">
            <div className="absolute -left-8 -top-8 w-32 h-32 bg-gradient-to-br from-primary-500/20 to-violet-500/20 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400">صحة النشاط</span>
                <span className="text-2xl">{healthData.emoji}</span>
              </div>
              <div className="text-5xl font-black mb-1" style={{ color: healthData.score >= 70 ? '#10b981' : healthData.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                {healthData.score}
              </div>
              <p className="text-xs text-gray-400">من 100</p>
              <div className="mt-3 space-y-1">
                {['collection', 'customers', 'inventory', 'profit'].map((k) => (
                  <div key={k} className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full bg-primary-500" style={{ width: `${(healthData.breakdown[k].score / healthData.breakdown[k].max) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 w-6">{healthData.breakdown[k].score}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Quick Stats */}
        {commandData && (
          <>
            <Card className="p-4 border-2 border-primary-100 dark:border-primary-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <p className="text-2xl font-black text-primary-600">{fmt(commandData.summary.collectionsTodayTotal)}</p>
                  <p className="text-[10px] text-gray-400">تحصيل اليوم ({commandData.summary.collectionsTodayCount})</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-2 border-red-100 dark:border-red-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-black text-red-600">{fmt(commandData.summary.overdueTotal)}</p>
                  <p className="text-[10px] text-gray-400">متأخرات ({commandData.summary.overdueCount})</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-2 border-amber-100 dark:border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-black text-amber-600">{commandData.summary.lowStockCount}</p>
                  <p className="text-[10px] text-gray-400">منتج يحتاج إعادة تخزين</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Smart Suggestions */}
      {commandData?.suggestions?.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold">اقتراحات ذكية</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {commandData.suggestions.map((s, i) => (
              <div key={i} className={`p-4 rounded-xl border-2 ${s.priority === 'high' ? 'border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5' : 'border-gray-100 dark:border-gray-800'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{s.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold leading-relaxed">{s.text}</p>
                    {s.priority === 'high' && <Badge variant="danger" className="mt-2">أولوية عالية</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-2xl">
        {[
          { key: 'overview', label: 'التحصيل', icon: DollarSign },
          { key: 'cashflow', label: 'التدفق النقدي', icon: TrendingUp },
          { key: 'achievements', label: 'الإنجازات', icon: Award },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.key ? 'bg-white dark:bg-gray-900 text-primary-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && commandData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Collections Today */}
          <Card className="p-5">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-500" /> مستحقة اليوم ({commandData.collectionsToday?.length || 0})
            </h4>
            {(commandData.collectionsToday?.length || 0) === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">لا توجد أقساط مستحقة اليوم ✨</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {commandData.collectionsToday.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20">
                    <div className="w-8 h-8 rounded-lg bg-primary-500 text-white flex items-center justify-center text-xs font-bold">{c.installmentNumber}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{c.customer?.name}</p>
                      <p className="text-[10px] text-gray-400">{c.invoiceNumber}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-extrabold text-primary-600">{fmt(c.amount)} ج.م</p>
                      <a href={`tel:${c.customer?.phone}`} className="text-[10px] text-primary-500 flex items-center gap-1"><Phone className="w-3 h-3" /> اتصال</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Overdue Collections */}
          <Card className="p-5">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" /> متأخرة ({commandData.collectionsOverdue?.length || 0})
            </h4>
            {(commandData.collectionsOverdue?.length || 0) === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">لا توجد متأخرات — ممتاز! 🎉</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {commandData.collectionsOverdue.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                    <div className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center text-xs font-bold">{c.daysOverdue}d</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{c.customer?.name}</p>
                      <p className="text-[10px] text-gray-400">{c.invoiceNumber} — متأخر {c.daysOverdue} يوم</p>
                    </div>
                    <div className="text-left">
                      <p className="font-extrabold text-red-600">{fmt(c.amount)} ج.م</p>
                      <Badge variant={c.customer?.creditEngine?.riskLevel === 'high' ? 'danger' : 'warning'}>
                        {c.customer?.creditEngine?.riskLevel === 'high' ? 'خطر' : 'متوسط'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Low Stock */}
          <Card className="p-5">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" /> مخزون منخفض ({commandData.lowStockProducts?.length || 0})
            </h4>
            {(commandData.lowStockProducts?.length || 0) === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">المخزون جيد ✅</p>
            ) : (
              <div className="space-y-2">
                {commandData.lowStockProducts.slice(0, 6).map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                    <span className={`w-2 h-2 rounded-full ${p.stockStatus === 'out_of_stock' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-400">{p.sku} — المورد: {p.supplier?.name || '—'}</p>
                    </div>
                    <Badge variant={p.stockStatus === 'out_of_stock' ? 'danger' : 'warning'}>
                      {p.stockStatus === 'out_of_stock' ? 'نفذ' : `${p.stock?.quantity || 0} قطعة`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* High Risk Customers */}
          <Card className="p-5">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" /> عملاء عالي المخاطر ({commandData.highRiskCustomers?.length || 0})
            </h4>
            {(commandData.highRiskCustomers?.length || 0) === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">لا يوجد عملاء عالي المخاطر</p>
            ) : (
              <div className="space-y-2">
                {commandData.highRiskCustomers.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${RISK_COLORS[c.creditEngine?.riskLevel || 'medium']}20`, color: RISK_COLORS[c.creditEngine?.riskLevel || 'medium'] }}>
                      {c.creditEngine?.score || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{c.name}</p>
                      <p className="text-[10px] text-gray-400">مستحق: {fmt(c.financials?.outstandingBalance)} ج.م</p>
                    </div>
                    <Link to={`/customers`} className="text-xs text-primary-500 font-semibold">التفاصيل</Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'cashflow' && cashFlow && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 text-center border-2 border-emerald-100 dark:border-emerald-500/20">
              <ArrowUpRight className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
              <p className="text-2xl font-black text-emerald-600">{fmt(cashFlow.summary.totalExpectedIncome)}</p>
              <p className="text-xs text-gray-400">متوقع دخول (30 يوم)</p>
            </Card>
            <Card className="p-4 text-center border-2 border-red-100 dark:border-red-500/20">
              <ArrowDownRight className="w-5 h-5 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-black text-red-600">{fmt(cashFlow.summary.totalExpectedExpenses)}</p>
              <p className="text-xs text-gray-400">متوقع خروج (30 يوم)</p>
            </Card>
            <Card className={`p-4 text-center border-2 ${cashFlow.summary.netCashFlow >= 0 ? 'border-emerald-100 dark:border-emerald-500/20' : 'border-red-100 dark:border-red-500/20'}`}>
              <TrendingUp className={`w-5 h-5 mx-auto mb-2 ${cashFlow.summary.netCashFlow >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
              <p className={`text-2xl font-black ${cashFlow.summary.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(cashFlow.summary.netCashFlow)}</p>
              <p className="text-xs text-gray-400">صافي التدفق</p>
            </Card>
          </div>

          {/* Warnings */}
          {cashFlow.warnings?.length > 0 && (
            <div className="space-y-2">
              {cashFlow.warnings.map((w, i) => (
                <div key={i} className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{w.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          <Card className="p-5">
            <h4 className="font-bold text-sm mb-4">التدفق النقدي المتوقع (30 يوم)</h4>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={cashFlow.dailyForecast}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.split('-')[2]} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, fontFamily: 'Cairo' }} formatter={(v) => `${v.toLocaleString('ar-EG')} ج.م`} />
                <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#colorIncome)" strokeWidth={2} name="دخل" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#colorExpense)" strokeWidth={2} name="خروج" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {activeTab === 'achievements' && achievements && (
        <div className="space-y-5">
          {/* Progress */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold">تقدمك</h4>
              <span className="text-2xl font-black text-primary-500">{achievements.stats.progress}%</span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-3">
              <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-violet-500 transition-all" style={{ width: `${achievements.stats.progress}%` }} />
            </div>
            <p className="text-xs text-gray-400">{achievements.stats.unlockedCount} من {achievements.stats.totalAchievements} إنجاز</p>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 text-center"><p className="text-2xl font-black">{achievements.stats.invoiceCount}</p><p className="text-[10px] text-gray-400">فاتورة</p></Card>
            <Card className="p-4 text-center"><p className="text-2xl font-black">{fmt(achievements.stats.totalSales)}</p><p className="text-[10px] text-gray-400">مبيعات</p></Card>
            <Card className="p-4 text-center"><p className="text-2xl font-black">{achievements.stats.customerCount}</p><p className="text-[10px] text-gray-400">عميل</p></Card>
            <Card className="p-4 text-center"><p className="text-2xl font-black">{achievements.stats.daysSinceStart}</p><p className="text-[10px] text-gray-400">يوم نشاط</p></Card>
          </div>

          {/* Achievements Grid */}
          <Card className="p-5">
            <h4 className="font-bold mb-4">الإنجازات</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {achievements.achievements.map((a) => (
                <div key={a.id} className={`p-4 rounded-xl text-center transition-all ${a.unlocked ? 'bg-primary-50 dark:bg-primary-500/10 border-2 border-primary-200 dark:border-primary-500/30' : 'bg-gray-50 dark:bg-gray-800/50 opacity-50'}`}>
                  <span className="text-3xl block mb-2">{a.icon}</span>
                  <p className="font-bold text-xs">{a.name}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{a.description}</p>
                  {a.unlocked && <Badge variant="success" className="mt-2">مفتوح</Badge>}
                </div>
              ))}
            </div>
          </Card>

          {/* Next Milestone */}
          {achievements.nextMilestone && (
            <Card className="p-5 border-2 border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{achievements.nextMilestone.icon}</span>
                <div>
                  <p className="font-bold">الإنجاز التالي: {achievements.nextMilestone.name}</p>
                  <p className="text-sm text-gray-500">{achievements.nextMilestone.description}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
