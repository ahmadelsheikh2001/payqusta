import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingBag, MapPin, Phone, User, ChevronRight,
    CheckCircle, Package, AlertCircle, Building2, Loader2,
    ArrowLeft, Tag, Trash2
} from 'lucide-react';
import { usePortalStore } from '../store/portalStore';
import { notify } from '../components/AnimatedNotification';

const EGYPT_GOVERNORATES = [
    'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر',
    'البحيرة', 'الفيوم', 'الغربية', 'الإسماعيلية', 'المنوفية',
    'المنيا', 'القليوبية', 'الوادي الجديد', 'السويس', 'أسوان',
    'أسيوط', 'بني سويف', 'بورسعيد', 'دمياط', 'الشرقية',
    'جنوب سيناء', 'كفر الشيخ', 'مطروح', 'الأقصر', 'قنا',
    'شمال سيناء', 'سوهاج',
];

const STEPS = [
    { id: 'shipping', label: 'بيانات التوصيل', icon: MapPin },
    { id: 'review', label: 'مراجعة الطلب', icon: Package },
    { id: 'done', label: 'تأكيد', icon: CheckCircle },
];

export default function PortalCheckout() {
    const navigate = useNavigate();
    const { cart, customer, checkout, clearCart } = usePortalStore();

    const [step, setStep] = useState('shipping');
    const [loading, setLoading] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [orderNumber, setOrderNumber] = useState(null);

    const [form, setForm] = useState({
        fullName: customer?.name || '',
        phone: customer?.phone || '',
        address: customer?.address || '',
        city: '',
        governorate: '',
        notes: '',
    });

    const [errors, setErrors] = useState({});

    const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const creditAvailable = Math.max(0, (customer?.creditLimit || 0) - (customer?.outstandingBalance || 0));

    const validate = () => {
        const e = {};
        if (!form.fullName.trim()) e.fullName = 'الاسم مطلوب';
        if (!form.phone.trim()) e.phone = 'رقم التليفون مطلوب';
        if (!form.address.trim()) e.address = 'العنوان التفصيلي مطلوب';
        if (!form.governorate) e.governorate = 'اختر المحافظة';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => {
        if (!validate()) return;
        setStep('review');
        window.scrollTo(0, 0);
    };

    const handleSubmit = async () => {
        if (cart.length === 0) { notify.error('السلة فارغة'); return; }
        setLoading(true);
        try {
            const items = cart.map(i => ({
                productId: i.product._id,
                quantity: i.quantity,
            }));

            const res = await checkout(items, {
                fullName: form.fullName,
                phone: form.phone,
                address: form.address,
                city: form.city,
                governorate: form.governorate,
                notes: form.notes,
            });

            if (res.success) {
                setOrderId(res.data.orderId);
                setOrderNumber(res.data.invoiceNumber);
                clearCart();
                setStep('done');
                window.scrollTo(0, 0);
            } else {
                notify.error(res.message || 'فشل إنشاء الطلب');
            }
        } catch (err) {
            notify.error('حدث خطأ، حاول مرة أخرى');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (field) =>
        `w-full px-4 py-3 rounded-xl border-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none transition-all ${errors[field]
            ? 'border-red-400 focus:border-red-500'
            : 'border-gray-200 dark:border-gray-700 focus:border-primary-500'}`;

    // ── SUCCESS / DONE ──────────────────────────────────────────
    if (step === 'done') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 pb-24" dir="rtl">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce-once">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">تم استلام طلبك! 🎉</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-1">رقم الطلب</p>
                <p className="text-3xl font-black text-primary-600 mb-6">#{orderNumber}</p>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 w-full max-w-sm text-right mb-6 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">العنوان</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{form.address}، {form.governorate}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">التليفون</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{form.phone}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">الإجمالي</span>
                        <span className="font-black text-primary-600">{total.toLocaleString()} ج.م</span>
                    </div>
                </div>

                <p className="text-sm text-gray-400 mb-8">سيتواصل معك فريقنا قريباً لتأكيد الطلب</p>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                        onClick={() => navigate('/portal/orders')}
                        className="w-full py-3 rounded-2xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 transition"
                    >
                        تتبع طلباتي
                    </button>
                    <button
                        onClick={() => navigate('/portal/products')}
                        className="w-full py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-200 transition"
                    >
                        متابعة التسوق
                    </button>
                </div>
            </div>
        );
    }

    // ── MAIN ────────────────────────────────────────────────────
    return (
        <div className="pb-28" dir="rtl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => step === 'review' ? setStep('shipping') : navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">إتمام الطلب</h2>
                    <p className="text-xs text-gray-400">{cart.length} منتج • {total.toLocaleString()} ج.م</p>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
                {STEPS.map((s, i) => {
                    const active = s.id === step;
                    const done = (step === 'review' && i === 0) || (step === 'done' && i < 2);
                    return (
                        <React.Fragment key={s.id}>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all ${active ? 'bg-primary-500 text-white' : done ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                                <s.icon className="w-3.5 h-3.5" />
                                {s.label}
                            </div>
                            {i < STEPS.length - 1 && <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full" />}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* ─── STEP 1: Shipping ─── */}
            {step === 'shipping' && (
                <div className="space-y-4">
                    {/* Credit Warning */}
                    {total > creditAvailable && (
                        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-red-700 dark:text-red-400 text-sm">رصيد غير كافٍ</p>
                                <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                                    الرصيد المتاح: <b>{creditAvailable.toLocaleString()} ج.م</b> • الطلب: <b>{total.toLocaleString()} ج.م</b>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Personal Info */}
                    <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4 text-sm">
                            <User className="w-4 h-4 text-primary-500" /> بيانات المستلم
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">الاسم الكامل *</label>
                                <input className={inputClass('fullName')} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="اسم المستلم" />
                                {errors.fullName && <p className="text-red-500 text-[11px] mt-1">{errors.fullName}</p>}
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">رقم التليفون *</label>
                                <input className={inputClass('phone')} type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" dir="ltr" />
                                {errors.phone && <p className="text-red-500 text-[11px] mt-1">{errors.phone}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4 text-sm">
                            <MapPin className="w-4 h-4 text-primary-500" /> عنوان التوصيل
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">المحافظة *</label>
                                <select
                                    className={inputClass('governorate')}
                                    value={form.governorate}
                                    onChange={e => setForm({ ...form, governorate: e.target.value })}
                                >
                                    <option value="">اختر المحافظة</option>
                                    {EGYPT_GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                                {errors.governorate && <p className="text-red-500 text-[11px] mt-1">{errors.governorate}</p>}
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">المدينة / المنطقة</label>
                                <input className={inputClass('city')} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="المدينة أو الحي" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">العنوان التفصيلي *</label>
                                <textarea
                                    className={`${inputClass('address')} min-h-[80px] resize-none`}
                                    value={form.address}
                                    onChange={e => setForm({ ...form, address: e.target.value })}
                                    placeholder="الشارع، رقم العمارة، الدور، الشقة..."
                                />
                                {errors.address && <p className="text-red-500 text-[11px] mt-1">{errors.address}</p>}
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">ملاحظات للتوصيل</label>
                                <input className={inputClass('notes')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="أي تعليمات خاصة للمندوب..." />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={total > creditAvailable}
                        className="w-full py-4 rounded-2xl bg-primary-500 text-white font-black text-base hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                    >
                        مراجعة الطلب
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* ─── STEP 2: Review ─── */}
            {step === 'review' && (
                <div className="space-y-4">
                    {/* Items */}
                    <div className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-primary-500" /> المنتجات ({cart.length})
                            </h3>
                        </div>
                        {cart.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                                    {item.product?.images?.[0] ? (
                                        <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.product?.name}</p>
                                    <p className="text-xs text-gray-400">الكمية: {item.quantity}</p>
                                </div>
                                <p className="font-black text-sm text-primary-600">{(item.price * item.quantity).toLocaleString()} ج.م</p>
                            </div>
                        ))}
                        <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900/30 flex justify-between items-center">
                            <span className="font-bold text-gray-700 dark:text-gray-300">الإجمالي</span>
                            <span className="font-black text-xl text-primary-600">{total.toLocaleString()} ج.م</span>
                        </div>
                    </div>

                    {/* Delivery Details */}
                    <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2 mb-3">
                            <MapPin className="w-4 h-4 text-primary-500" /> بيانات التوصيل
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">المستلم</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{form.fullName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">التليفون</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200" dir="ltr">{form.phone}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">المحافظة</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{form.governorate} {form.city && `/ ${form.city}`}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400 flex-shrink-0">العنوان</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200 text-left max-w-[60%]">{form.address}</span>
                            </div>
                            {form.notes && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">ملاحظات</span>
                                    <span className="font-medium text-gray-600 dark:text-gray-400 text-left max-w-[60%]">{form.notes}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Notice */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 text-sm text-blue-700 dark:text-blue-400 flex items-start gap-3">
                        <Building2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold mb-1">الدفع الآجل</p>
                            <p className="text-xs text-blue-600 dark:text-blue-500">سيتم إضافة {total.toLocaleString()} ج.م للحساب المؤجل وفق خطة التقسيط المتفق عليها</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-4 rounded-2xl bg-green-500 text-white font-black text-base hover:bg-green-600 transition flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-[.98]"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <><CheckCircle className="w-5 h-5" /> تأكيد الطلب</>
                        )}
                    </button>
                    <button onClick={() => setStep('shipping')} className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">تعديل بيانات التوصيل</button>
                </div>
            )}
        </div>
    );
}
