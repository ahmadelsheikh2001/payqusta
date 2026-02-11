import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notify } from '../components/AnimatedNotification';
import { reportsApi, useThemeStore } from '../store';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const REPORT_TYPES = [
  { id: 'sales', name: 'تقرير المبيعات', icon: TrendingUp, color: 'bg-blue-500' },
  { id: 'profit', name: 'تقرير الأرباح', icon: DollarSign, color: 'bg-green-500' },
  { id: 'inventory', name: 'تقرير المخزون', icon: Package, color: 'bg-purple-500' },
  { id: 'customers', name: 'تقرير العملاء', icon: Users, color: 'bg-orange-500' },
  { id: 'products', name: 'أداء المنتجات', icon: BarChart3, color: 'bg-pink-500' },
];

const DATE_RANGES = [
  { id: 'today', name: 'اليوم', getDates: () => ({ start: new Date(), end: new Date() }) },
  { id: 'week', name: 'آخر 7 أيام', getDates: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { id: 'month', name: 'هذا الشهر', getDates: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { id: 'lastMonth', name: 'الشهر الماضي', getDates: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
  { id: 'quarter', name: 'آخر 3 شهور', getDates: () => ({ start: subMonths(new Date(), 3), end: new Date() }) },
  { id: 'custom', name: 'فترة مخصصة', getDates: () => null },
];

export default function BusinessReportsPage() {
  const { dark } = useThemeStore();
  const [selectedReport, setSelectedReport] = useState('sales');
  const [selectedRange, setSelectedRange] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Additional filters
  const [groupBy, setGroupBy] = useState('day');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [minPurchases, setMinPurchases] = useState(0);

  useEffect(() => {
    loadReport();
  }, [selectedReport, selectedRange]);

  const getDateRange = () => {
    if (selectedRange === 'custom') {
      if (!customStart || !customEnd) return null;
      return { start: new Date(customStart), end: new Date(customEnd) };
    }
    const range = DATE_RANGES.find(r => r.id === selectedRange);
    return range?.getDates();
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const dates = getDateRange();

      console.log('📊 Loading Report:', {
        selectedReport,
        selectedRange,
        dates,
        customStart,
        customEnd,
      });

      if (!dates && selectedRange === 'custom') {
        setReportData(null);
        setLoading(false);
        return;
      }

      const params = {
        startDate: dates?.start?.toISOString(),
        endDate: dates?.end?.toISOString(),
      };

      // Add report-specific params
      if (selectedReport === 'sales') {
        params.groupBy = groupBy;
      } else if (selectedReport === 'inventory') {
        params.lowStockOnly = lowStockOnly;
      } else if (selectedReport === 'customers') {
        params.minPurchases = minPurchases;
      }

      console.log('📤 API Request params:', params);

      let res;
      switch (selectedReport) {
        case 'sales':
          res = await reportsApi.getSalesReport(params);
          break;
        case 'profit':
          res = await reportsApi.getProfitReport(params);
          break;
        case 'inventory':
          res = await reportsApi.getInventoryReport(params);
          break;
        case 'customers':
          res = await reportsApi.getCustomerReport(params);
          break;
        case 'products':
          res = await reportsApi.getProductPerformanceReport(params);
          break;
        default:
          setLoading(false);
          return;
      }

      console.log('📥 API Response:', res.data);
      setReportData(res.data.data);

      if (!res.data.data || Object.keys(res.data.data).length === 0) {
        notify.warning('لا توجد بيانات متاحة لهذه الفترة', 'لا توجد بيانات');
      } else {
        notify.success('تم تحميل التقرير بنجاح', 'تم التحميل');
      }
    } catch (err) {
      console.error('❌ Report Error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'فشل تحميل التقرير';
      notify.error(errorMessage, 'فشل تحميل التقرير');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      notify.info('جاري تصدير التقرير...', 'تصدير');

      const dates = getDateRange();
      const params = {
        startDate: dates?.start?.toISOString(),
        endDate: dates?.end?.toISOString(),
      };

      // Add report-specific params
      if (selectedReport === 'sales') params.groupBy = groupBy;
      if (selectedReport === 'inventory') params.lowStockOnly = lowStockOnly;
      if (selectedReport === 'customers') params.minPurchases = minPurchases;

      let res;
      switch (selectedReport) {
        case 'sales':
          res = await reportsApi.exportSalesReport(params);
          break;
        case 'profit':
          res = await reportsApi.exportProfitReport(params);
          break;
        case 'inventory':
          res = await reportsApi.exportInventoryReport(params);
          break;
        case 'customers':
          res = await reportsApi.exportCustomerReport(params);
          break;
        case 'products':
          res = await reportsApi.exportProductPerformanceReport(params);
          break;
        default:
          return;
      }

      // Create download link
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport}-report-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notify.success('تم تصدير التقرير بنجاح! 📊', 'تم التصدير');
    } catch (err) {
      console.error('Export error:', err);
      notify.error(err.response?.data?.message || 'فشل تصدير التقرير', 'فشل التصدير');
    }
  };

  const reportType = REPORT_TYPES.find(r => r.id === selectedReport);
  const Icon = reportType?.icon || BarChart3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 ${reportType?.color} rounded-xl text-white`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">التقارير التجارية</h1>
            <p className="text-gray-500">تقارير شاملة وتحليلات مفصلة</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            الفلاتر
          </button>
          <button
            onClick={handleExport}
            disabled={!reportData || loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            تصدير Excel
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-5 gap-4">
        {REPORT_TYPES.map(report => {
          const ReportIcon = report.icon;
          return (
            <motion.button
              key={report.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedReport(report.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedReport === report.id
                  ? `${report.color} border-transparent text-white shadow-lg`
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              <ReportIcon className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm font-medium">{report.name}</p>
            </motion.button>
          );
        })}
      </div>

      {/* Date Range Selection */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">الفترة الزمنية</span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {DATE_RANGES.map(range => (
            <button
              key={range.id}
              onClick={() => setSelectedRange(range.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedRange === range.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.name}
            </button>
          ))}
        </div>

        {selectedRange === 'custom' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={loadReport}
              className="col-span-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              تطبيق
            </button>
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white rounded-xl p-4 border border-gray-200"
        >
          <h3 className="text-sm font-medium text-gray-700 mb-3">فلاتر متقدمة</h3>
          <div className="grid grid-cols-3 gap-4">
            {selectedReport === 'sales' && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">تجميع حسب</label>
                <select
                  value={groupBy}
                  onChange={e => {
                    setGroupBy(e.target.value);
                    setTimeout(loadReport, 100);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="day">يوم</option>
                  <option value="week">أسبوع</option>
                  <option value="month">شهر</option>
                  <option value="year">سنة</option>
                </select>
              </div>
            )}

            {selectedReport === 'inventory' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={e => {
                    setLowStockOnly(e.target.checked);
                    setTimeout(loadReport, 100);
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label className="text-sm text-gray-700">مخزون منخفض فقط</label>
              </div>
            )}

            {selectedReport === 'customers' && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">الحد الأدنى للمشتريات</label>
                <input
                  type="number"
                  min="0"
                  value={minPurchases}
                  onChange={e => setMinPurchases(parseInt(e.target.value) || 0)}
                  onBlur={loadReport}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Report Content */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">جاري تحميل التقرير...</p>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Sales Report */}
          {selectedReport === 'sales' && <SalesReportView data={reportData} />}

          {/* Profit Report */}
          {selectedReport === 'profit' && <ProfitReportView data={reportData} />}

          {/* Inventory Report */}
          {selectedReport === 'inventory' && <InventoryReportView data={reportData} />}

          {/* Customer Report */}
          {selectedReport === 'customers' && <CustomerReportView data={reportData} />}

          {/* Product Performance Report */}
          {selectedReport === 'products' && <ProductPerformanceView data={reportData} />}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
          <PieChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">اختر فترة زمنية لعرض التقرير</p>
        </div>
      )}
    </div>
  );
}

// ========== Report Views ==========

function SalesReportView({ data }) {
  const { dark } = useThemeStore();

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard title="إجمالي الفواتير" value={data?.summary?.totalInvoices || 0} icon={BarChart3} color="bg-blue-500" dark={dark} />
        <SummaryCard title="إجمالي الإيرادات" value={`${(data?.summary?.totalRevenue || 0).toFixed(2)} جنيه`} icon={DollarSign} color="bg-green-500" dark={dark} />
        <SummaryCard title="إجمالي الأرباح" value={`${(data?.summary?.totalProfit || 0).toFixed(2)} جنيه`} icon={TrendingUp} color="bg-purple-500" dark={dark} />
        <SummaryCard title="معدل التحصيل" value={`${data?.summary?.collectionRate || 0}%`} icon={PieChart} color="bg-orange-500" dark={dark} />
      </div>

      {/* Sales by Period */}
      <div className={`rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>المبيعات حسب الفترة</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الفترة</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>عدد الفواتير</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الإيرادات</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>المدفوع</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الأرباح</th>
              </tr>
            </thead>
            <tbody>
              {(data?.salesByPeriod || []).map((period, idx) => (
                <tr key={idx} className={`border-b ${dark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{period?.period}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{period?.count || 0}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{(period?.revenue || 0).toFixed(2)} جنيه</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{(period?.paid || 0).toFixed(2)} جنيه</td>
                  <td className="py-3 px-4 text-green-600 dark:text-green-400 font-medium">{(period?.profit || 0).toFixed(2)} جنيه</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Customers */}
      {(data?.topCustomers || []).length > 0 && (
        <div className={`rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>أفضل العملاء</h3>
          <div className="space-y-2">
            {(data?.topCustomers || []).slice(0, 10).map((customer, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${dark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div>
                  <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{customer.name}</p>
                  <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{customer.phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600 dark:text-green-400">{customer.revenue} جنيه</p>
                  <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{customer.count} فاتورة</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ProfitReportView({ data }) {
  const { dark } = useThemeStore();

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard title="إجمالي الإيرادات" value={`${(data?.summary?.totalRevenue || 0).toFixed(2)} جنيه`} icon={DollarSign} color="bg-blue-500" dark={dark} />
        <SummaryCard title="إجمالي التكاليف" value={`${(data?.summary?.totalCost || 0).toFixed(2)} جنيه`} icon={TrendingUp} color="bg-red-500" dark={dark} />
        <SummaryCard title="صافي الأرباح" value={`${(data?.summary?.totalProfit || 0).toFixed(2)} جنيه`} icon={TrendingUp} color="bg-green-500" dark={dark} />
        <SummaryCard title="هامش الربح" value={`${data?.summary?.profitMargin || 0}%`} icon={PieChart} color="bg-purple-500" dark={dark} />
      </div>

      {/* By Category */}
      <div className={`rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>الأرباح حسب الفئة</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الفئة</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الإيرادات</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>التكاليف</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الأرباح</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>هامش الربح</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الكمية</th>
              </tr>
            </thead>
            <tbody>
              {(data?.byCategory || []).map((cat, idx) => (
                <tr key={idx} className={`border-b ${dark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <td className={`py-3 px-4 font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{cat?.category}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{(cat?.revenue || 0).toFixed(2)} جنيه</td>
                  <td className="py-3 px-4 text-red-600 dark:text-red-400">{(cat?.cost || 0).toFixed(2)} جنيه</td>
                  <td className="py-3 px-4 text-green-600 dark:text-green-400 font-semibold">{(cat?.profit || 0).toFixed(2)} جنيه</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{cat?.profitMargin || 0}%</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{cat?.quantity || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products */}
      <div className={`rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>أفضل المنتجات ربحاً</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>المنتج</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>SKU</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الفئة</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الأرباح</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>هامش الربح</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topProducts || []).slice(0, 15).map((prod, idx) => (
                <tr key={idx} className={`border-b ${dark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <td className={`py-3 px-4 font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{prod?.name}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{prod?.sku}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{prod?.category}</td>
                  <td className="py-3 px-4 text-green-600 dark:text-green-400 font-semibold">{(prod?.profit || 0).toFixed(2)} جنيه</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{prod?.profitMargin || 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function InventoryReportView({ data }) {
  const { dark } = useThemeStore();

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard title="إجمالي المنتجات" value={data?.summary?.totalProducts || 0} icon={Package} color="bg-blue-500" dark={dark} />
        <SummaryCard title="إجمالي العناصر" value={data?.summary?.totalItems || 0} icon={BarChart3} color="bg-green-500" dark={dark} />
        <SummaryCard title="قيمة المخزون" value={`${data?.summary?.totalValue || 0} جنيه`} icon={DollarSign} color="bg-purple-500" dark={dark} />
        <SummaryCard title="نفذ من المخزون" value={data?.summary?.stockLevels?.outOfStock || 0} icon={Package} color="bg-red-500" dark={dark} />
      </div>

      {/* Inventory Items */}
      <div className={`rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>تفاصيل المخزون</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>المنتج</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>SKU</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الفئة</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الكمية</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الحد الأدنى</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>القيمة</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items || []).map((item, idx) => (
                <tr key={idx} className={`border-b ${dark ? 'border-gray-700' : 'border-gray-100'} ${
                  item.status === 'outOfStock' ? (dark ? 'bg-red-900/20' : 'bg-red-50') :
                  item.status === 'lowStock' ? (dark ? 'bg-yellow-900/20' : 'bg-yellow-50') : ''
                }`}>
                  <td className={`py-3 px-4 font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{item?.name || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{item?.sku || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{item?.category || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{item?.quantity || 0}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{item?.minQuantity || 0}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{(item?.value || 0).toFixed(2)} جنيه</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.status === 'outOfStock' ? 'bg-red-100 text-red-800' :
                      item.status === 'lowStock' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.status === 'outOfStock' ? 'نفذ' : item.status === 'lowStock' ? 'منخفض' : 'طبيعي'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function CustomerReportView({ data }) {
  const { dark } = useThemeStore();

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard title="إجمالي العملاء" value={data?.summary?.totalCustomers || 0} icon={Users} color="bg-blue-500" dark={dark} />
        <SummaryCard title="إجمالي الإيرادات" value={`${(data?.summary?.totalRevenue || 0).toFixed(2)} جنيه`} icon={DollarSign} color="bg-green-500" dark={dark} />
        <SummaryCard title="المستحقات" value={`${(data?.summary?.totalOutstanding || 0).toFixed(2)} جنيه`} icon={TrendingUp} color="bg-orange-500" dark={dark} />
        <SummaryCard title="متوسط قيمة العميل" value={`${(data?.summary?.averageCustomerValue || 0).toFixed(2)} جنيه`} icon={BarChart3} color="bg-purple-500" dark={dark} />
      </div>

      {/* Customers */}
      <div className={`rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>تفاصيل العملاء</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الاسم</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الهاتف</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>عدد الفواتير</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>إجمالي المشتريات</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>المتبقي</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>نسبة الدفع</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>متوسط الفاتورة</th>
              </tr>
            </thead>
            <tbody>
              {(data?.customers || []).map((customer, idx) => (
                <tr key={idx} className={`border-b ${dark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <td className={`py-3 px-4 font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{customer?.name || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{customer?.phone || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{customer?.totalInvoices || 0}</td>
                  <td className={`py-3 px-4 font-semibold ${dark ? 'text-green-400' : 'text-green-600'}`}>{(customer?.totalPurchases || 0).toFixed(2)} جنيه</td>
                  <td className={`py-3 px-4 ${dark ? 'text-orange-400' : 'text-orange-600'}`}>{(customer?.totalRemaining || 0).toFixed(2)} جنيه</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{(customer?.paymentRate || 0).toFixed(1)}%</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{(customer?.averageInvoice || 0).toFixed(2)} جنيه</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ProductPerformanceView({ data }) {
  const { dark } = useThemeStore();

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard title="منتجات مباعة" value={data?.summary?.totalProductsSold || 0} icon={Package} color="bg-blue-500" dark={dark} />
        <SummaryCard title="إجمالي الإيرادات" value={`${(data?.summary?.totalRevenue || 0).toFixed(2)} جنيه`} icon={DollarSign} color="bg-green-500" dark={dark} />
        <SummaryCard title="إجمالي الأرباح" value={`${(data?.summary?.totalProfit || 0).toFixed(2)} جنيه`} icon={TrendingUp} color="bg-purple-500" dark={dark} />
        <SummaryCard title="الكمية المباعة" value={data?.summary?.totalQuantitySold || 0} icon={BarChart3} color="bg-orange-500" dark={dark} />
      </div>

      {/* Top by Revenue */}
      <div className={`rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>الأفضل من حيث الإيرادات</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>المنتج</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>SKU</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الفئة</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الكمية المباعة</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الإيرادات</th>
                <th className={`text-right py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الأرباح</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topByRevenue || []).slice(0, 10).map((product, idx) => (
                <tr key={idx} className={`border-b ${dark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <td className={`py-3 px-4 font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{product?.name || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{product?.sku || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{product?.category || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{product?.quantitySold || 0}</td>
                  <td className={`py-3 px-4 font-semibold ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{(product?.revenue || 0).toFixed(2)} جنيه</td>
                  <td className={`py-3 px-4 ${dark ? 'text-green-400' : 'text-green-600'}`}>{(product?.profit || 0).toFixed(2)} جنيه</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function SummaryCard({ title, value, icon: Icon, color, dark }) {
  return (
    <div className={`rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
        <div className={`p-2 ${color} rounded-lg text-white`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}