import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, Minus, ShoppingCart, Zap, CreditCard, Calendar, Clock, Check, Trash2, Scan } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi, customersApi, invoicesApi } from '../store';
import { Button, Badge, LoadingSpinner } from '../components/UI';
import BarcodeScanner, { useBarcodeScanner } from '../components/BarcodeScanner';

export default function QuickSalePage() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [custSearch, setCustSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustPicker, setShowCustPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [installments, setInstallments] = useState(3);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    Promise.all([
      productsApi.getAll({ limit: 200 }),
      customersApi.getAll({ limit: 200 }),
    ]).then(([pRes, cRes]) => {
      setProducts(pRes.data.data || []);
      setCustomers(cRes.data.data || []);
    }).catch(() => toast.error('خطأ في التحميل'))
    .finally(() => setLoading(false));
  }, []);

  // Auto-focus search
  useEffect(() => { searchRef.current?.focus(); }, []);

  // Keyboard shortcut: F2 = focus search, F5 = complete sale
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F5') { e.preventDefault(); handleComplete(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart, selectedCustomer]);

  const addToCart = (product) => {
    if ((product.stock?.quantity || 0) <= 0) return toast.error('المنتج نفذ من المخزون');
    const exists = cart.find((c) => c.productId === product._id);
    if (exists) {
      if (exists.quantity >= (product.stock?.quantity || 0)) return toast.error('الكمية غير متوفرة');
      setCart(cart.map((c) => c.productId === product._id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { productId: product._id, name: product.name, price: product.price, cost: product.cost || 0, quantity: 1, maxQty: product.stock?.quantity || 999 }]);
    }
    setSearch('');
    searchRef.current?.focus();
  };

  // Handle barcode scan
  const handleBarcodeScan = async (barcode) => {
    try {
      const res = await productsApi.getByBarcode(barcode);
      const product = res.data.data;
      addToCart(product);
      toast.success(`تم إضافة ${product.name} للسلة 📦`);
      setShowScanner(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'المنتج غير موجود');
    }
  };

  // USB Barcode Scanner Hook (works globally)
  useBarcodeScanner((barcode) => {
    if (!showScanner) handleBarcodeScan(barcode);
  }, !showScanner); // Enable when scanner modal is closed

  const updateQty = (id, qty) => { if (qty <= 0) removeFromCart(id); else setCart(cart.map((c) => c.productId === id ? { ...c, quantity: Math.min(qty, c.maxQty) } : c)); };
  const removeFromCart = (id) => setCart(cart.filter((c) => c.productId !== id));

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalProfit = cart.reduce((s, i) => s + (i.price - i.cost) * i.quantity, 0);

  const filteredProducts = search.length > 0 ? products.filter((p) =>
    p.name.includes(search) || (p.sku || '').toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search)
  ).slice(0, 8) : [];

  const filteredCustomers = custSearch.length > 0 ? customers.filter((c) =>
    c.name.includes(custSearch) || c.phone.includes(custSearch)
  ).slice(0, 5) : customers.slice(0, 5);

  const handleComplete = async () => {
    if (!selectedCustomer) return toast.error('اختر العميل أولاً');
    if (selectedCustomer.salesBlocked) return toast.error(`⛔ البيع ممنوع لهذا العميل: ${selectedCustomer.salesBlockedReason || 'تم منع البيع'}`);
    if (cart.length === 0) return toast.error('السلة فارغة');
    setCreating(true);
    try {
      await invoicesApi.create({
        customerId: selectedCustomer._id,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        paymentMethod,
        numberOfInstallments: paymentMethod === 'installment' ? installments : undefined,
        sendWhatsApp: false,
      });
      toast.success('تم البيع بنجاح! 🎉', { icon: '⚡' });
      setCart([]); setSelectedCustomer(null); setPaymentMethod('cash');
      searchRef.current?.focus();
      // Refresh products stock
      productsApi.getAll({ limit: 200 }).then((r) => setProducts(r.data.data || []));
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ في إنشاء الفاتورة'); }
    finally { setCreating(false); }
  };

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');
  const catIcon = (n) => n?.includes('آيفون') || n?.includes('سامسونج') ? '📱' : n?.includes('ماك') ? '💻' : n?.includes('آيباد') ? '📟' : n?.includes('شاشة') ? '🖥️' : '📦';

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-120px)] animate-fade-in">
      {/* RIGHT: Product Search + Cart */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold">بيع سريع</h2>
            <p className="text-xs text-gray-400">F2: بحث · F5: إتمام البيع</p>
          </div>
        </div>

        {/* Product Search */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الكود أو الباركود..."
              className="w-full pr-12 pl-4 py-3.5 rounded-2xl border-2 border-primary-200 dark:border-primary-500/30 bg-white dark:bg-gray-900 text-base font-medium focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all shadow-sm" autoFocus />
          </div>
          <button onClick={() => setShowScanner(true)}
            className="px-4 py-3.5 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl transition-all flex items-center gap-2 font-bold">
            <Scan className="w-5 h-5" /> مسح
          </button>
        </div>
        <div className="relative">
          {/* Autocomplete Dropdown */}
          {filteredProducts.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-100 dark:border-gray-800 shadow-2xl z-50 overflow-hidden">
              {filteredProducts.map((p) => (
                <button key={p._id} onClick={() => addToCart(p)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-xl">{catIcon(p.name)}</span>
                  <div className="flex-1 text-right">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.sku || '—'} · المخزون: {p.stock?.quantity || 0}</p>
                  </div>
                  <span className="text-sm font-extrabold text-primary-500">{fmt(p.price)} ج.م</span>
                  {(p.stock?.quantity || 0) <= 0 && <Badge variant="danger">نفذ</Badge>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 dark:text-gray-700">
              <ShoppingCart className="w-16 h-16 mb-3" />
              <p className="text-sm font-medium">السلة فارغة — ابدأ بالبحث عن منتج</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={item.productId} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 shadow-sm animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
                <span className="text-lg">{catIcon(item.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{fmt(item.price)} × {item.quantity} = <span className="font-bold text-primary-500">{fmt(item.price * item.quantity)} ج.م</span></p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors text-gray-500 hover:text-red-500"><Minus className="w-3.5 h-3.5" /></button>
                  <span className="w-8 text-center text-sm font-extrabold">{item.quantity}</span>
                  <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-primary-100 dark:hover:bg-primary-500/10 transition-colors text-gray-500 hover:text-primary-500"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={() => removeFromCart(item.productId)} className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))
          )}
        </div>

        {/* Quick Product Buttons (top 8) */}
        {search.length === 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {products.filter((p) => (p.stock?.quantity || 0) > 0).slice(0, 8).map((p) => (
              <button key={p._id} onClick={() => addToCart(p)}
                className="px-3 py-2 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all">
                {catIcon(p.name)} {p.name.substring(0, 15)} — <span className="text-primary-500">{fmt(p.price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* LEFT: Checkout Panel */}
      <div className="w-full lg:w-80 flex-shrink-0 flex flex-col bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-100 dark:border-gray-800 shadow-lg overflow-hidden">
        {/* Customer Picker */}
        <div className="p-4 border-b-2 border-gray-100 dark:border-gray-800">
          <label className="text-xs font-bold text-gray-400 mb-2 block">العميل</label>
          {selectedCustomer ? (
            <div className={`flex items-center gap-3 p-3 rounded-xl border-2 ${selectedCustomer.salesBlocked ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' : 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm ${selectedCustomer.salesBlocked ? 'bg-red-500' : 'bg-primary-500'}`}>{selectedCustomer.salesBlocked ? '⛔' : selectedCustomer.name?.charAt(0)}</div>
              <div className="flex-1">
                <p className="font-bold text-sm flex items-center gap-2">
                  {selectedCustomer.name}
                  {selectedCustomer.salesBlocked && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">ممنوع البيع</span>}
                </p>
                <p className="text-[10px] text-gray-400" dir="ltr">{selectedCustomer.phone}</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="relative">
              <input value={custSearch} onChange={(e) => { setCustSearch(e.target.value); setShowCustPicker(true); }} onFocus={() => setShowCustPicker(true)} placeholder="بحث بالاسم أو الهاتف..."
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
              {showCustPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-100 dark:border-gray-800 shadow-xl z-50 max-h-48 overflow-y-auto">
                  {filteredCustomers.map((c) => (
                    <button key={c._id} onClick={() => { setSelectedCustomer(c); setShowCustPicker(false); setCustSearch(''); }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-primary-50 dark:hover:bg-primary-500/10 text-right border-b border-gray-50 dark:border-gray-800 last:border-0 ${c.salesBlocked ? 'bg-red-50/50 dark:bg-red-500/5' : ''}`}>
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${c.salesBlocked ? 'bg-red-100 dark:bg-red-500/20 text-red-600' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        {c.salesBlocked ? '⛔' : c.name?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold flex items-center gap-1">
                          {c.name}
                          {c.salesBlocked && <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-600">ممنوع</span>}
                        </p>
                        <p className="text-[10px] text-gray-400">{c.phone}</p>
                      </div>
                      {c.tier === 'vip' && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">VIP</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div className="p-4 border-b-2 border-gray-100 dark:border-gray-800">
          <label className="text-xs font-bold text-gray-400 mb-2 block">طريقة الدفع</label>
          <div className="grid grid-cols-3 gap-2">
            {[{ v: 'cash', l: '💵 نقد', i: CreditCard }, { v: 'installment', l: '📅 أقساط', i: Calendar }, { v: 'deferred', l: '⏳ آجل', i: Clock }].map((m) => (
              <button key={m.v} onClick={() => setPaymentMethod(m.v)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${paymentMethod === m.v
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100'}`}>
                {m.l}
              </button>
            ))}
          </div>
          {paymentMethod === 'installment' && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-gray-400">عدد الأقساط:</span>
              <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800">
                {[2, 3, 4, 6, 9, 12].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-xs font-bold text-primary-500">{fmt(Math.ceil(total / installments))} ج.م/قسط</span>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="flex-1 p-4 flex flex-col justify-end">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm"><span className="text-gray-400">العناصر</span><span className="font-bold">{cart.reduce((s, c) => s + c.quantity, 0)} قطعة</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">الربح المتوقع</span><span className="font-bold text-emerald-500">+{fmt(totalProfit)} ج.م</span></div>
            <div className="h-px bg-gray-100 dark:bg-gray-800" />
            <div className="flex justify-between items-end">
              <span className="text-sm text-gray-400">الإجمالي</span>
              <span className="text-3xl font-black text-primary-500">{fmt(total)}<span className="text-base mr-1">ج.م</span></span>
            </div>
          </div>

          {/* Complete Sale Button */}
          <button onClick={handleComplete} disabled={creating || cart.length === 0 || !selectedCustomer}
            className={`w-full py-4 rounded-2xl text-lg font-extrabold transition-all flex items-center justify-center gap-2 ${
              creating || cart.length === 0 || !selectedCustomer
                ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/40 hover:-translate-y-0.5 active:translate-y-0'
            }`}>
            {creating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Zap className="w-5 h-5" /> إتمام البيع (F5)</>
            )}
          </button>

          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="w-full mt-2 py-2 text-xs text-red-400 hover:text-red-500 font-semibold">
              مسح السلة
            </button>
          )}
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
