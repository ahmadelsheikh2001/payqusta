import React, { useEffect, useState } from 'react';
import { usePortalStore } from '../store/portalStore';
import {
  FileText, Calendar, Download, ArrowUpCircle, ArrowDownCircle,
  TrendingUp, TrendingDown, Wallet, CreditCard, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { notify } from '../components/AnimatedNotification';

const QUICK_RANGES = [
  { label: 'أسبوع', days: 7 },
  { label: 'شهر', days: 30 },
  { label: '3 أشهر', days: 90 },
  { label: '6 أشهر', days: 180 },
  { label: 'سنة', days: 365 },
];

export default function PortalStatement() {
  const { fetchStatement, downloadStatementPDF, customer } = usePortalStore();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeRange, setActiveRange] = useState(30);
  const [expandedEntry, setExpandedEntry] = useState(null);

  useEffect(() => {
    // Default to last 30 days
    applyQuickRange(30);
  }, []);

  const applyQuickRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const s = start.toISOString().split('T')[0];
    const e = end.toISOString().split('T')[0];
    setStartDate(s);
    setEndDate(e);
    setActiveRange(days);
    loadStatement(s, e);
  };

  const loadStatement = async (s = startDate, e = endDate) => {
    setLoading(true);
    const res = await fetchStatement(s, e);
    if (res) setData(res);
    setLoading(false);
  };

  const handleFilter = (ev) => {
    ev.preventDefault();
    setActiveRange(null);
    loadStatement();
  };

  const handleDownload = async () => {
    setDownloading(true);
    const res = await downloadStatementPDF(startDate, endDate);
    if (!res.success) notify.error('فشل تحميل الملف');
    else notify.success('جاري تحميل كشف الحساب...');
    setDownloading(false);
  };

  const balance = data?.summary?.currentBalance || 0;
  const balanceLabel = balance > 0 ? 'مستحق عليك' : balance < 0 ? 'رصيد دائن' : 'حساب متصفِّي';
  const balanceColor = balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
  const balanceBg = balance > 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600';

  return (
    <div className="space-y-4 pb-24 font-['Cairo']" dir="rtl">

      {/* ══ PAGE HEADER ══ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-500" />
            كشف الحساب
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">سجل معاملاتك المالية الكامل</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading || !data}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-bold hover:bg-primary-600 transition disabled:opacity-60 shadow-md shadow-primary-500/20"
        >
          {downloading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Download className="w-4 h-4" />}
          تحميل PDF
        </button>
      </div>

      {/* ══ DATE RANGE ══ */}
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
        {/* Quick chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {QUICK_RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => applyQuickRange(r.days)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${activeRange === r.days
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-primary-50 hover:text-primary-600'}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        <form onSubmit={handleFilter} className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-[11px] text-gray-400 mb-1">من تاريخ</label>
            <input
              type="date" value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setActiveRange(null); }}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] text-gray-400 mb-1">إلى تاريخ</label>
            <input
              type="date" value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setActiveRange(null); }}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* ══ LOADING ══ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">جاري تحميل كشف الحساب...</p>
        </div>
      ) : !data ? (
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">فشل تحميل كشف الحساب</p>
          <button onClick={() => loadStatement()} className="mt-3 text-sm text-primary-600 underline">إعادة المحاولة</button>
        </div>
      ) : (
        <>
          {/* ══ BALANCE HERO CARD ══ */}
          <div className={`bg-gradient-to-br ${balanceBg} rounded-3xl p-6 text-white shadow-xl`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/70 text-sm font-medium">{customer?.name}</p>
                <p className="text-white/50 text-xs mt-0.5">
                  {startDate ? `${startDate} → ${endDate}` : 'جميع الحركات'}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${balance > 0 ? 'bg-red-400/30' : 'bg-green-400/30'}`}>
                {balanceLabel}
              </div>
            </div>
            <p className="text-4xl font-black tracking-tight">
              {Math.abs(balance).toLocaleString()}
              <span className="text-lg font-bold mr-2 text-white/70">ج.م</span>
            </p>
          </div>

          {/* ══ SUMMARY CARDS ══ */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
              <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-[10px] text-gray-400 mb-1">مشتريات</p>
              <p className="text-base font-black text-blue-600 dark:text-blue-400">
                {data.summary?.totalPurchases?.toLocaleString() || 0}
              </p>
              <p className="text-[9px] text-gray-400">ج.م</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
              <div className="w-9 h-9 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-[10px] text-gray-400 mb-1">مدفوعات</p>
              <p className="text-base font-black text-green-600 dark:text-green-400">
                {data.summary?.totalPayments?.toLocaleString() || 0}
              </p>
              <p className="text-[9px] text-gray-400">ج.م</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
              <div className="w-9 h-9 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <CreditCard className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-[10px] text-gray-400 mb-1">حركات</p>
              <p className="text-base font-black text-gray-900 dark:text-white">
                {data.entries?.length || 0}
              </p>
              <p className="text-[9px] text-gray-400">معاملة</p>
            </div>
          </div>

          {/* ══ LEDGER ══ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">
                سجل الحركات ({data.entries?.length || 0})
              </h3>
            </div>

            {(!data.entries || data.entries.length === 0) ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/30 rounded-2xl">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد حركات في هذه الفترة</p>
                <p className="text-xs text-gray-400 mt-1">جرب تحديد نطاق زمني أوسع</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.entries.map((entry, idx) => {
                  const isPayment = entry.type === 'payment';
                  const isExpanded = expandedEntry === idx;
                  return (
                    <div
                      key={idx}
                      className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all"
                    >
                      <button
                        onClick={() => setExpandedEntry(isExpanded ? null : idx)}
                        className="w-full flex items-center gap-3 p-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-right"
                      >
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPayment
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'}`}>
                          {isPayment ? (
                            <ArrowDownCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <ArrowUpCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>

                        {/* Description */}
                        <div className="flex-1 min-w-0 text-right">
                          <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {entry.description}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {new Date(entry.date).toLocaleDateString('ar-EG', {
                              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </p>
                        </div>

                        {/* Amount + Balance */}
                        <div className="text-left flex-shrink-0">
                          <p className={`font-black text-base ${isPayment ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isPayment ? '−' : '+'}{entry.amount?.toLocaleString()} ج.م
                          </p>
                          <p className="text-[10px] text-gray-400">
                            رصيد: {entry.runningBalance?.toLocaleString()}
                          </p>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>

                      {/* Expandable details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 animate-fade-in">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] text-gray-400">نوع الحركة</p>
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                {isPayment ? '✅ دفعة' : '🛒 مشتريات'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400">التاريخ</p>
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                {new Date(entry.date).toLocaleDateString('ar-EG')}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400">المبلغ</p>
                              <p className={`text-sm font-black ${isPayment ? 'text-green-600' : 'text-red-600'}`}>
                                {entry.amount?.toLocaleString()} ج.م
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400">الرصيد بعد الحركة</p>
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                {entry.runningBalance?.toLocaleString()} ج.م
                              </p>
                            </div>
                          </div>
                          {entry.reference && (
                            <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded-xl">
                              <p className="text-[10px] text-gray-400">رقم المرجع</p>
                              <p className="text-xs font-bold text-primary-600 font-mono">{entry.reference}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ══ FOOTER SUMMARY ══ */}
          {data.entries?.length > 0 && (
            <div className="bg-gray-100 dark:bg-gray-800/60 rounded-2xl p-4 text-sm text-center text-gray-600 dark:text-gray-400">
              كشف الحساب من
              <span className="font-bold text-gray-900 dark:text-white mx-1">{startDate || '—'}</span>
              إلى
              <span className="font-bold text-gray-900 dark:text-white mx-1">{endDate || '—'}</span>
              • تم إنشاؤه بواسطة <span className="font-bold text-primary-600">PayQusta</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
