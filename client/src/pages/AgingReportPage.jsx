import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Users, TrendingUp, AlertTriangle, Clock, DollarSign,
  Download, Filter, ChevronDown, ChevronUp, Printer, FileSpreadsheet,
  Phone, Eye, RefreshCw, PieChart,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../store';
import { Card, Button, Badge, Input } from '../components/UI';
import Pagination from '../components/Pagination';

// Aging buckets configuration
const AGING_BUCKETS = [
  { key: 'current', label: 'الحالي', range: '0-30', days: [0, 30], color: 'emerald' },
  { key: 'days31_60', label: '31-60 يوم', range: '31-60', days: [31, 60], color: 'amber' },
  { key: 'days61_90', label: '61-90 يوم', range: '61-90', days: [61, 90], color: 'orange' },
  { key: 'days91_120', label: '91-120 يوم', range: '91-120', days: [91, 120], color: 'red' },
  { key: 'over120', label: '+120 يوم', range: '120+', days: [121, Infinity], color: 'rose' },
];

export default function AgingReportPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('outstanding');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [filterBucket, setFilterBucket] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Fetch customers with outstanding balances
  useEffect(() => {
    fetchAgingData();
  }, []);

  const fetchAgingData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/customers', { params: { limit: 500 } });
      
      // Filter customers with outstanding balance and calculate aging
      const customersWithAging = (data.data || [])
        .filter(c => (c.financials?.outstandingBalance || 0) > 0)
        .map(customer => calculateAging(customer));
      
      setCustomers(customersWithAging);
    } catch (err) {
      toast.error('خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // Calculate aging buckets for a customer
  const calculateAging = (customer) => {
    const today = new Date();
    const aging = {
      current: 0,
      days31_60: 0,
      days61_90: 0,
      days91_120: 0,
      over120: 0,
      oldestDueDate: null,
      maxAgeDays: 0,
    };

    // Simulate aging calculation based on customer data
    // In production, this would come from actual invoice due dates
    const outstanding = customer.financials?.outstandingBalance || 0;
    const createdAt = new Date(customer.createdAt);
    const daysSinceCreated = Math.floor((today - createdAt) / (1000 * 60 * 60 * 24));

    // Distribute outstanding based on customer age and payment behavior
    const avgPaymentDays = customer.paymentBehavior?.avgPaymentDays || 30;
    
    if (avgPaymentDays <= 30) {
      aging.current = outstanding;
      aging.maxAgeDays = avgPaymentDays;
    } else if (avgPaymentDays <= 60) {
      aging.current = outstanding * 0.4;
      aging.days31_60 = outstanding * 0.6;
      aging.maxAgeDays = avgPaymentDays;
    } else if (avgPaymentDays <= 90) {
      aging.current = outstanding * 0.2;
      aging.days31_60 = outstanding * 0.3;
      aging.days61_90 = outstanding * 0.5;
      aging.maxAgeDays = avgPaymentDays;
    } else if (avgPaymentDays <= 120) {
      aging.days31_60 = outstanding * 0.2;
      aging.days61_90 = outstanding * 0.3;
      aging.days91_120 = outstanding * 0.5;
      aging.maxAgeDays = avgPaymentDays;
    } else {
      aging.days61_90 = outstanding * 0.2;
      aging.days91_120 = outstanding * 0.3;
      aging.over120 = outstanding * 0.5;
      aging.maxAgeDays = avgPaymentDays;
    }

    return { ...customer, aging };
  };

  // Summary statistics
  const summary = useMemo(() => {
    const totals = {
      totalOutstanding: 0,
      current: 0,
      days31_60: 0,
      days61_90: 0,
      days91_120: 0,
      over120: 0,
      customersCount: customers.length,
    };

    customers.forEach(c => {
      totals.totalOutstanding += c.financials?.outstandingBalance || 0;
      totals.current += c.aging?.current || 0;
      totals.days31_60 += c.aging?.days31_60 || 0;
      totals.days61_90 += c.aging?.days61_90 || 0;
      totals.days91_120 += c.aging?.days91_120 || 0;
      totals.over120 += c.aging?.over120 || 0;
    });

    return totals;
  }, [customers]);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // Search filter
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(s) || 
        c.phone?.includes(s)
      );
    }

    // Bucket filter
    if (filterBucket !== 'all') {
      result = result.filter(c => {
        const bucketValue = c.aging?.[filterBucket] || 0;
        return bucketValue > 0;
      });
    }

    // Sort
    result.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case 'outstanding':
          aVal = a.financials?.outstandingBalance || 0;
          bVal = b.financials?.outstandingBalance || 0;
          break;
        case 'maxAge':
          aVal = a.aging?.maxAgeDays || 0;
          bVal = b.aging?.maxAgeDays || 0;
          break;
        default:
          aVal = a.aging?.[sortBy] || 0;
          bVal = b.aging?.[sortBy] || 0;
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [customers, search, filterBucket, sortBy, sortDir]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / limit);
  const paginatedCustomers = filteredCustomers.slice((page - 1) * limit, page * limit);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');

  // Export to Excel
  const exportToExcel = () => {
    const headers = ['العميل', 'الهاتف', 'الإجمالي', 'الحالي', '31-60 يوم', '61-90 يوم', '91-120 يوم', '+120 يوم'];
    const rows = filteredCustomers.map(c => [
      c.name,
      c.phone,
      c.financials?.outstandingBalance || 0,
      c.aging?.current || 0,
      c.aging?.days31_60 || 0,
      c.aging?.days61_90 || 0,
      c.aging?.days91_120 || 0,
      c.aging?.over120 || 0,
    ]);

    let csv = '\uFEFF'; // BOM for Arabic
    csv += headers.join(',') + '\n';
    rows.forEach(row => { csv += row.join(',') + '\n'; });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_أعمار_الديون_${new Date().toLocaleDateString('ar-EG')}.csv`;
    a.click();
    toast.success('تم تصدير التقرير ✅');
  };

  // Print report
  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">تقرير أعمار الديون</h1>
            <p className="text-sm text-gray-400">تحليل عمر المديونيات حسب الفترة الزمنية</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAgingData} icon={<RefreshCw className="w-4 h-4" />}>
            تحديث
          </Button>
          <Button variant="outline" onClick={printReport} icon={<Printer className="w-4 h-4" />}>
            طباعة
          </Button>
          <Button onClick={exportToExcel} icon={<FileSpreadsheet className="w-4 h-4" />}>
            تصدير Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-gray-500">إجمالي المديونية</span>
          </div>
          <p className="text-xl font-bold">{fmt(summary.totalOutstanding)}</p>
          <p className="text-xs text-gray-400">{summary.customersCount} عميل</p>
        </Card>

        {AGING_BUCKETS.map((bucket) => (
          <Card 
            key={bucket.key}
            className={`p-4 cursor-pointer transition-all hover:scale-105 ${filterBucket === bucket.key ? `ring-2 ring-${bucket.color}-500` : ''}`}
            onClick={() => setFilterBucket(filterBucket === bucket.key ? 'all' : bucket.key)}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full bg-${bucket.color}-500`} />
              <span className="text-xs text-gray-500">{bucket.label}</span>
            </div>
            <p className={`text-xl font-bold text-${bucket.color}-600`}>
              {fmt(summary[bucket.key])}
            </p>
            <p className="text-xs text-gray-400">
              {((summary[bucket.key] / summary.totalOutstanding) * 100 || 0).toFixed(1)}%
            </p>
          </Card>
        ))}
      </div>

      {/* Visual Chart */}
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5 text-primary-500" />
          توزيع المديونيات حسب العمر
        </h3>
        <div className="flex items-center gap-4 flex-wrap">
          {AGING_BUCKETS.map((bucket) => {
            const percentage = (summary[bucket.key] / summary.totalOutstanding) * 100 || 0;
            return (
              <div key={bucket.key} className="flex items-center gap-2">
                <div 
                  className={`h-8 bg-${bucket.color}-500 rounded`} 
                  style={{ width: `${Math.max(percentage * 3, 20)}px` }}
                />
                <div className="text-sm">
                  <p className="font-medium">{bucket.label}</p>
                  <p className="text-xs text-gray-400">{percentage.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="بحث بالاسم أو الهاتف..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              icon={<Filter className="w-4 h-4" />}
            />
          </div>
          <select
            value={filterBucket}
            onChange={(e) => { setFilterBucket(e.target.value); setPage(1); }}
            className="px-4 py-2 border rounded-xl bg-white dark:bg-gray-800"
          >
            <option value="all">كل الفترات</option>
            {AGING_BUCKETS.map((bucket) => (
              <option key={bucket.key} value={bucket.key}>{bucket.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">جاري تحميل التقرير...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">لا توجد مديونيات</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('name')}>
                      <div className="flex items-center gap-1">العميل <SortIcon field="name" /></div>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('outstanding')}>
                      <div className="flex items-center justify-center gap-1">الإجمالي <SortIcon field="outstanding" /></div>
                    </th>
                    {AGING_BUCKETS.map((bucket) => (
                      <th 
                        key={bucket.key}
                        className={`px-4 py-3 text-center font-semibold cursor-pointer hover:bg-gray-100 text-${bucket.color}-600`}
                        onClick={() => toggleSort(bucket.key)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {bucket.label} <SortIcon field={bucket.key} />
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedCustomers.map((customer) => (
                    <React.Fragment key={customer._id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                              {customer.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold">{customer.name}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {customer.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          {fmt(customer.financials?.outstandingBalance)} ج.م
                        </td>
                        {AGING_BUCKETS.map((bucket) => (
                          <td key={bucket.key} className={`px-4 py-3 text-center text-${bucket.color}-600 font-medium`}>
                            {customer.aging?.[bucket.key] > 0 ? fmt(customer.aging[bucket.key]) : '-'}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setExpandedCustomer(expandedCustomer === customer._id ? null : customer._id)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="عرض التفاصيل"
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                            </button>
                            <a
                              href={`tel:${customer.phone}`}
                              className="p-2 hover:bg-green-50 text-green-500 rounded-lg transition-colors"
                              title="اتصال"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          </div>
                        </td>
                      </tr>
                      {expandedCustomer === customer._id && (
                        <tr>
                          <td colSpan={8} className="px-4 py-4 bg-gray-50 dark:bg-gray-800/50">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-gray-400">متوسط أيام السداد</p>
                                <p className="font-bold">{customer.paymentBehavior?.avgPaymentDays || 0} يوم</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">إجمالي المشتريات</p>
                                <p className="font-bold">{fmt(customer.financials?.totalPurchases)} ج.م</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">إجمالي المدفوع</p>
                                <p className="font-bold text-emerald-600">{fmt(customer.financials?.totalPaid)} ج.م</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">الحد الائتماني</p>
                                <p className="font-bold">{fmt(customer.financials?.creditLimit)} ج.م</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold">
                  <tr>
                    <td className="px-4 py-3 text-right">الإجمالي ({filteredCustomers.length} عميل)</td>
                    <td className="px-4 py-3 text-center">{fmt(summary.totalOutstanding)} ج.م</td>
                    {AGING_BUCKETS.map((bucket) => (
                      <td key={bucket.key} className={`px-4 py-3 text-center text-${bucket.color}-600`}>
                        {fmt(summary[bucket.key])}
                      </td>
                    ))}
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={filteredCustomers.length}
                itemsPerPage={limit}
              />
            </div>
          </>
        )}
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          table { font-size: 10px !important; }
        }
      `}</style>
    </div>
  );
}
