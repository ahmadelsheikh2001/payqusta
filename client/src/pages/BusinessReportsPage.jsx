import { useState, useEffect, useRef } from 'react';
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
  Printer,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { notify } from '../components/AnimatedNotification';
import { reportsApi, useThemeStore } from '../store';
import { subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Safe number conversion - handles strings, NaN, undefined, null
const safeNum = (val, decimals = 2) => {
  const num = Number(val);
  return isNaN(num) ? (0).toFixed(decimals) : num.toFixed(decimals);
};

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

const ITEMS_PER_PAGE = 10;

export default function BusinessReportsPage() {
  const { dark } = useThemeStore();
  const [selectedReport, setSelectedReport] = useState('sales');
  const [selectedRange, setSelectedRange] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const printRef = useRef(null);

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

      if (!dates && selectedRange === 'custom') {
        setReportData(null);
        setLoading(false);
        return;
      }

      const params = {
        startDate: dates?.start?.toISOString(),
        endDate: dates?.end?.toISOString(),
      };

      if (selectedReport === 'sales') {
        params.groupBy = groupBy;
      } else if (selectedReport === 'inventory') {
        params.lowStockOnly = lowStockOnly;
      } else if (selectedReport === 'customers') {
        params.minPurchases = minPurchases;
      }

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

      setReportData(res.data.data);

      if (!res.data.data || Object.keys(res.data.data).length === 0) {
        notify.warning('لا توجد بيانات متاحة لهذه الفترة', 'لا توجد بيانات');
      }
    } catch (err) {
      console.error('Report Error:', err);
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

      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport}-report-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notify.success('تم تصدير التقرير بنجاح!', 'تم التصدير');
    } catch (err) {
      console.error('Export error:', err);
      notify.error(err.response?.data?.message || 'فشل تصدير التقرير', 'فشل التصدير');
    }
  };

  const handlePrint = () => {
    const reportName = REPORT_TYPES.find(r => r.id === selectedReport)?.name || 'تقرير';
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${reportName} - PayQusta</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; color: #1f2937; }
          .print-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 15px; }
          .print-header h1 { font-size: 24px; color: #2563eb; }
          .print-header p { color: #6b7280; font-size: 14px; margin-top: 5px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
          .summary-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 15px; text-align: center; }
          .summary-card .label { font-size: 12px; color: #6b7280; margin-bottom: 5px; }
          .summary-card .value { font-size: 20px; font-weight: 700; color: #1f2937; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f3f4f6; padding: 10px 12px; text-align: right; font-weight: 600; border: 1px solid #e5e7eb; font-size: 13px; }
          td { padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb; font-size: 13px; }
          tr:nth-child(even) { background: #f9fafb; }
          .section-title { font-size: 16px; font-weight: 700; margin: 20px 0 10px; color: #374151; }
          .print-footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
          .text-green { color: #16a34a; } .text-red { color: #dc2626; } .text-blue { color: #2563eb; } .text-orange { color: #ea580c; }
          .badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
          .badge-red { background: #fee2e2; color: #991b1b; } .badge-yellow { background: #fef3c7; color: #92400e; } .badge-green { background: #dcfce7; color: #166534; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>PayQusta - ${reportName}</h1>
          <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        ${printContent.innerHTML}
        <div class="print-footer">
          <p>PayQusta &copy; ${new Date().getFullYear()} - تم إنشاء هذا التقرير آلياً</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
            <h1 className={`text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>التقارير التجارية</h1>
            <p className={`${dark ? 'text-gray-400' : 'text-gray-500'}`}>تقارير شاملة وتحليلات مفصلة</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition ${
              dark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            الفلاتر
          </button>
          <button
            onClick={handlePrint}
            disabled={!reportData || loading}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
              dark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Printer className="w-4 h-4" />
            طباعة / PDF
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
                  : dark
                    ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
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
      <div className={`rounded-xl p-4 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className={`w-4 h-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`}>الفترة الزمنية</span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {DATE_RANGES.map(range => (
            <button
              key={range.id}
              onClick={() => setSelectedRange(range.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedRange === range.id
                  ? 'bg-blue-600 text-white shadow'
                  : dark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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
              className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                dark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
              }`}
            />
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                dark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
              }`}
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
          className={`rounded-xl p-4 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
        >
          <h3 className={`text-sm font-medium mb-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>فلاتر متقدمة</h3>
          <div className="grid grid-cols-3 gap-4">
            {selectedReport === 'sales' && (
              <div>
                <label className={`block text-sm mb-1 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>تجميع حسب</label>
                <select
                  value={groupBy}
                  onChange={e => {
                    setGroupBy(e.target.value);
                    setTimeout(loadReport, 100);
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    dark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                  }`}
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
                <label className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>مخزون منخفض فقط</label>
              </div>
            )}

            {selectedReport === 'customers' && (
              <div>
                <label className={`block text-sm mb-1 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>الحد الأدنى للمشتريات</label>
                <input
                  type="number"
                  min="0"
                  value={minPurchases}
                  onChange={e => setMinPurchases(parseInt(e.target.value) || 0)}
                  onBlur={loadReport}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    dark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                  }`}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Report Content */}
      {loading ? (
        <div className={`rounded-xl p-12 border text-center ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className={dark ? 'text-gray-400' : 'text-gray-500'}>جاري تحميل التقرير...</p>
        </div>
      ) : reportData ? (
        <div className="space-y-6" ref={printRef}>
          {selectedReport === 'sales' && <SalesReportView data={reportData} />}
          {selectedReport === 'profit' && <ProfitReportView data={reportData} />}
          {selectedReport === 'inventory' && <InventoryReportView data={reportData} />}
          {selectedReport === 'customers' && <CustomerReportView data={reportData} />}
          {selectedReport === 'products' && <ProductPerformanceView data={reportData} />}
        </div>
      ) : (
        <div className={`rounded-xl p-12 border text-center ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <PieChart className={`w-16 h-16 mx-auto mb-4 ${dark ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={dark ? 'text-gray-400' : 'text-gray-500'}>اختر فترة زمنية لعرض التقرير</p>
        </div>
      )}
    </div>
  );
}

// ========== Pagination Component ==========

function Pagination({ currentPage, totalPages, onPageChange, dark }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: dark ? '#374151' : '#e5e7eb' }}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`p-2 rounded-lg transition disabled:opacity-30 ${
          dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
        }`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className={`w-8 h-8 rounded-lg text-sm transition ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}>1</button>
          {start > 2 && <span className={dark ? 'text-gray-600' : 'text-gray-400'}>...</span>}
        </>
      )}

      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
            p === currentPage
              ? 'bg-blue-600 text-white shadow'
              : dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className={dark ? 'text-gray-600' : 'text-gray-400'}>...</span>}
          <button onClick={() => onPageChange(totalPages)} className={`w-8 h-8 rounded-lg text-sm transition ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}>{totalPages}</button>
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`p-2 rounded-lg transition disabled:opacity-30 ${
          dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <span className={`text-xs mr-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
        صفحة {currentPage} من {totalPages}
      </span>
    </div>
  );
}

// ========== Report Views ==========

function SalesReportView({ data }) {
  const { dark } = useThemeStore();
  const [page, setPage] = useState(1);
  const items = data?.salesByPeriod || [];
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const paginatedItems = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <>
      <div className="summary-grid grid grid-cols-4 gap-4">
        <SummaryCard title="إجمالي الفواتير" value={data?.summary?.totalInvoices || 0} icon={BarChart3} color="bg-blue-500" dark={dark} />
        <SummaryCard title="إجمالي الإيرادات" value={`${safeNum(data?.summary?.totalRevenue)} جنيه`} icon={DollarSign} color="bg-green-500" dark={dark} />
        <SummaryCard title="إجمالي الأرباح" value={`${safeNum(data?.summary?.totalProfit)} جنيه`} icon={TrendingUp} color="bg-purple-500" dark={dark} />
        <SummaryCard title="معدل التحصيل" value={`${safeNum(data?.summary?.collectionRate)}%`} icon={PieChart} color="bg-orange-500" dark={dark} />
      </div>

      <div className={`rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>المبيعات حسب الفترة</h3>
          <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{items.length} سجل</span>
        </div>
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
              {paginatedItems.map((period, idx) => (
                <tr key={idx} className={`border-b ${dark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{period?.period}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{period?.count || 0}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{safeNum(period?.revenue)} جنيه</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{safeNum(period?.paid)} جنيه</td>
                  <td className={`py-3 px-4 font-medium ${dark ? 'text-green-400' : 'text-green-600'}`}>{safeNum(period?.profit)} جنيه</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} dark={dark} />
      </div>

      {(data?.topCustomers || []).length > 0 && (
        <div className={`rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`section-title text-lg font-semibold mb-4 ${dark ? 'text-white' : 'text-gray-900'}`}>أفضل العملاء</h3>
          <div className="space-y-2">
            {(data?.topCustomers || []).slice(0, 10).map((customer, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${dark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div>
                  <p className={`font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{customer.name}</p>
                  <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{customer.phone}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${dark ? 'text-green-400' : 'text-green-600'}`}>{safeNum(customer.revenue)} جنيه</p>
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
  const [catPage, setCatPage] = useState(1);
  const [prodPage, setProdPage] = useState(1);

  const categories = data?.byCategory || [];
  const products = data?.topProducts || [];
  const catTotalPages = Math.ceil(categories.length / ITEMS_PER_PAGE);
  const prodTotalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const paginatedCats = categories.slice((catPage - 1) * ITEMS_PER_PAGE, catPage * ITEMS_PER_PAGE);
  const paginatedProds = products.slice((prodPage - 1) * ITEMS_PER_PAGE, prodPage * ITEMS_PER_PAGE);

  return (
    <>
      <div className="summary-grid grid grid-cols-4 gap-4">
        <SummaryCard title="إجمالي الإيرادات" value={`${safeNum(data?.summary?.totalRevenue)} جنيه`} icon={DollarSign} color="bg-blue-500" dark={dark} />
        <SummaryCard title="إجمالي التكاليف" value={`${safeNum(data?.summary?.totalCost)} جنيه`} icon={TrendingUp} color="bg-red-500" dark={dark} />
        <SummaryCard title="صافي الأرباح" value={`${safeNum(data?.summary?.totalProfit)} جنيه`} icon={TrendingUp} color="bg-green-500" dark={dark} />
        <SummaryCard title="هامش الربح" value={`${safeNum(data?.summary?.profitMargin)}%`} icon={PieChart} color="bg-purple-500" dark={dark} />
      </div>

      <div className={`rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`section-title text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>الأرباح حسب الفئة</h3>
          <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{categories.length} فئة</span>
        </div>
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
              {paginatedCats.map((cat, idx) => (
                <tr key={idx} className={`border-b ${dark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <td className={`py-3 px-4 font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{cat?.category || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{safeNum(cat?.revenue)} جنيه</td>
                  <td className={`py-3 px-4 ${dark ? 'text-red-400' : 'text-red-600'}`}>{safeNum(cat?.cost)} جنيه</td>
                  <td className={`py-3 px-4 font-semibold ${dark ? 'text-green-400' : 'text-green-600'}`}>{safeNum(cat?.profit)} جنيه</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{safeNum(cat?.profitMargin)}%</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{cat?.quantity || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={catPage} totalPages={catTotalPages} onPageChange={setCatPage} dark={dark} />
      </div>

      <div className={`rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`section-title text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>أفضل المنتجات ربحاً</h3>
          <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{products.length} منتج</span>
        </div>
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
              {paginatedProds.map((prod, idx) => (
                <tr key={idx} className={`border-b ${dark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <td className={`py-3 px-4 font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{prod?.name || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{prod?.sku || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{prod?.category || '-'}</td>
                  <td className={`py-3 px-4 font-semibold ${dark ? 'text-green-400' : 'text-green-600'}`}>{safeNum(prod?.profit)} جنيه</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-200' : 'text-gray-900'}`}>{safeNum(prod?.profitMargin)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={prodPage} totalPages={prodTotalPages} onPageChange={setProdPage} dark={dark} />
      </div>
    </>
  );
}

function InventoryReportView({ data }) {
  const { dark } = useThemeStore();
  const [page, setPage] = useState(1);
  const items = data?.items || [];
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const paginatedItems = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <>
      <div className="summary-grid grid grid-cols-4 gap-4">
        <SummaryCard title="إجمالي المنتجات" value={data?.summary?.totalProducts || 0} icon={Package} color="bg-blue-500" dark={dark} />
        <SummaryCard title="إجمالي العناصر" value={data?.summary?.totalItems || 0} icon={BarChart3} color="bg-green-500" dark={dark} />
        <SummaryCard title="قيمة المخزون" value={`${safeNum(data?.summary?.totalValue)} جنيه`} icon={DollarSign} color="bg-purple-500" dark={dark} />
        <SummaryCard title="نفذ من المخزون" value={data?.summary?.stockLevels?.outOfStock || 0} icon={Package} color="bg-red-500" dark={dark} />
      </div>

      <div className={`rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`section-title text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>تفاصيل المخزون</h3>
          <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{items.length} منتج</span>
        </div>
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
              {paginatedItems.map((item, idx) => (
                <tr key={idx} className={`border-b ${dark ? 'border-gray-700' : 'border-gray-100'} ${
                  item.status === 'outOfStock' ? (dark ? 'bg-red-900/20' : 'bg-red-50') :
                  item.status === 'lowStock' ? (dark ? 'bg-yellow-900/20' : 'bg-yellow-50') : ''
                }`}>
                  <td className={`py-3 px-4 font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{item?.name || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{item?.sku || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{item?.category || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{item?.quantity || 0}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{item?.minQuantity || 0}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{safeNum(item?.value)} جنيه</td>
                  <td className="py-3 px-4">
                    <span className={`badge px-2 py-1 rounded text-xs font-medium ${
                      item.status === 'outOfStock' ? 'badge-red bg-red-100 text-red-800' :
                      item.status === 'lowStock' ? 'badge-yellow bg-yellow-100 text-yellow-800' :
                      'badge-green bg-green-100 text-green-800'
                    }`}>
                      {item.status === 'outOfStock' ? 'نفذ' : item.status === 'lowStock' ? 'منخفض' : 'طبيعي'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} dark={dark} />
      </div>
    </>
  );
}

function CustomerReportView({ data }) {
  const { dark } = useThemeStore();
  const [page, setPage] = useState(1);
  const customers = data?.customers || [];
  const totalPages = Math.ceil(customers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = customers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <>
      <div className="summary-grid grid grid-cols-4 gap-4">
        <SummaryCard title="إجمالي العملاء" value={data?.summary?.totalCustomers || 0} icon={Users} color="bg-blue-500" dark={dark} />
        <SummaryCard title="إجمالي الإيرادات" value={`${safeNum(data?.summary?.totalRevenue)} جنيه`} icon={DollarSign} color="bg-green-500" dark={dark} />
        <SummaryCard title="المستحقات" value={`${safeNum(data?.summary?.totalOutstanding)} جنيه`} icon={TrendingUp} color="bg-orange-500" dark={dark} />
        <SummaryCard title="متوسط قيمة العميل" value={`${safeNum(data?.summary?.averageCustomerValue)} جنيه`} icon={BarChart3} color="bg-purple-500" dark={dark} />
      </div>

      <div className={`rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`section-title text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>تفاصيل العملاء</h3>
          <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{customers.length} عميل</span>
        </div>
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
              {paginatedCustomers.map((customer, idx) => (
                <tr key={idx} className={`border-b ${dark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <td className={`py-3 px-4 font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{customer?.name || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{customer?.phone || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{customer?.totalInvoices || 0}</td>
                  <td className={`py-3 px-4 font-semibold ${dark ? 'text-green-400' : 'text-green-600'}`}>{safeNum(customer?.totalPurchases)} جنيه</td>
                  <td className={`py-3 px-4 ${dark ? 'text-orange-400' : 'text-orange-600'}`}>{safeNum(customer?.totalRemaining)} جنيه</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{safeNum(customer?.paymentRate, 1)}%</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{safeNum(customer?.averageInvoice)} جنيه</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} dark={dark} />
      </div>
    </>
  );
}

function ProductPerformanceView({ data }) {
  const { dark } = useThemeStore();
  const [page, setPage] = useState(1);
  const products = data?.topByRevenue || [];
  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const paginatedProducts = products.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <>
      <div className="summary-grid grid grid-cols-4 gap-4">
        <SummaryCard title="منتجات مباعة" value={data?.summary?.totalProductsSold || 0} icon={Package} color="bg-blue-500" dark={dark} />
        <SummaryCard title="إجمالي الإيرادات" value={`${safeNum(data?.summary?.totalRevenue)} جنيه`} icon={DollarSign} color="bg-green-500" dark={dark} />
        <SummaryCard title="إجمالي الأرباح" value={`${safeNum(data?.summary?.totalProfit)} جنيه`} icon={TrendingUp} color="bg-purple-500" dark={dark} />
        <SummaryCard title="الكمية المباعة" value={data?.summary?.totalQuantitySold || 0} icon={BarChart3} color="bg-orange-500" dark={dark} />
      </div>

      <div className={`rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`section-title text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>الأفضل من حيث الإيرادات</h3>
          <span className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{products.length} منتج</span>
        </div>
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
              {paginatedProducts.map((product, idx) => (
                <tr key={idx} className={`border-b ${dark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <td className={`py-3 px-4 font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{product?.name || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{product?.sku || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{product?.category || '-'}</td>
                  <td className={`py-3 px-4 ${dark ? 'text-gray-300' : 'text-gray-900'}`}>{product?.quantitySold || 0}</td>
                  <td className={`py-3 px-4 font-semibold ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{safeNum(product?.revenue)} جنيه</td>
                  <td className={`py-3 px-4 ${dark ? 'text-green-400' : 'text-green-600'}`}>{safeNum(product?.profit)} جنيه</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} dark={dark} />
      </div>
    </>
  );
}

function SummaryCard({ title, value, icon: Icon, color, dark }) {
  return (
    <div className={`summary-card rounded-xl p-6 border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`label text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
        <div className={`p-2 ${color} rounded-lg text-white`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className={`value text-2xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
