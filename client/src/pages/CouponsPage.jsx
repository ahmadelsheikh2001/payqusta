import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, Copy, CheckCircle, Clock, XCircle, RefreshCw, Percent, DollarSign } from 'lucide-react';
import { couponsApi } from '../store';
import { useThemeStore } from '../store';
import { Card, Button, Badge, LoadingSpinner } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

const typeLabels = { percentage: 'نسبة مئوية', fixed: 'مبلغ ثابت' };
const typeIcons = { percentage: Percent, fixed: DollarSign };

function CouponForm({ coupon, onSave, onCancel }) {
  const { dark } = useThemeStore();
  const [form, setForm] = useState(coupon || {
    code: '',
    description: '',
    type: 'percentage',
    value: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    usageLimit: '',
    usagePerCustomer: '1',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.code || !form.value || !form.type) {
      notify.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        code: form.code,
        description: form.description,
        type: form.type,
        value: parseFloat(form.value),
        minOrderAmount: parseFloat(form.minOrderAmount) || 0,
        maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : null,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        usagePerCustomer: parseInt(form.usagePerCustomer) || 1,
        startDate: form.startDate || undefined,
        endDate: form.endDate || null,
        isActive: form.isActive,
      };

      if (coupon?._id) {
        await couponsApi.update(coupon._id, payload);
        notify.success('تم تحديث الكوبون');
      } else {
        await couponsApi.create(payload);
        notify.success('تم إنشاء الكوبون بنجاح');
      }
      onSave();
    } catch (err) {
      notify.error(err.response?.data?.message || 'فشل حفظ الكوبون');
    }
    setLoading(false);
  };

  const inputClass = `w-full px-3 py-2.5 rounded-xl border text-sm ${
    dark
      ? 'bg-gray-800 border-gray-700 text-white focus:border-primary-500'
      : 'bg-white border-gray-200 text-gray-900 focus:border-primary-500'
  } focus:outline-none transition`;

  const labelClass = 'block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>كود الخصم *</label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="مثال: SUMMER20"
            disabled={!!coupon?._id}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>نوع الخصم *</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className={inputClass}
          >
            <option value="percentage">نسبة مئوية (%)</option>
            <option value="fixed">مبلغ ثابت (ج.م)</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>قيمة الخصم *</label>
          <input
            type="number"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            placeholder={form.type === 'percentage' ? '20' : '50'}
            min="0"
            max={form.type === 'percentage' ? '100' : undefined}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>حد أدنى للطلب</label>
          <input
            type="number"
            value={form.minOrderAmount}
            onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
            placeholder="0"
            min="0"
            className={inputClass}
          />
        </div>
        {form.type === 'percentage' && (
          <div>
            <label className={labelClass}>أقصى خصم (ج.م)</label>
            <input
              type="number"
              value={form.maxDiscountAmount}
              onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
              placeholder="بدون حد"
              min="0"
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label className={labelClass}>عدد مرات الاستخدام الكلي</label>
          <input
            type="number"
            value={form.usageLimit}
            onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
            placeholder="غير محدود"
            min="1"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>مرات الاستخدام للعميل</label>
          <input
            type="number"
            value={form.usagePerCustomer}
            onChange={(e) => setForm({ ...form, usagePerCustomer: e.target.value })}
            min="1"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>تاريخ البداية</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>تاريخ الانتهاء</label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>وصف (اختياري)</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="وصف مختصر للكوبون..."
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="w-4 h-4 rounded"
        />
        <label htmlFor="isActive" className="text-sm font-bold text-gray-700 dark:text-gray-300">
          الكوبون نشط
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={handleSubmit} loading={loading} className="flex-1">
          {coupon?._id ? 'تحديث الكوبون' : 'إنشاء الكوبون'}
        </Button>
        <Button variant="outline" onClick={onCancel} className="px-6">إلغاء</Button>
      </div>
    </div>
  );
}

