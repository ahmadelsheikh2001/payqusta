import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, FileText, Send, Calculator, Check, X, CreditCard, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { notify } from '../components/AnimatedNotification';
import { invoicesApi, customersApi, productsApi } from '../store';
import { Button, Input, Select, Modal, Badge, Card, LoadingSpinner, EmptyState, OwnerTableSkeleton } from '../components/UI';
import Pagination from '../components/Pagination';

export default function InvoicesPage() {
  const FILTERS_STORAGE_KEY = 'owner_invoices_filters_v1';
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(customerSearch);
    }, 500);
    return () => clearTimeout(handler);
  }, [customerSearch]);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cart, setCart] = useState([]);
  const [installments, setInstallments] = useState(3);
  const [frequency, setFrequency] = useState('monthly');
  const [downPayment, setDownPayment] = useState('');
  const LIMIT = 10;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setStatusFilter(parsed.statusFilter || '');
        setBranchFilter(parsed.branchFilter || '');
        setCustomerSearch(parsed.customerSearch || '');
      }
    } catch (_) { }

    // Load branches from store
    import('../store').then(({ useAuthStore }) => {
      useAuthStore.getState().getBranches()
        .then((result) => {
          const normalizedBranches = Array.isArray(result)
            ? result
            : Array.isArray(result?.branches)
              ? result.branches
              : Array.isArray(result?.data)
                ? result.data
                : [];
          setBranches(normalizedBranches);
        })
        .catch(() => setBranches([]));
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({
      statusFilter,
      branchFilter,
      customerSearch,
    }));
  }, [statusFilter, branchFilter, customerSearch]);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, sort: '-createdAt' };
      if (statusFilter) params.status = statusFilter;
      if (branchFilter) params.branch = branchFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await invoicesApi.getAll(params);
      const data = res.data.data;
      // Ensure invoices is always an array
      setInvoices(Array.isArray(data) ? data : (data?.invoices || []));
      setPagination({ totalPages: res.data.pagination?.totalPages || 1, totalItems: res.data.pagination?.totalItems || 0 });
    } catch { toast.error('خطأ في تحميل الفواتير'); }
    finally { setLoading(false); }
  }, [page, statusFilter, branchFilter, debouncedSearch]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);
  useEffect(() => { setPage(1); }, [statusFilter, branchFilter, debouncedSearch]);

  const resetFilters = () => {
    setStatusFilter('');
    setBranchFilter('');
    setCustomerSearch('');
    localStorage.removeItem(FILTERS_STORAGE_KEY);
  };

  const openCreate = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        customersApi.getAll({ limit: 100 }),
        productsApi.getAll({ limit: 100 }),
      ]);
      setCustomers(custRes.data.data || []);
      setProducts(prodRes.data.data || []);
      setCart([]); setSelectedCustomer(''); setPaymentMethod('cash'); setDownPayment(''); setProductSearch('');
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
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Customer Search Box */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="بحث باسم العميل أو رقمه..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-sm focus:border-primary-500 transition-all outline-none"
            />
          </div>

          <div className="relative w-full sm:w-48">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-sm focus:border-primary-500 transition-all appearance-none cursor-pointer outline-none font-medium"
            >
              <option value="">كل الفواتير</option>
              <option value="paid">✅ مدفوع بالكامل</option>
              <option value="partially_paid">🟡 مدفوع جزئياً</option>
              <option value="pending">⏳ معلق (غير مدفوع)</option>
              <option value="overdue">🔴 متأخر عن السداد</option>
            </select>
          </div>
        </div>

        {/* Branch Filter */}
        <div className="relative flex-1 sm:w-64">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-sm focus:border-primary-500 transition-all appearance-none cursor-pointer outline-none font-medium"
          >
            <option value="">🏢 كل الفروع</option>
            {(Array.isArray(branches) ? branches : []).map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>

        <button
          type="button"
          onClick={resetFilters}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-sm hover:border-primary-500 transition-all"
        >
          إعادة الفلاتر
        </button>

        <Button
          icon={<Plus className="w-5 h-5" />}
          onClick={openCreate}
          className="w-full sm:w-auto shadow-lg shadow-primary-500/20"
        >
          إنشاء فاتورة جديدة
        </Button>
      </div>

      {loading ? <OwnerTableSkeleton rows={10} columns={8} /> : invoices.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12 text-gray-300" />}
          title="لا توجد فواتير"
          description="لم يتم إنشاء أي فواتير بعد. ابدأ بإنشاء فاتورة جديدة لعرضها هنا."
        />
      ) : (
        <>
          <Card className="overflow-hidden border-0 shadow-lg shadow-gray-100/50 dark:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-gray-400">رقم الفاتورة</th>
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-gray-400">العميل</th>
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-gray-400">التاريخ</th>
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-gray-400">الفرع</th>
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-gray-400">الحالة</th>
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-gray-400">الإجمالي</th>
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-gray-400">المتبقي</th>
                    <th className="px-6 py-4 font-bold text-gray-500 dark:text-gray-400 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-primary-600 dark:text-primary-400">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{inv.customer?.name || '—'}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{inv.customer?.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(inv.createdAt).toLocaleDateString('ar-EG')}
                        <div className="text-[10px] text-gray-400">{new Date(inv.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-500">{inv.branch?.name || '—'}</td>
                      <td className="px-6 py-4">
                        {statusBadge(inv.status)}
                        <div className="text-[10px] text-gray-400 mt-1">{methodLabel(inv.paymentMethod)}</div>
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {fmt(inv.totalAmount)} <span className="text-[10px] font-normal text-gray-400">ج.م</span>
                      </td>
                      <td className="px-6 py-4">
                        {inv.remainingAmount > 0 ? (
                          <span className="font-bold text-red-500">{fmt(inv.remainingAmount)} <span className="text-[10px] font-normal">ج.م</span></span>
                        ) : (
                          <span className="font-bold text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3" /> مسدد</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {inv.remainingAmount > 0 ? (
                            <>
                              <button
                                onClick={() => openPay(inv)}
                                className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 transition-colors"
                                title="تسجيل دفعة"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handlePayAll(inv)}
                                className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 transition-colors"
                                title="سداد كامل"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-emerald-500"><Check className="w-5 h-5" /></span>
                          )}
                          <button
                            onClick={() => handleSendWhatsApp(inv)}
                            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 transition-colors"
                            title="إرسال عبر واتساب"
                          >
                            <Send className="w-4 h-4" />
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

          {/* Product Search */}
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="بحث باسم المنتج أو الباركود..."
              className="w-full pr-10 pl-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm focus:border-primary-500 transition-all outline-none"
              autoFocus
            />
          </div>

          <div className="border-2 border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-gray-50/30 dark:bg-gray-800/20">
            {products
              .filter((p) => {
                const term = productSearch.toLowerCase();
                return (
                  (p.stock?.quantity || 0) > 0 &&
                  (p.name.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term))
                );
              })
              .map((p) => {
                const inCart = cart.find((c) => c.productId === p._id);
                return (
                  <div key={p._id} className="flex items-center justify-between p-2 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-white dark:hover:bg-gray-800 transition-colors">
                    <div>
                      <p className="font-bold text-xs text-gray-800 dark:text-gray-200">{p.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        {p.sku && <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-[10px]">{p.sku}</span>}
                        <span>{fmt(p.price)} ج.م</span>
                        <span className={p.stock?.quantity < 5 ? 'text-red-500' : 'text-emerald-500'}>
                          ({p.stock?.quantity})
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => addToCart(p)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${inCart
                          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                          : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-primary-500 hover:text-primary-500'
                        }`}
                    >
                      {inCart ? `مضاف (${inCart.quantity})` : 'إضافة'}
                    </button>
                  </div>
                );
              })}
            {products.filter(p => (p.stock?.quantity || 0) > 0 && (p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase()))).length === 0 && (
              <div className="p-4 text-center text-gray-400 text-xs">لا توجد منتجات مطابقة للبحث</div>
            )}
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
