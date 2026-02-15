import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, Users, MessageCircle, Star, Check, X, Eye, Printer,
  FileText, Send, Phone, Calendar, CreditCard, TrendingUp, TrendingDown,
  ShieldAlert, ShieldCheck, Ban, CheckCircle, Clock, AlertTriangle,
  Download, History, DollarSign, ChevronDown, ChevronUp, Package,
  RefreshCw, ChevronLeft, ChevronRight, CheckSquare, Square, XCircle, Trash2, Bell, BellOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notify } from '../components/AnimatedNotification';
import { customersApi, creditApi, api } from '../store';
import { Button, Input, Modal, Badge, Card, LoadingSpinner, EmptyState } from '../components/UI';
import Pagination from '../components/Pagination';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
  const [tierFilter, setTierFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '', creditLimit: 10000 });
  
  // Customer Details Modal
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [transactionsPagination, setTransactionsPagination] = useState({ page: 1, totalPages: 1 });
  const [creditAssessment, setCreditAssessment] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const printRef = useRef(null);
  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, search };
      if (tierFilter) params.tier = tierFilter;
      const res = await customersApi.getAll(params);
      setCustomers(res.data.data || []);
      setPagination({ totalPages: res.data.pagination?.totalPages || 1, totalItems: res.data.pagination?.totalItems || 0 });
    } catch { toast.error('خطأ في تحميل العملاء'); }
    finally { setLoading(false); }
  }, [page, search, tierFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, tierFilter]);

  const openAdd = () => { setEditId(null); setForm({ name: '', phone: '', email: '', address: '', notes: '', creditLimit: 10000 }); setShowModal(true); };
  const openEdit = (c, e) => {
    e?.stopPropagation();
    setEditId(c._id);
    setForm({ 
      name: c.name, 
      phone: c.phone, 
      email: c.email || '', 
      address: c.address || '', 
      notes: c.notes || '',
      creditLimit: c.financials?.creditLimit || 10000 
    });
    setShowModal(true);
  };

  // Open customer details with transactions
  const openDetails = async (customer) => {
    setSelectedCustomer(customer);
    setShowDetails(true);
    setLoadingDetails(true);
    setCreditAssessment(null);
    setCustomerTransactions([]);
    setExpandedInvoice(null);
    
    try {
      const [transRes, creditRes] = await Promise.all([
        customersApi.getTransactions(customer._id),
        creditApi.getAssessment(customer._id).catch(() => null),
      ]);
      setCustomerTransactions(transRes.data.data?.invoices || []);
      setTransactionsPagination({
        page: transRes.data.data?.pagination?.page || 1,
        totalPages: transRes.data.data?.pagination?.totalPages || 1,
      });
      if (creditRes?.data?.data) setCreditAssessment(creditRes.data.data);
    } catch (err) {
      toast.error('خطأ في تحميل بيانات العميل');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.phone) return toast.error('الاسم والهاتف مطلوبين');
    setSaving(true);
    try {
      if (editId) { await customersApi.update(editId, form); toast.success('تم تحديث العميل ✅'); }
      else { await customersApi.create(form); toast.success('تم إضافة العميل ✅'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'حدث خطأ'); }
    finally { setSaving(false); }
  };

  // Block/Unblock sales
  const handleBlockSales = async (customerId, block) => {
    try {
      if (block) {
        await creditApi.blockSales(customerId, 'منع البيع بسبب المتأخرات');
        toast.success('تم منع البيع للعميل');
      } else {
        await creditApi.unblockSales(customerId);
        toast.success('تم السماح بالبيع للعميل');
      }
      const creditRes = await creditApi.getAssessment(customerId);
      if (creditRes?.data?.data) setCreditAssessment(creditRes.data.data);
      load();
    } catch (err) {
      toast.error('خطأ في تحديث حالة العميل');
    }
  };

  // Print statement
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${selectedCustomer?.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px; direction: rtl; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
          .info-box { background: #f5f5f5; padding: 10px; border-radius: 5px; }
          .info-box label { font-size: 10px; color: #666; display: block; }
          .info-box span { font-size: 14px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background: #333; color: white; font-size: 11px; }
          .paid { color: green; }
          .overdue { color: red; }
          .total-row { background: #eee !important; font-weight: bold; }
          .items-table { margin: 10px 0; background: #fafafa; }
          .items-table th { background: #666; }
          @media print { body { print-color-adjust: exact; } }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Send statement via WhatsApp API (as PDF)
  const handleSendWhatsApp = async () => {
    if (!selectedCustomer?.phone) return toast.error('رقم الهاتف غير متوفر');
    setSendingWhatsApp(true);
    
    try {
      const response = await customersApi.sendStatementPDF(selectedCustomer._id);
      if (response.data.data?.whatsappSent) {
        toast.success('تم إرسال كشف الحساب PDF عبر WhatsApp ✅');
      } else {
        toast.success('تم إرسال ملخص الكشف عبر WhatsApp');
      }
    } catch (err) {
      const message = `كشف حساب: ${selectedCustomer.name}\nالمستحق: ${(selectedCustomer.financials?.outstandingBalance || 0).toLocaleString('ar-EG')} ج.م`;
      const phone = selectedCustomer.phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const tierBadge = (tier) => {
    if (tier === 'vip') return <Badge variant="warning">⭐ VIP</Badge>;
    if (tier === 'premium') return <Badge variant="success">Premium</Badge>;
    return <Badge variant="gray">عادي</Badge>;
  };

  const statusBadge = (status) => {
    const map = {
      paid: { variant: 'success', label: 'مسدد', icon: CheckCircle },
      pending: { variant: 'warning', label: 'قيد السداد', icon: Clock },
      partially_paid: { variant: 'primary', label: 'مسدد جزئياً', icon: Clock },
      overdue: { variant: 'danger', label: 'متأخر', icon: AlertTriangle },
    };
    const s = map[status] || map.pending;
    return <Badge variant={s.variant}><s.icon className="w-3 h-3 ml-1" />{s.label}</Badge>;
  };

  const riskBadge = (level) => {
    const map = {
      low: { variant: 'success', label: 'منخفض', icon: ShieldCheck },
      medium: { variant: 'warning', label: 'متوسط', icon: ShieldAlert },
      high: { variant: 'danger', label: 'مرتفع', icon: ShieldAlert },
      blocked: { variant: 'danger', label: 'محظور', icon: Ban },
    };
    const r = map[level] || map.low;
    return <Badge variant={r.variant}><r.icon className="w-3 h-3 ml-1" />{r.label}</Badge>;
  };

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');

  // Toggle invoice expansion to show items
  const toggleInvoiceExpand = (invoiceId) => {
    setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
  };

  // Bulk selection
  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === customers.length) setSelectedIds([]);
    else setSelectedIds(customers.map((c) => c._id));
  };
  const handleBulkDelete = () => {
    notify.custom({
      type: 'error',
      title: 'تأكيد الحذف الجماعي',
      message: `هل أنت متأكد من حذف ${selectedIds.length} عميل؟`,
      duration: 10000,
      action: {
        label: `حذف ${selectedIds.length} عميل`,
        onClick: async () => {
          setBulkDeleting(true);
          try {
            await api.post('/customers/bulk-delete', { ids: selectedIds });
            notify.success(`تم حذف ${selectedIds.length} عميل بنجاح`);
            setSelectedIds([]);
            load();
          } catch { notify.error('حدث خطأ في الحذف الجماعي'); }
          finally { setBulkDeleting(false); }
        },
      },
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:border-primary-500 transition-all" />
        </div>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm cursor-pointer">
          <option value="">كل العملاء</option>
          <option value="vip">⭐ VIP</option>
          <option value="premium">Premium</option>
          <option value="normal">عادي</option>
        </select>
        <Button icon={<Plus className="w-4 h-4" />} onClick={openAdd}>إضافة عميل</Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 border-2 border-primary-200 dark:border-primary-500/30 animate-fade-in">
          <button onClick={toggleSelectAll} className="p-1">
            {selectedIds.length === customers.length ? <CheckSquare className="w-5 h-5 text-primary-500" /> : <Square className="w-5 h-5 text-primary-500" />}
          </button>
          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">تم تحديد {selectedIds.length} عميل</span>
          <div className="mr-auto flex gap-2">
            <Button size="sm" variant="danger" icon={<Trash2 className="w-3.5 h-3.5" />} loading={bulkDeleting} onClick={handleBulkDelete}>
              حذف المحدد
            </Button>
            <button onClick={() => setSelectedIds([])} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition">
              <XCircle className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {/* Customers Table */}
      {loading ? <LoadingSpinner /> : customers.length === 0 ? (
        <EmptyState icon={<Users className="w-8 h-8" />} title="لا يوجد عملاء" description={search ? `لا نتائج لـ "${search}"` : 'ابدأ بإضافة أول عميل'} />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-100 dark:border-gray-800">
                    <th className="px-3 py-3 w-10">
                      <button onClick={toggleSelectAll}>
                        {selectedIds.length === customers.length && customers.length > 0 ? <CheckSquare className="w-4 h-4 text-primary-500" /> : <Square className="w-4 h-4 text-gray-400" />}
                      </button>
                    </th>
                    {['العميل', 'الهاتف', 'المشتريات', 'المستحق', 'النقاط', 'الحالة', 'الإجراءات'].map((h) => (
                      <th key={h} className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c._id} className={`border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${c.salesBlocked ? 'bg-red-50/50 dark:bg-red-900/10' : ''} ${selectedIds.includes(c._id) ? 'bg-primary-50/50 dark:bg-primary-500/5' : ''}`}>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleSelect(c._id)}>
                          {selectedIds.includes(c._id)
                            ? <CheckSquare className="w-4 h-4 text-primary-500" />
                            : <Square className="w-4 h-4 text-gray-300 dark:text-gray-600 hover:text-primary-400" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${c.salesBlocked ? 'bg-red-100 dark:bg-red-500/20 text-red-600' : 'bg-primary-50 dark:bg-primary-500/10 text-primary-600'}`}>
                            {c.salesBlocked ? <Ban className="w-4 h-4" /> : c.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold flex items-center gap-2">
                              {c.name}
                              {c.salesBlocked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">ممنوع</span>}
                            </p>
                            <p className="text-xs text-gray-400">{c.address || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs" dir="ltr">{c.phone}</td>
                      <td className="px-4 py-3 font-bold">{fmt(c.financials?.totalPurchases)} ج.م</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${(c.financials?.outstandingBalance || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {(c.financials?.outstandingBalance || 0) > 0 ? `${fmt(c.financials.outstandingBalance)} ج.م` : '✓ مسدد'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-amber-500 font-bold"><Star className="w-3.5 h-3.5" fill="currentColor" />{c.gamification?.points || 0}</span>
                      </td>
                      <td className="px-4 py-3">{tierBadge(c.tier)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openDetails(c)} className="p-2 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-500 hover:bg-primary-100 transition-colors" title="عرض التفاصيل">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => openEdit(c, e)} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 transition-colors" title="تعديل">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => window.open(`https://wa.me/${c.phone}`, '_blank')} className="p-2 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-500 hover:bg-green-100 transition-colors" title="WhatsApp">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Pagination currentPage={page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} onPageChange={setPage} />
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'تعديل عميل' : 'إضافة عميل جديد'}>
        <div className="space-y-4">
          <Input label="اسم العميل *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="رقم الهاتف *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" />
          <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="العنوان" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label="الحد الائتماني (ج.م)" type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
          <Button icon={<Check className="w-4 h-4" />} onClick={handleSave} loading={saving}>{editId ? 'تحديث' : 'إضافة'}</Button>
        </div>
      </Modal>

      {/* Customer Details Modal */}
      {showDetails && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setShowDetails(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
          <div className="relative w-full max-w-5xl mx-auto my-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-l from-primary-500/5 to-transparent">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold ${selectedCustomer.salesBlocked ? 'bg-red-100 text-red-600' : 'bg-primary-100 dark:bg-primary-500/20 text-primary-600'}`}>
                  {selectedCustomer.salesBlocked ? <Ban className="w-7 h-7" /> : selectedCustomer.name?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    {selectedCustomer.name}
                    {tierBadge(selectedCustomer.tier)}
                    {selectedCustomer.salesBlocked && <Badge variant="danger"><Ban className="w-3 h-3 ml-1" />ممنوع البيع</Badge>}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{selectedCustomer.phone}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 ml-1" />طباعة</Button>
                <Button variant="whatsapp" size="sm" onClick={handleSendWhatsApp} loading={sendingWhatsApp}><Send className="w-4 h-4 ml-1" />إرسال WhatsApp</Button>
                <button onClick={() => setShowDetails(false)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetails ? <LoadingSpinner /> : (
                <div className="space-y-6">
                  {/* Financial Summary */}
                  {/* Financial Summary */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/20">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-xs font-medium text-primary-100">المشتريات</p>
                      </div>
                      <p className="text-2xl font-black">{fmt(selectedCustomer.financials?.totalPurchases)}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-xs font-medium text-gray-400">المدفوع</p>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(selectedCustomer.financials?.totalPaid)}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${(selectedCustomer.financials?.outstandingBalance || 0) > 0 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10'}`}>
                          <TrendingDown className={`w-4 h-4 ${(selectedCustomer.financials?.outstandingBalance || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                        </div>
                        <p className="text-xs font-medium text-gray-400">المتبقي</p>
                      </div>
                      <p className={`text-2xl font-black ${(selectedCustomer.financials?.outstandingBalance || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {fmt(selectedCustomer.financials?.outstandingBalance)}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-xs font-medium text-gray-400">الحد الائتماني</p>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(selectedCustomer.financials?.creditLimit || 10000)}</p>
                    </div>
                  </div>

                  {/* Credit Assessment */}
                  {creditAssessment && (
                    <Card className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary-500" />التقييم الائتماني</h3>
                        <div className="flex items-center gap-2">
                          {riskBadge(creditAssessment.creditEngine?.riskLevel)}
                          {!creditAssessment.salesBlocked ? (
                            <Button variant="danger" size="sm" onClick={() => handleBlockSales(selectedCustomer._id, true)}><Ban className="w-4 h-4 ml-1" />منع البيع</Button>
                          ) : (
                            <Button variant="success" size="sm" onClick={() => handleBlockSales(selectedCustomer._id, false)}><CheckCircle className="w-4 h-4 ml-1" />السماح بالبيع</Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <p className="text-3xl font-black" style={{ color: creditAssessment.creditEngine?.score >= 70 ? '#10b981' : creditAssessment.creditEngine?.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                            {creditAssessment.creditEngine?.score || 0}
                          </p>
                          <p className="text-xs text-gray-400">درجة الائتمان</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <p className="text-xl font-bold">{creditAssessment.creditEngine?.maxInstallments || 0}</p>
                          <p className="text-xs text-gray-400">أقصى أقساط</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <p className="text-xl font-bold">{creditAssessment.paymentBehavior?.onTimePayments || 0}</p>
                          <p className="text-xs text-gray-400">دفعات في الميعاد</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                          <p className="text-xl font-bold text-red-500">{creditAssessment.paymentBehavior?.latePayments || 0}</p>
                          <p className="text-xs text-gray-400">دفعات متأخرة</p>
                        </div>
                      </div>
                      {creditAssessment.recommendation && (
                        <div className="mt-4 p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-sm">
                          {creditAssessment.recommendation}
                        </div>
                      )}
                    </Card>
                  )}

                  {/* WhatsApp Notification Preferences */}
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-green-500" />
                        إعدادات WhatsApp
                      </h3>
                      <button
                        onClick={async () => {
                          const newEnabled = !(selectedCustomer.whatsapp?.enabled !== false);
                          try {
                            await customersApi.updateWhatsAppPreferences(selectedCustomer._id, { enabled: newEnabled });
                            setSelectedCustomer(prev => ({ ...prev, whatsapp: { ...prev.whatsapp, enabled: newEnabled } }));
                            notify.success(newEnabled ? 'تم تفعيل إشعارات WhatsApp' : 'تم تعطيل إشعارات WhatsApp');
                          } catch { notify.error('خطأ في تحديث الإعدادات'); }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${selectedCustomer.whatsapp?.enabled !== false ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${selectedCustomer.whatsapp?.enabled !== false ? 'translate-x-1' : 'translate-x-6'}`} />
                      </button>
                    </div>
                    {selectedCustomer.whatsapp?.enabled !== false && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { key: 'invoices', label: 'الفواتير', icon: FileText, color: 'text-blue-500' },
                          { key: 'reminders', label: 'التذكيرات', icon: Clock, color: 'text-amber-500' },
                          { key: 'statements', label: 'كشف الحساب', icon: DollarSign, color: 'text-purple-500' },
                          { key: 'payments', label: 'تأكيد الدفع', icon: Check, color: 'text-emerald-500' },
                        ].map(({ key, label, icon: Icon, color }) => {
                          const isOn = selectedCustomer.whatsapp?.notifications?.[key] !== false;
                          return (
                            <button
                              key={key}
                              onClick={async () => {
                                try {
                                  await customersApi.updateWhatsAppPreferences(selectedCustomer._id, { notifications: { [key]: !isOn } });
                                  setSelectedCustomer(prev => ({
                                    ...prev,
                                    whatsapp: {
                                      ...prev.whatsapp,
                                      notifications: { ...(prev.whatsapp?.notifications || {}), [key]: !isOn },
                                    },
                                  }));
                                  notify.success(`${!isOn ? 'تفعيل' : 'تعطيل'} ${label}`);
                                } catch { notify.error('خطأ في التحديث'); }
                              }}
                              className={`p-3 rounded-xl border-2 transition-all text-center ${isOn
                                ? 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10'
                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'}`}
                            >
                              <Icon className={`w-5 h-5 mx-auto mb-1 ${isOn ? color : 'text-gray-400'}`} />
                              <p className="text-xs font-medium">{label}</p>
                              <p className={`text-[10px] mt-0.5 ${isOn ? 'text-green-600' : 'text-gray-400'}`}>{isOn ? 'مفعل' : 'معطل'}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  {/* Transaction History with Invoice Details */}
                  <Card className="p-5">
                    <h3 className="font-bold flex items-center gap-2 mb-4">
                      <History className="w-5 h-5 text-primary-500" />
                      سجل المعاملات ({customerTransactions.length})
                      <span className="text-xs text-gray-400 font-normal mr-2">اضغط على الفاتورة لعرض التفاصيل</span>
                    </h3>
                    {customerTransactions.length === 0 ? (
                      <p className="text-center text-gray-400 py-6">لا توجد معاملات بعد</p>
                    ) : (
                      <div className="space-y-3">
                        {customerTransactions.map((inv) => (
                          <div key={inv._id} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                            {/* Invoice Header - Clickable */}
                            <div 
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                              onClick={() => toggleInvoiceExpand(inv._id)}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-500' : inv.status === 'overdue' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-bold text-primary-600">{inv.invoiceNumber}</p>
                                  <p className="text-xs text-gray-400">{new Date(inv.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-left">
                                  <p className="font-bold">{fmt(inv.totalAmount)} ج.م</p>
                                  <p className="text-xs text-gray-400">{inv.items?.length || 0} منتج</p>
                                </div>
                                <div className="text-left">
                                  {statusBadge(inv.status)}
                                </div>
                                <div className="text-left min-w-[80px]">
                                  {inv.remainingAmount > 0 ? (
                                    <p className="text-red-500 font-semibold text-sm">متبقي: {fmt(inv.remainingAmount)}</p>
                                  ) : (
                                    <p className="text-emerald-500 font-semibold text-sm">✓ مسدد</p>
                                  )}
                                </div>
                                {expandedInvoice === inv._id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                              </div>
                            </div>

                            {/* Invoice Details - Expandable */}
                            {expandedInvoice === inv._id && (
                              <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-4">
                                {/* Items Table */}
                                <div className="mb-4">
                                  <h4 className="text-sm font-bold mb-2 flex items-center gap-2"><Package className="w-4 h-4" />المنتجات:</h4>
                                  <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-800">
                                          <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">المنتج</th>
                                          <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">الكمية</th>
                                          <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">السعر</th>
                                          <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">الإجمالي</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(inv.items || []).map((item, idx) => (
                                          <tr key={idx} className="border-b border-gray-50 dark:border-gray-800">
                                            <td className="px-3 py-2">
                                              <span className="font-semibold">{item.productName || item.product?.name || 'منتج'}</span>
                                              {item.sku && <span className="text-xs text-gray-400 mr-2">({item.sku})</span>}
                                            </td>
                                            <td className="px-3 py-2">{item.quantity}</td>
                                            <td className="px-3 py-2">{fmt(item.unitPrice)} ج.م</td>
                                            <td className="px-3 py-2 font-bold">{fmt(item.totalPrice)} ج.م</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* Payment Info */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                  <div className="p-2 rounded-lg bg-white dark:bg-gray-900">
                                    <p className="text-xs text-gray-400">الإجمالي</p>
                                    <p className="font-bold">{fmt(inv.totalAmount)} ج.م</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-white dark:bg-gray-900">
                                    <p className="text-xs text-gray-400">المدفوع</p>
                                    <p className="font-bold text-emerald-600">{fmt(inv.paidAmount)} ج.م</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-white dark:bg-gray-900">
                                    <p className="text-xs text-gray-400">المتبقي</p>
                                    <p className="font-bold text-red-500">{fmt(inv.remainingAmount)} ج.م</p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-white dark:bg-gray-900">
                                    <p className="text-xs text-gray-400">طريقة الدفع</p>
                                    <p className="font-bold">{inv.paymentMethod === 'cash' ? 'نقد' : inv.paymentMethod === 'installment' ? 'أقساط' : 'آجل'}</p>
                                  </div>
                                </div>

                                {/* Installments if any */}
                                {inv.paymentMethod === 'installment' && inv.installments?.length > 0 && (
                                  <div className="mt-4">
                                    <h4 className="text-sm font-bold mb-2">جدول الأقساط:</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {inv.installments.map((inst, idx) => (
                                        <div key={idx} className={`px-3 py-2 rounded-lg text-xs ${inst.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : inst.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                                          <span className="font-bold">قسط {inst.installmentNumber}</span>
                                          <span className="mx-2">•</span>
                                          <span>{fmt(inst.amount)} ج.م</span>
                                          <span className="mx-2">•</span>
                                          <span>{new Date(inst.dueDate).toLocaleDateString('ar-EG')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>

            {/* Hidden Print Content */}
            <div className="hidden">
              <div ref={printRef}>
                <div className="header">
                  <h1>كشف حساب العميل</h1>
                  <p>PayQusta — نظام إدارة المبيعات والأقساط</p>
                </div>
                <div className="info-grid">
                  <div className="info-box"><label>اسم العميل</label><span>{selectedCustomer.name}</span></div>
                  <div className="info-box"><label>رقم الهاتف</label><span dir="ltr">{selectedCustomer.phone}</span></div>
                  <div className="info-box"><label>الحالة</label><span>{selectedCustomer.tier === 'vip' ? '⭐ VIP' : selectedCustomer.tier === 'premium' ? 'Premium' : 'عادي'}</span></div>
                  <div className="info-box"><label>إجمالي المشتريات</label><span>{fmt(selectedCustomer.financials?.totalPurchases)} ج.م</span></div>
                  <div className="info-box"><label>إجمالي المدفوع</label><span style={{color:'green'}}>{fmt(selectedCustomer.financials?.totalPaid)} ج.م</span></div>
                  <div className="info-box"><label>المتبقي</label><span style={{color:(selectedCustomer.financials?.outstandingBalance||0)>0?'red':'green'}}>{fmt(selectedCustomer.financials?.outstandingBalance)} ج.م</span></div>
                </div>
                <h3 style={{marginTop:'20px',marginBottom:'10px'}}>سجل المعاملات</h3>
                {customerTransactions.map((inv) => (
                  <div key={inv._id} style={{marginBottom:'20px',border:'1px solid #ddd',padding:'10px'}}>
                    <p><strong>فاتورة: {inv.invoiceNumber}</strong> — {new Date(inv.createdAt).toLocaleDateString('ar-EG')}</p>
                    <table className="items-table" style={{marginTop:'10px'}}>
                      <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
                      <tbody>
                        {(inv.items || []).map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.productName || 'منتج'}</td>
                            <td>{item.quantity}</td>
                            <td>{fmt(item.unitPrice)} ج.م</td>
                            <td>{fmt(item.totalPrice)} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p style={{marginTop:'5px'}}>
                      <strong>الإجمالي:</strong> {fmt(inv.totalAmount)} ج.م | 
                      <strong className="paid"> المدفوع:</strong> {fmt(inv.paidAmount)} ج.م | 
                      <strong className={inv.remainingAmount > 0 ? 'overdue' : 'paid'}> المتبقي:</strong> {fmt(inv.remainingAmount)} ج.م
                    </p>
                  </div>
                ))}
                <div className="footer" style={{marginTop:'30px',textAlign:'center',fontSize:'10px',color:'#999'}}>
                  <p>تم إنشاء هذا الكشف بواسطة PayQusta — {new Date().toLocaleString('ar-EG')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