export default function CouponsPage() {
  const { dark } = useThemeStore();
  const [coupons, setCoupons] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCoupon, setEditCoupon] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [couponsRes, statsRes] = await Promise.all([
        couponsApi.getAll(),
        couponsApi.getStats(),
      ]);
      setCoupons(couponsRes.data.data.coupons || []);
      setStats(statsRes.data.data);
    } catch {
      notify.error('فشل تحميل الكوبونات');
    }
    setLoading(false);
  };

  const handleDelete = (id, code) => {
    notify.custom({
      title: 'حذف الكوبون',
      message: `هل أنت متأكد من حذف كوبون "${code}"؟`,
      type: 'warning',
      actions: [
        {
          label: 'حذف',
          onClick: async () => {
            try {
              await couponsApi.delete(id);
              notify.success('تم حذف الكوبون');
              loadData();
            } catch {
              notify.error('فشل الحذف');
            }
          },
          style: 'danger',
        },
        { label: 'إلغاء', onClick: () => {}, style: 'secondary' },
      ],
    });
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    notify.success(`تم نسخ الكود: ${code}`);
  };

  const isExpired = (coupon) => coupon.endDate && new Date(coupon.endDate) < new Date();
  const isActive = (coupon) => coupon.isActive && !isExpired(coupon);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary-500" />
            كوبونات الخصم
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">إدارة أكواد الخصم والعروض الترويجية</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} icon={<RefreshCw className="w-4 h-4" />} variant="outline">تحديث</Button>
          <Button onClick={() => { setEditCoupon(null); setShowForm(true); }} icon={<Plus className="w-4 h-4" />}>
            كوبون جديد
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-3xl font-black text-primary-500">{stats.total || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">إجمالي الكوبونات</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-black text-green-500">{stats.active || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">نشطة</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-black text-blue-500">{stats.totalUsages || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">مرات الاستخدام</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-black text-amber-500">{stats.totalSavings?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">إجمالي التوفير (ج.م)</p>
          </Card>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="p-5">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary-500" />
            {editCoupon ? 'تعديل الكوبون' : 'إنشاء كوبون جديد'}
          </h3>
          <CouponForm
            coupon={editCoupon}
            onSave={() => { setShowForm(false); setEditCoupon(null); loadData(); }}
            onCancel={() => { setShowForm(false); setEditCoupon(null); }}
          />
        </Card>
      )}

      {/* Coupons List */}
      {loading ? (
        <div className="py-10 flex justify-center"><LoadingSpinner /></div>
      ) : coupons.length === 0 ? (
        <Card className="p-10 text-center">
          <Tag className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">لا توجد كوبونات بعد</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">أنشئ أول كوبون خصم لعملائك</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coupons.map((coupon) => {
            const TypeIcon = typeIcons[coupon.type] || Tag;
            const active = isActive(coupon);
            const expired = isExpired(coupon);

            return (
              <Card key={coupon._id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      active ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                             : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                    }`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-black text-lg text-gray-900 dark:text-white tracking-wider">{coupon.code}</p>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="p-1 text-gray-400 hover:text-primary-500 transition"
                          title="نسخ الكود"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{coupon.description || typeLabels[coupon.type]}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    active
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : expired
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                  }`}>
                    {active ? <><CheckCircle className="w-3 h-3" /> نشط</> : expired ? <><XCircle className="w-3 h-3" /> منتهي</> : <><XCircle className="w-3 h-3" /> معطل</>}
                  </span>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 mb-3">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">الخصم</p>
                      <p className="font-black text-primary-600 dark:text-primary-400">
                        {coupon.type === 'percentage' ? `${coupon.value}%` : `${coupon.value} ج.م`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">الاستخدام</p>
                      <p className="font-bold text-sm text-gray-700 dark:text-gray-300">
                        {coupon.usageCount} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : '/ ∞'}
                      </p>
                    </div>
                    {coupon.minOrderAmount > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">الحد الأدنى</p>
                        <p className="font-bold text-sm text-gray-700 dark:text-gray-300">{coupon.minOrderAmount} ج.م</p>
                      </div>
                    )}
                    {coupon.endDate && (
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">ينتهي</p>
                        <p className="font-bold text-sm text-gray-700 dark:text-gray-300">
                          {new Date(coupon.endDate).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditCoupon(coupon); setShowForm(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-200 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> تعديل
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await couponsApi.update(coupon._id, { isActive: !coupon.isActive });
                        notify.success(coupon.isActive ? 'تم تعطيل الكوبون' : 'تم تفعيل الكوبون');
                        loadData();
                      } catch { notify.error('فشل التحديث'); }
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      coupon.isActive
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200'
                    }`}
                  >
                    {coupon.isActive ? <><XCircle className="w-3.5 h-3.5" /> تعطيل</> : <><CheckCircle className="w-3.5 h-3.5" /> تفعيل</>}
                  </button>
                  <button
                    onClick={() => handleDelete(coupon._id, coupon.code)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-200 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> حذف
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
