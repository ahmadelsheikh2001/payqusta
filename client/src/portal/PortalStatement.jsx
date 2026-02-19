import React, { useEffect, useState } from 'react';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { FileText, Calendar, Download, ArrowUpCircle, ArrowDownCircle, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export default function PortalStatement() {
  const { fetchStatement } = usePortalStore();
  const { dark } = useThemeStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadStatement();
  }, []);

  const loadStatement = async () => {
    setLoading(true);
    const res = await fetchStatement(startDate, endDate);
    if (res) setData(res);
    setLoading(false);
  };

  const handleFilter = (e) => {
    e.preventDefault();
    loadStatement();
  };

  // Quick date helpers
  const setQuickRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-4 pb-20" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary-500" />
          كشف الحساب
        </h2>
      </div>

      {/* Date Filter */}
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
        {/* Quick Range Buttons */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { label: 'آخر أسبوع', days: 7 },
            { label: 'آخر شهر', days: 30 },
            { label: '3 أشهر', days: 90 },
            { label: '6 أشهر', days: 180 },
          ].map((r) => (
            <button
              key={r.days}
              onClick={() => setQuickRange(r.days)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-primary-100 hover:text-primary-600 dark:hover:bg-primary-900/30 dark:hover:text-primary-400 transition-all"
            >
              {r.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleFilter} className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">من</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">إلى</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:border-primary-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition-all"
          >
            عرض
          </button>
        </form>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">فشل تحميل كشف الحساب</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 text-center border border-blue-100 dark:border-blue-800">
              <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">إجمالي المشتريات</p>
              <p className="font-black text-lg text-blue-600 dark:text-blue-400">{data.summary?.totalPurchases?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 text-center border border-green-100 dark:border-green-800">
              <ArrowDownCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">إجمالي المدفوعات</p>
              <p className="font-black text-lg text-green-600 dark:text-green-400">{data.summary?.totalPayments?.toLocaleString() || 0}</p>
            </div>
            <div className={`rounded-2xl p-4 text-center border ${
              (data.summary?.currentBalance || 0) > 0
                ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800'
            }`}>
              <Wallet className="w-5 h-5 text-gray-500 mx-auto mb-1" />
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">الرصيد الحالي</p>
              <p className={`font-black text-lg ${
                (data.summary?.currentBalance || 0) > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {Math.abs(data.summary?.currentBalance || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Entries List */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">الحركات ({data.entries?.length || 0})</h3>

            {(!data.entries || data.entries.length === 0) ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد حركات في هذه الفترة</p>
              </div>
            ) : (
              data.entries.map((entry, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800/80 rounded-xl p-3 border border-gray-100 dark:border-gray-700 flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    entry.type === 'payment'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {entry.type === 'payment' ? (
                      <ArrowDownCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <ArrowUpCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {entry.description}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {new Date(entry.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>

                  <div className="text-left flex-shrink-0">
                    <p className={`font-bold text-sm ${
                      entry.type === 'payment'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {entry.type === 'payment' ? '-' : '+'}{entry.amount?.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      رصيد: {entry.runningBalance?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
