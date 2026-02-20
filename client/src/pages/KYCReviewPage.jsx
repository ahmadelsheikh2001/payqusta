import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, CheckCircle, XCircle, Clock, Eye, RefreshCw,
  User, Phone, CreditCard, Shield, Image, AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '../store';
import { Card, LoadingSpinner, EmptyState, Modal } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import axios from 'axios';

const STATUS_CONFIG = {
  pending: { label: 'قيد المراجعة', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  approved: { label: 'مقبول', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

const TYPE_LABELS = {
  national_id: { label: 'البطاقة الشخصية', icon: CreditCard },
  passport: { label: 'جواز السفر', icon: Shield },
  utility_bill: { label: 'فاتورة خدمات', icon: FileText },
  contract: { label: 'عقد', icon: FileText },
  other: { label: 'مستند آخر', icon: FileText },
};

export default function KYCReviewPage() {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewDoc, setViewDoc] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);
  const { token } = useAuthStore();

  const api = useCallback((method, url, data) =>
    axios({ method, url: `/api/v1${url}`, data, headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api('get', `/manage/documents?status=${statusFilter}`);
      const payload = data.data || data;
      setDocuments(payload.documents || []);
      setStats(payload.stats || {});
    } catch {
      notify.error('فشل تحميل المستندات');
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const reviewDocument = async (customerId, docId, status, reason = '') => {
    setActionLoading(true);
    try {
      await api('patch', `/manage/documents/${customerId}/${docId}`, { status, rejectionReason: reason });
      notify.success(status === 'approved' ? 'تمت الموافقة على المستند' : 'تم رفض المستند');
      load();
      setViewDoc(null);
      setShowRejectModal(null);
      setRejectReason('');
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
            <Shield className="w-6 h-6 text-indigo-500" /> مراجعة مستندات العملاء
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">مراجعة والموافقة على مستندات التحقق من الهوية (KYC)</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
          <RefreshCw className="w-4 h-4" /> تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'قيد المراجعة', count: stats.pending || 0, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', filter: 'pending' },
          { label: 'مقبول', count: stats.approved || 0, color: 'text-green-600 bg-green-50 dark:bg-green-900/20', filter: 'approved' },
          { label: 'مرفوض', count: stats.rejected || 0, color: 'text-red-600 bg-red-50 dark:bg-red-900/20', filter: 'rejected' },
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

      {/* Documents Grid */}
      {loading ? <LoadingSpinner /> : documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12 text-gray-300" />}
          title="لا توجد مستندات"
          description={statusFilter ? 'لا توجد مستندات بهذه الحالة' : 'لم يتم رفع أي مستندات بعد'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const typeInfo = TYPE_LABELS[doc.type] || TYPE_LABELS.other;
            const TypeIcon = typeInfo.icon;
            return (
              <Card key={doc._id} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                {/* Document Preview */}
                <div
                  className="h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center cursor-pointer relative group"
                  onClick={() => setViewDoc(doc)}
                >
                  {doc.url?.startsWith('data:image') ? (
                    <img src={doc.url} alt="Document" className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-16 h-16 text-gray-300" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute top-2 left-2">
                    <StatusBadge status={doc.status} />
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="w-4 h-4 text-indigo-500" />
                      <span className="font-bold text-sm">{typeInfo.label}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(doc.uploadedAt).toLocaleDateString('ar-EG')}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                      {doc.customerPhoto ? (
                        <img src={doc.customerPhoto} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-primary-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{doc.customerName}</p>
                      <p className="text-[10px] text-gray-400">{doc.customerPhone}</p>
                    </div>
                  </div>

                  {doc.rejectionReason && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      {doc.rejectionReason}
                    </div>
                  )}

                  {/* Actions */}
                  {doc.status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => reviewDocument(doc.customerId, doc._id, 'approved')}
                        disabled={actionLoading}
                        className="flex-1 py-2 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> قبول
                      </button>
                      <button
                        onClick={() => setShowRejectModal(doc)}
                        className="flex-1 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> رفض
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Document Modal */}
      <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title="عرض المستند" size="lg">
        {viewDoc && (
          <div className="space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-bold">{viewDoc.customerName}</p>
                  <p className="text-xs text-gray-400">{viewDoc.customerPhone}</p>
                </div>
              </div>
              <StatusBadge status={viewDoc.status} />
            </div>

            {/* Document Image */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden flex items-center justify-center min-h-[300px]">
              {viewDoc.url?.startsWith('data:image') ? (
                <img src={viewDoc.url} alt="Document" className="max-w-full max-h-[500px] object-contain" />
              ) : viewDoc.url?.startsWith('data:application/pdf') ? (
                <div className="text-center p-8">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">ملف PDF</p>
                </div>
              ) : (
                <div className="text-center p-8">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">مستند</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>النوع: <strong>{TYPE_LABELS[viewDoc.type]?.label || viewDoc.type}</strong></span>
              <span>تاريخ الرفع: {new Date(viewDoc.uploadedAt).toLocaleString('ar-EG')}</span>
            </div>

            {viewDoc.status === 'pending' && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => reviewDocument(viewDoc.customerId, viewDoc._id, 'approved')}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" /> قبول المستند
                </button>
                <button
                  onClick={() => { setShowRejectModal(viewDoc); setViewDoc(null); }}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" /> رفض المستند
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!showRejectModal} onClose={() => { setShowRejectModal(null); setRejectReason(''); }} title="رفض المستند" size="sm">
        <div className="space-y-4" dir="rtl">
          <p className="text-sm text-gray-600 dark:text-gray-400">يرجى كتابة سبب الرفض ليتم إبلاغ العميل</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="مثال: الصورة غير واضحة، يرجى إعادة الرفع..."
            className="w-full p-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-sm resize-none h-24 focus:border-red-400 outline-none"
          />
          <div className="flex gap-3">
            <button
              onClick={() => showRejectModal && reviewDocument(showRejectModal.customerId, showRejectModal._id, 'rejected', rejectReason)}
              disabled={actionLoading}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition disabled:opacity-50"
            >
              تأكيد الرفض
            </button>
            <button
              onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
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
