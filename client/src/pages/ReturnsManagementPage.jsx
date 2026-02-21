import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCcw, Search, Filter, Eye, CheckCircle, XCircle, Package,
  Clock, AlertTriangle, ArrowLeft, MessageSquare, Hash, User, Phone
} from 'lucide-react';
import { useAuthStore, api as globalApi } from '../store';
import { Card, LoadingSpinner, EmptyState, Modal } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

const STATUS_CONFIG = {
  pending: { label: 'قيد المراجعة', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  approved: { label: 'تمت الموافقة', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  completed: { label: 'مكتمل', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Package },
};

const REASON_LABELS = {
  defective: 'عيب صناعة',
  wrong_item: 'منتج خاطئ',
  changed_mind: 'تغيير رأي',
  other: 'أخرى',
};

export default function ReturnsManagementPage() {
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);
  const { token } = useAuthStore();

  const api = useCallback((method, url, data) =>
    globalApi({ method, url, data }),
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api('get', `/manage/returns?status=${statusFilter}&search=${search}`);
      const payload = data.data || data;
      setReturns(payload.returns || []);
      setStats(payload.stats || {});
    } catch {
      notify.error('فشل تحميل المرتجعات');
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const updateReturn = async (id, status, adminNotes = '') => {
    setActionLoading(true);
    try {
      await api('patch', `/manage/returns/${id}`, { status, adminNotes });
      notify.success(status === 'approved' ? 'تمت الموافقة على المرتجع' : status === 'rejected' ? 'تم رفض المرتجع' : 'تم التحديث');
      load();
      setSelected(null);
      setShowRejectModal(null);
      setRejectNotes('');
    } catch {
      notify.error('فشل التحديث');
    } finally {
      setActionLoading(false);
    }
  };

  const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <RefreshCcw className="w-6 h-6 text-orange-500" /> إدارة المرتجعات
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">مراجعة طلبات المرتجعات من العملاء</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
          <RefreshCcw className="w-4 h-4" /> تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'قيد المراجعة', count: stats.pending || 0, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', filter: 'pending' },
          { label: 'تمت الموافقة', count: stats.approved || 0, color: 'text-green-600 bg-green-50 dark:bg-green-900/20', filter: 'approved' },
          { label: 'مرفوض', count: stats.rejected || 0, color: 'text-red-600 bg-red-50 dark:bg-red-900/20', filter: 'rejected' },
          { label: 'مكتمل', count: stats.completed || 0, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', filter: 'completed' },
        ].map((s) => (
          <button
            key={s.filter}
            onClick={() => setStatusFilter(statusFilter === s.filter ? '' : s.filter)}
            className={`p-4 rounded-2xl text-center transition-all border-2 ${statusFilter === s.filter ? 'border-primary-500 shadow-md' : 'border-transparent'} ${s.color}`}
          >
            <p className="text-2xl font-black">{s.count}</p>
            <p className="text-xs font-bold mt-1 opacity-70">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث باسم العميل أو رقم الفاتورة..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-sm focus:border-primary-500 outline-none transition"
        />
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : returns.length === 0 ? (
        <EmptyState
          icon={<RefreshCcw className="w-12 h-12 text-gray-300" />}
          title="لا توجد مرتجعات"
          description={statusFilter ? 'لا توجد مرتجعات بهذه الحالة' : 'لم يتم استلام أي طلبات مرتجعات بعد'}
        />
      ) : (
        <Card className="overflow-hidden border-0 shadow-lg shadow-gray-100/50 dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">العميل</th>
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">المنتج</th>
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">الفاتورة</th>
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">السبب</th>
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">الكمية</th>
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">التاريخ</th>
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">الحالة</th>
                  <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {returns.map((ret) => (
                  <tr key={ret._id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-800 dark:text-gray-200">{ret.customer?.name || '—'}</div>
                      <div className="text-xs text-gray-400">{ret.customer?.phone}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {ret.product?.images?.[0] ? (
                          <img src={ret.product.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <Package className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{ret.product?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold text-primary-600">#{ret.invoice?.invoiceNumber || '—'}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-400">{REASON_LABELS[ret.reason] || ret.reason}</td>
                    <td className="px-5 py-4 font-bold">{ret.quantity}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{new Date(ret.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td className="px-5 py-4"><StatusBadge status={ret.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setSelected(ret)} className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition" title="عرض التفاصيل">
                          <Eye className="w-4 h-4" />
                        </button>
                        {ret.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateReturn(ret._id, 'approved')}
                              disabled={actionLoading}
                              className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 transition disabled:opacity-50"
                              title="موافقة"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowRejectModal(ret._id)}
                              className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition"
                              title="رفض"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="تفاصيل طلب المرتجع" size="md">
        {selected && (
          <div className="space-y-4" dir="rtl">
            <div className="flex items-center gap-3">
              <StatusBadge status={selected.status} />
              {selected.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => updateReturn(selected._id, 'approved')} disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition disabled:opacity-50 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> موافقة
                  </button>
                  <button onClick={() => { setShowRejectModal(selected._id); setSelected(null); }}
                    className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> رفض
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                <h4 className="font-bold text-xs text-gray-400 uppercase mb-2 flex items-center gap-1"><User className="w-3 h-3" /> العميل</h4>
                <p className="font-bold">{selected.customer?.name}</p>
                <p className="text-xs text-gray-400 mt-1">{selected.customer?.phone}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                <h4 className="font-bold text-xs text-gray-400 uppercase mb-2 flex items-center gap-1"><Package className="w-3 h-3" /> المنتج</h4>
                <p className="font-bold">{selected.product?.name}</p>
                <p className="text-xs text-gray-400 mt-1">الكمية: {selected.quantity}</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
              <h4 className="font-bold text-xs text-gray-400 uppercase mb-2">سبب الإرجاع</h4>
              <p className="font-bold text-orange-600">{REASON_LABELS[selected.reason]}</p>
              {selected.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{selected.description}</p>}
            </div>

            {selected.adminNotes && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
                <h4 className="font-bold text-xs text-blue-500 uppercase mb-2">ملاحظات الإدارة</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">{selected.adminNotes}</p>
              </div>
            )}

            <div className="text-xs text-gray-400 flex items-center gap-4">
              <span>تاريخ الطلب: {new Date(selected.createdAt).toLocaleString('ar-EG')}</span>
              {selected.reviewedAt && <span>تاريخ المراجعة: {new Date(selected.reviewedAt).toLocaleString('ar-EG')}</span>}
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!showRejectModal} onClose={() => { setShowRejectModal(null); setRejectNotes(''); }} title="رفض المرتجع" size="sm">
        <div className="space-y-4" dir="rtl">
          <p className="text-sm text-gray-600 dark:text-gray-400">يرجى كتابة سبب الرفض (اختياري)</p>
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="سبب الرفض..."
            className="w-full p-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-sm resize-none h-24 focus:border-red-400 outline-none"
          />
          <div className="flex gap-3">
            <button
              onClick={() => updateReturn(showRejectModal, 'rejected', rejectNotes)}
              disabled={actionLoading}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition disabled:opacity-50"
            >
              تأكيد الرفض
            </button>
            <button
              onClick={() => { setShowRejectModal(null); setRejectNotes(''); }}
              className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-sm hover:bg-gray-200 transition"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
