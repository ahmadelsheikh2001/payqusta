import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, FileText, Send, Calculator, Check, X, CreditCard, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { notify } from '../components/AnimatedNotification';
import { invoicesApi, customersApi, productsApi } from '../store';
import { Button, Input, Select, Modal, Badge, Card, LoadingSpinner, EmptyState } from '../components/UI';
import Pagination from '../components/Pagination';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [creating, setCreating] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cart, setCart] = useState([]);
  const [installments, setInstallments] = useState(3);
  const [frequency, setFrequency] = useState('monthly');
  const [downPayment, setDownPayment] = useState('');
  const LIMIT = 15;

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, sort: '-createdAt' };
      if (statusFilter) params.status = statusFilter;
      const res = await invoicesApi.getAll(params);
      setInvoices(res.data.data || []);
      setPagination({ totalPages: res.data.pagination?.totalPages || 1, totalItems: res.data.pagination?.totalItems || 0 });
    } catch { toast.error('خطأ في تحميل الفواتير'); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const openCreate = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        customersApi.getAll({ limit: 100 }),
        productsApi.getAll({ limit: 100 }),
      ]);
      setCustomers(custRes.data.data || []);
      setProducts(prodRes.data.data || []);
      setCart([]); setSelectedCustomer(''); setPaymentMethod('cash'); setDownPayment('');
      setShowCreate(true);
    } catch { toast.error('خطأ في تحميل البيانات'); }
  };

  const addToCart = (product) => {
    const exists = cart.find((c) => c.productId === product._id);
    if (exists) setCart(cart.map((c) => c.productId === product._id ? { ...c, quantity: c.quantity + 1 } : c));
    else setCart([...cart, { productId: product._id, name: product.name, price: product.price, quantity: 1 }]);
  };
  const removeFromCart = (id) => setCart(cart.filter((c) => c.productId !== id));
  const updateQty = (id, qty) => setCart(cart.map((c) => c.productId === id ? { ...c, quantity: Math.max(1, qty) } : c));

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const remaining = cartTotal - (Number(downPayment) || 0);
  const monthlyAmount = installments > 0 ? Math.ceil(remaining / installments) : 0;

  const handleCreate = async () => {
    if (!selectedCustomer) return toast.error('اختر العميل');
    if (cart.length === 0) return toast.error('أضف منتجات للفاتورة');
    setCreating(true);
    try {
      await invoicesApi.create({
        customerId: selectedCustomer,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        paymentMethod,
        numberOfInstallments: paymentMethod === 'installment' ? installments : undefined,
        frequency: paymentMethod === 'installment' ? frequency : undefined,
        downPayment: paymentMethod === 'installment' ? Number(downPayment) || 0 : undefined,
        sendWhatsApp: false, // Don't block on WhatsApp
      });
      toast.success('تم إنشاء الفاتورة بنجاح 🎉');
      setShowCreate(false);
      loadInvoices();
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ في إنشاء الفاتورة'); }
    finally { setCreating(false); }
  };

  const openPay = (inv) => { setPayInvoice(inv); setPayAmount(''); setShowPayModal(true); };

  const handlePay = async () => {
    if (!payAmount || Number(payAmount) <= 0) return toast.error('أدخل مبلغ صحيح');
    try {
      await invoicesApi.pay(payInvoice._id, { amount: Number(payAmount) });
      toast.success('تم تسجيل الدفعة ✅');
      setShowPayModal(false); loadInvoices();
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
  };

  const handlePayAll = async (inv) => {
    const amount = (inv.remainingAmount || 0).toLocaleString('ar-EG');

    notify.custom({
      type: 'warning',
      title: 'تأكيد السداد الكامل',
      message: `هل تريد تأكيد سداد ${amount} ج.م كاملة؟`,
      duration: 10000, // 10 ثواني
      action: {
        label: 'تأكيد السداد',
        onClick: async () => {
          try {
            await invoicesApi.payAll(inv._id);
            notify.success('تم سداد كامل المبلغ بنجاح! ✅', 'تم السداد');
            loadInvoices();
          } catch (err) {
            notify.error(err.response?.data?.message || 'فشل السداد', 'خطأ');
          }
        },
      },
    });
  };

  const handleSendWhatsApp = async (inv) => {
    const tid = toast.loading('جاري الإرسال...');
    try {
      const res = await invoicesApi.sendWhatsApp(inv._id);
      if (res.data.data?.whatsappStatus === 'failed' || res.data.data?.whatsappStatus === 'error') {
        toast.error(res.data.message, { id: tid });
      } else {
        toast.success('تم الإرسال ✅', { id: tid });
      }
    } catch { toast.error('فشل الإرسال', { id: tid }); }
  };

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');
  const statusBadge = (s) => ({
    paid: <Badge variant="success">مدفوع</Badge>,
    partially_paid: <Badge variant="warning">جزئي</Badge>,
    pending: <Badge variant="gray">معلق</Badge>,
    overdue: <Badge variant="danger">متأخر</Badge>,
  }[s] || <Badge variant="gray">—</Badge>);

  const methodLabel = (m) => ({ cash: '💵 نقد', installment: '📅 أقساط', deferred: '⏳ آجل' }[m] || m);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm cursor-pointer">
          <option value="">كل الفواتير</option>
          <option value="paid">✅ مدفوع</option>
          <option value="partially_paid">🟡 جزئي</option>
          <option value="pending">⏳ معلق</option>
          <option value="overdue">🔴 متأخر</option>
        </select>
        <div className="flex-1" />
        <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>إنشاء فاتورة</Button>
      </div>

      {loading ? <LoadingSpinner /> : invoices.length === 0 ? (
        <EmptyState icon={<FileText className="w-8 h-8" />} title="لا توجد فواتير" description="ابدأ بإنشاء أول فاتورة" />
      ) : (
        <>
          <div className="space-y-3">
            {invoices.map((inv) => (
              <Card key={inv._id} className="p-4 animate-fade-in">
                <div className="flex flex-wrap items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    inv.status === 'paid' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500'
                      : inv.status === 'overdue' ? 'bg-red-50 dark:bg-red-500/10 text-red-500'
                      : 'bg-amber-50 dark:bg-amber-500/10 text-amber-500'
                  }`}><FileText className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-[130px]">
                    <p className="font-bold text-sm">{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-400">{inv.customer?.name || '—'} — {methodLabel(inv.paymentMethod)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400">الإجمالي</p>
                    <p className="font-extrabold">{fmt(inv.totalAmount)} ج.م</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400">المتبقي</p>
                    <p className={`font-extrabold ${inv.remainingAmount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {inv.remainingAmount > 0 ? `${fmt(inv.remainingAmount)} ج.م` : '✓ مسدد'}
                    </p>
                  </div>
                  {statusBadge(inv.status)}
                  <div className="flex gap-1.5">
                    {inv.remainingAmount > 0 && (
                      <>
                        <Button size="sm" variant="ghost" icon={<CreditCard className="w-3.5 h-3.5" />} onClick={() => openPay(inv)}>دفع</Button>
                        <Button size="sm" variant="success" onClick={() => handlePayAll(inv)}>سداد كامل</Button>
                      </>
                    )}
                    <Button size="sm" variant="whatsapp" icon={<Send className="w-3.5 h-3.5" />} onClick={() => handleSendWhatsApp(inv)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Pagination currentPage={page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} onPageChange={setPage} />
        </>
      )}

      {/* Create Invoice Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="إنشاء فاتورة جديدة" size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Select label="العميل *" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}
            options={[{ value: '', label: 'اختر العميل...' }, ...customers.map((c) => ({ value: c._id, label: `${c.name} — ${c.phone}` }))]} />
          <Select label="طريقة الدفع" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
            options={[{ value: 'cash', label: '💵 نقد كامل' }, { value: 'installment', label: '📅 أقساط' }, { value: 'deferred', label: '⏳ آجل' }]} />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">إضافة منتجات</label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {products.filter((p) => (p.stock?.quantity || 0) > 0).map((p) => (
              <button key={p._id} onClick={() => addToCart(p)}
                className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                  cart.find((c) => c.productId === p._id) ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-600' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                }`}>{p.name} — <span className="text-primary-500">{fmt(p.price)}</span></button>
            ))}
          </div>
        </div>

        {cart.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-4">
            <p className="text-xs font-bold text-gray-400 mb-3">سلة الفاتورة</p>
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-sm font-medium">{item.name}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 text-sm font-bold flex items-center justify-center">−</button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 text-sm font-bold flex items-center justify-center">+</button>
                  </div>
                  <span className="text-sm font-bold w-24 text-left">{fmt(item.price * item.quantity)} ج.م</span>
                  <button onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            <div className="flex justify-between mt-3 pt-3 border-t-2 border-gray-200 dark:border-gray-600">
              <span className="font-extrabold">الإجمالي</span>
              <span className="text-xl font-extrabold text-primary-500">{fmt(cartTotal)} ج.م</span>
            </div>
          </div>
        )}

        {paymentMethod === 'installment' && cartTotal > 0 && (
          <div className="bg-primary-50 dark:bg-primary-500/10 rounded-xl p-4 mb-4 border border-primary-200 dark:border-primary-500/20">
            <div className="flex items-center gap-2 mb-3"><Calculator className="w-5 h-5 text-primary-500" /><span className="font-bold text-primary-600 dark:text-primary-400">حاسبة الأقساط</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <Input label="المقدم (ج.م)" type="number" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} placeholder="0" />
              <Select label="عدد الأقساط" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}
                options={[3, 4, 6, 9, 12, 18, 24].map((n) => ({ value: n, label: `${n} قسط` }))} />
              <Select label="التكرار" value={frequency} onChange={(e) => setFrequency(e.target.value)}
                options={[{ value: 'weekly', label: 'أسبوعي' }, { value: 'biweekly', label: 'كل 15 يوم' }, { value: 'monthly', label: 'شهري' }, { value: 'bimonthly', label: 'كل شهرين' }]} />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white dark:bg-gray-900 rounded-xl p-3"><p className="text-[10px] text-gray-400">المقدم</p><p className="text-lg font-extrabold text-emerald-500">{fmt(Number(downPayment) || 0)}</p></div>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-3"><p className="text-[10px] text-gray-400">المتبقي</p><p className="text-lg font-extrabold text-amber-500">{fmt(remaining)}</p></div>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-3"><p className="text-[10px] text-gray-400">القسط</p><p className="text-lg font-extrabold text-primary-500">{fmt(monthlyAmount)}</p></div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">✨ بدون أي ضريبة أو رسوم إضافية</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowCreate(false)}>إلغاء</Button>
          <Button icon={<Check className="w-4 h-4" />} onClick={handleCreate} loading={creating}>إنشاء الفاتورة</Button>
        </div>
      </Modal>

      {/* Pay Modal */}
      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="تسجيل دفعة" size="sm">
        {payInvoice && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-400">المتبقي</p>
              <p className="text-2xl font-extrabold text-red-500">{fmt(payInvoice.remainingAmount)} ج.م</p>
            </div>
            <Input label="مبلغ الدفع" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="أدخل المبلغ" />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowPayModal(false)}>إلغاء</Button>
              <Button icon={<Check className="w-4 h-4" />} onClick={handlePay}>تأكيد الدفع</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
