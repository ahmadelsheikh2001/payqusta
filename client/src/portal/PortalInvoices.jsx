import React, { useEffect, useState } from 'react';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { Receipt, Eye, X, Calendar, CreditCard, Clock, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, Filter, Download, RefreshCcw, DollarSign } from 'lucide-react';
import { notify } from '../components/AnimatedNotification';


const statusConfig = {
  paid: { label: 'مدفوعة', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  partial: { label: 'جزئية', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  pending: { label: 'معلقة', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
  overdue: { label: 'متأخرة', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
};

export default function PortalInvoices() {
  const { fetchInvoices, fetchInvoiceDetails, downloadInvoicePDF, createReturnRequest, payInvoice } = usePortalStore();

  const { dark } = useThemeStore();
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Payment State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  // Return Request State
  const [returnItem, setReturnItem] = useState(null);
  const [returnReason, setReturnReason] = useState('defective');
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnDesc, setReturnDesc] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  useEffect(() => {
    loadInvoices(1, statusFilter);
  }, [statusFilter]);

  const loadInvoices = async (page, status) => {
    setLoading(true);
    const res = await fetchInvoices(page, status);
    if (res) {
      setInvoices(res.invoices || []);
      setPagination({ page: res.page || 1, pages: res.pages || 1, total: res.total || 0 });
    }
    setLoading(false);
  };

  const openDetails = async (id) => {
    setDetailsLoading(true);
    const res = await fetchInvoiceDetails(id);
    if (res) setSelectedInvoice(res);
    setDetailsLoading(false);
  };

  const filters = [
    { value: 'all', label: 'الكل' },
    { value: 'paid', label: 'مدفوعة' },
    { value: 'partial', label: 'جزئية' },
    { value: 'pending', label: 'معلقة' },
    { value: 'overdue', label: 'متأخرة' },
  ];

  return (
    <div className="space-y-4 pb-20" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Receipt className="w-6 h-6 text-primary-500" />
          فواتيري
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">{pagination.total} فاتورة</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${statusFilter === f.value
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد فواتير</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const status = statusConfig[inv.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <div
                key={inv._id}
                onClick={() => openDetails(inv._id)}
                className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm cursor-pointer hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">فاتورة #{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(inv.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${status.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">الإجمالي</p>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{inv.totalAmount?.toLocaleString()}</p>
                  </div>
                  <div className="text-center border-x border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">المدفوع</p>
                    <p className="font-bold text-sm text-green-600 dark:text-green-400">{inv.paidAmount?.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">المتبقي</p>
                    <p className="font-bold text-sm text-red-600 dark:text-red-400">{inv.remainingAmount?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>{inv.items?.length || 0} منتج</span>
                  <span className="flex items-center gap-1 text-primary-500">
                    عرض التفاصيل <ChevronLeft className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-4">
          <button
            onClick={() => loadInvoices(pagination.page - 1, statusFilter)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {pagination.page} / {pagination.pages}
          </span>
          <button
            onClick={() => loadInvoices(pagination.page + 1, statusFilter)}
            disabled={pagination.page >= pagination.pages}
            className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 disabled:opacity-40"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Invoice Details Modal */}
      {(selectedInvoice || detailsLoading) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => !detailsLoading && setSelectedInvoice(null)}>
          <div
            className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {detailsLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : selectedInvoice && (
              <>
                {/* Modal Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 flex justify-between items-center z-10">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    فاتورة #{selectedInvoice.invoiceNumber}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const res = await downloadInvoicePDF(selectedInvoice._id);
                        if (!res.success) notify.error('فشل تحميل الفاتورة');
                      }}
                      className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 transition flex items-center gap-1 text-xs font-bold"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                    <button onClick={() => setSelectedInvoice(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">التاريخ</p>
                      <p className="font-bold text-gray-900 dark:text-white text-sm mt-1">
                        {new Date(selectedInvoice.date).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">الحالة</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mt-1 ${(statusConfig[selectedInvoice.status] || statusConfig.pending).color}`}>
                        {(statusConfig[selectedInvoice.status] || statusConfig.pending).label}
                      </span>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">المدفوع</p>
                      <p className="font-bold text-green-600 dark:text-green-400 text-sm mt-1">
                        {selectedInvoice.paidAmount?.toLocaleString()} ج.م
                      </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">المتبقي</p>
                      <p className="font-bold text-red-600 dark:text-red-400 text-sm mt-1">
                        {selectedInvoice.remainingAmount?.toLocaleString()} ج.م
                      </p>
                    </div>
                  </div>

                  {/* Pay Now Button */}
                  {selectedInvoice.remainingAmount > 0 && (
                    <button
                      onClick={() => {
                        setPayAmount(String(selectedInvoice.remainingAmount));
                        setPayMethod('cash');
                        setPayNotes('');
                        setPayModalOpen(true);
                      }}
                      className="w-full py-3 bg-primary-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-600 transition shadow-lg shadow-primary-500/20"
                    >
                      <DollarSign className="w-5 h-5" />
                      سداد المبلغ ({selectedInvoice.remainingAmount?.toLocaleString()} ج.م)
                    </button>
                  )}

                  {/* Items Table */}
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-sm">المنتجات</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-right p-3 text-xs text-gray-500 dark:text-gray-400 font-medium">المنتج</th>
                            <th className="text-center p-3 text-xs text-gray-500 dark:text-gray-400 font-medium">الكمية</th>
                            <th className="text-center p-3 text-xs text-gray-500 dark:text-gray-400 font-medium">السعر</th>
                            <th className="text-left p-3 text-xs text-gray-500 dark:text-gray-400 font-medium">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.items?.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                              <td className="p-3 font-medium text-gray-900 dark:text-white">{item.productName || item.product?.name || '-'}</td>
                              <td className="p-3 text-center text-gray-600 dark:text-gray-400">{item.quantity}</td>
                              <td className="p-3 text-center text-gray-600 dark:text-gray-400">{item.price?.toLocaleString()}</td>
                              <td className="p-3 text-left font-bold text-gray-900 dark:text-white flex items-center justify-between gap-2">
                                <span>{item.total?.toLocaleString()}</span>
                                <button
                                  onClick={() => {
                                    setReturnItem({ ...item, invoiceId: selectedInvoice._id });
                                    setReturnQuantity(1);
                                    setReturnReason('defective');
                                    setReturnDesc('');
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
                                  title="طلب إرجاع"
                                >
                                  <RefreshCcw className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 dark:bg-gray-700/50">
                            <td colSpan="3" className="p-3 font-bold text-gray-900 dark:text-white">الإجمالي</td>
                            <td className="p-3 text-left font-black text-primary-600 dark:text-primary-400">{selectedInvoice.totalAmount?.toLocaleString()} ج.م</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Installments */}
                  {selectedInvoice.installments && selectedInvoice.installments.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-sm flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary-500" />
                        جدول الأقساط
                      </h4>
                      <div className="space-y-2">
                        {selectedInvoice.installments.map((inst, idx) => (
                          <div
                            key={idx}
                            className={`flex justify-between items-center p-3 rounded-xl border ${inst.status === 'paid'
                              ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                              : inst.status === 'overdue'
                                ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                              }`}
                          >
                            <div>
                              <p className="font-bold text-sm text-gray-900 dark:text-white">قسط {idx + 1}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {new Date(inst.dueDate).toLocaleDateString('ar-EG')}
                              </p>
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-sm text-gray-900 dark:text-white">{inst.amount?.toLocaleString()} ج.م</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inst.status === 'paid'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : inst.status === 'overdue'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                {inst.status === 'paid' ? 'مدفوع' : inst.status === 'overdue' ? 'متأخر' : 'قادم'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedInvoice.notes && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-3 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ملاحظات</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{selectedInvoice.notes}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary-500" />
                سداد الفاتورة #{selectedInvoice.invoiceNumber}
              </h3>
              <button onClick={() => setPayModalOpen(false)} disabled={payLoading} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">المبلغ المتبقي</p>
                <p className="text-2xl font-black text-primary-600 dark:text-primary-400">{selectedInvoice.remainingAmount?.toLocaleString()} ج.م</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">المبلغ المراد سداده</label>
                <input
                  type="number"
                  min="1"
                  max={selectedInvoice.remainingAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition text-center text-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">طريقة الدفع</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'cash', label: 'كاش' },
                    { value: 'card', label: 'بطاقة' },
                    { value: 'transfer', label: 'تحويل' },
                  ].map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setPayMethod(m.value)}
                      className={`py-2 rounded-xl text-sm font-bold transition ${payMethod === m.value
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">ملاحظات (اختياري)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="أي ملاحظات..."
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition"
                />
              </div>

              <button
                onClick={async () => {
                  const amount = parseFloat(payAmount);
                  if (!amount || amount <= 0 || amount > selectedInvoice.remainingAmount) {
                    notify.error('يرجى إدخال مبلغ صحيح');
                    return;
                  }
                  setPayLoading(true);
                  const res = await payInvoice(selectedInvoice._id, amount, payMethod, payNotes);
                  setPayLoading(false);
                  if (res.success) {
                    notify.success('تم السداد بنجاح!');
                    setPayModalOpen(false);
                    setSelectedInvoice(null);
                    loadInvoices(pagination.page, statusFilter);
                  } else {
                    notify.error(res.message || 'فشل السداد');
                  }
                }}
                disabled={payLoading}
                className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/20 disabled:opacity-50"
              >
                {payLoading ? 'جاري السداد...' : `تأكيد السداد (${parseFloat(payAmount || 0).toLocaleString()} ج.م)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Request Modal */}
      {returnItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <RefreshCcw className="w-5 h-5 text-primary-500" />
                طلب إرجاع منتج
              </h3>
              <button
                onClick={() => setReturnItem(null)}
                disabled={returnLoading}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <p className="font-bold text-gray-900 dark:text-white text-sm">{returnItem.productName || returnItem.product?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">الكمية المشتراة: {returnItem.quantity}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">الكمية المراد إرجاعها</label>
                <input
                  type="number"
                  min="1"
                  max={returnItem.quantity}
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(Math.min(parseInt(e.target.value) || 1, returnItem.quantity))}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">سبب الإرجاع</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition"
                >
                  <option value="defective">عيوب صناعة</option>
                  <option value="wrong_item">منتج خاطئ</option>
                  <option value="changed_mind">غيرت رأيي</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">ملاحظات إضافية</label>
                <textarea
                  rows="2"
                  value={returnDesc}
                  onChange={(e) => setReturnDesc(e.target.value)}
                  placeholder="اشرح المشكلة بالتفصيل..."
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={async () => {
                    setReturnLoading(true);
                    const res = await createReturnRequest({
                      invoiceId: returnItem.invoiceId,
                      productId: returnItem.product._id || returnItem.product,
                      quantity: returnQuantity,
                      reason: returnReason,
                      description: returnDesc
                    });

                    if (res.success) {
                      notify.success('تم إرسال طلب الإرجاع بنجاح');
                      setReturnItem(null);
                    } else {
                      notify.error(res.message);
                    }
                    setReturnLoading(false);
                  }}
                  disabled={returnLoading}
                  className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/20 disabled:opacity-50"
                >
                  {returnLoading ? 'جاري الإرسال...' : 'تأكيد طلب الإرجاع'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
