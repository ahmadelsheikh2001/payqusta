import React, { useState, useEffect, useRef } from 'react';
import {
  Sun, Moon, MessageCircle, Save, Store, User, Lock, Palette,
  TestTube, CheckCircle, AlertTriangle, ExternalLink, FileText,
  Info, ChevronRight, Building2, CreditCard, Shield,
  Settings2, Tag, Eye, EyeOff, Camera, Loader2, Trash2, Edit3,
  Clock, Calendar, Mail, Phone,
} from 'lucide-react';
import { useThemeStore, useAuthStore, api } from '../store';
import { Card, Button, Input, Badge } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

// Settings tabs configuration
const TABS = [
  { id: 'store', label: 'المتجر', icon: Store, color: 'primary' },
  { id: 'profile', label: 'حسابي', icon: User, color: 'emerald' },
  { id: 'whatsapp', label: 'واتساب', icon: MessageCircle, color: 'green' },
  { id: 'categories', label: 'التصنيفات', icon: Tag, color: 'purple' },
  { id: 'installments', label: 'الأقساط', icon: CreditCard, color: 'blue' },
  { id: 'appearance', label: 'المظهر', icon: Palette, color: 'pink' },
];

// WhatsApp Message Templates needed
const REQUIRED_TEMPLATES = [
  { name: 'customer_statement', nameAr: 'كشف حساب العميل', description: 'إرسال كشف حساب للعملاء' },
  { name: 'payment_reminder', nameAr: 'تذكير بالقسط', description: 'تذكير بموعد القسط المستحق' },
  { name: 'invoice_notification', nameAr: 'إشعار فاتورة', description: 'إشعار بإنشاء فاتورة جديدة' },
];

export default function SettingsPage() {
  const { dark, toggleTheme } = useThemeStore();
  const { tenant, user, getMe } = useAuthStore();
  const [activeTab, setActiveTab] = useState('store');
  const fileInputRef = useRef(null);

  // Form States
  const [storeForm, setStoreForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [whatsappForm, setWhatsappForm] = useState({ phoneNumber: '', accessToken: '', phoneNumberId: '', notifications: {} });
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [installmentConfigs, setInstallmentConfigs] = useState([
    { months: 3, minAmount: 1000, interestRate: 0 },
    { months: 6, minAmount: 3000, interestRate: 0 },
    { months: 12, minAmount: 5000, interestRate: 0 },
  ]);

  // Loading states
  const [saving, setSaving] = useState({});
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load initial data
  useEffect(() => {
    if (tenant) {
      setStoreForm({
        name: tenant.name || '',
        email: tenant.businessInfo?.email || '',
        phone: tenant.businessInfo?.phone || '',
        address: tenant.businessInfo?.address || '',
      });
      setWhatsappForm({
        phoneNumber: tenant.whatsapp?.phoneNumber || '',
        accessToken: tenant.whatsapp?.accessToken || '',
        phoneNumberId: tenant.whatsapp?.phoneNumberId || '',
        notifications: {
          installmentReminder: tenant.whatsapp?.notifications?.installmentReminder ?? true,
          invoiceCreated: tenant.whatsapp?.notifications?.invoiceCreated ?? true,
          lowStock: tenant.whatsapp?.notifications?.lowStockAlert ?? true,
          supplierReminder: tenant.whatsapp?.notifications?.supplierPaymentDue ?? true,
        },
      });
      if (tenant.whatsapp?.enabled && tenant.whatsapp?.accessToken) {
        setWhatsappStatus('success');
      }
      if (tenant.settings?.installmentConfigs) {
        setInstallmentConfigs(tenant.settings.installmentConfigs);
      }
    }
    if (user) {
      setUserForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
    }
    loadCategories();
  }, [tenant, user]);

  const loadCategories = async () => {
    try {
      const res = await api.get('/products/categories');
      setCategories(res.data.data || []);
    } catch (err) {
      // Ignore if no categories
    }
  };

  // ===== Save Functions =====
  const handleSaveStore = async () => {
    if (!storeForm.name) return notify.error('اسم المتجر مطلوب');
    setSaving({ ...saving, store: true });
    try {
      await api.put('/settings/store', storeForm);
      notify.success('تم حفظ بيانات المتجر');
      getMe();
    } catch (err) {
      notify.error(err.response?.data?.message || 'خطأ في الحفظ');
    } finally {
      setSaving({ ...saving, store: false });
    }
  };

  const handleSaveUser = async () => {
    if (!userForm.name) return notify.warning('الاسم مطلوب');
    setSaving({ ...saving, user: true });
    try {
      await api.put('/auth/update-profile', {
        name: userForm.name,
        phone: userForm.phone,
      });
      await getMe();
      notify.success('تم حفظ بياناتك');
    } catch (err) {
      notify.error(err.response?.data?.message || 'خطأ في الحفظ');
    } finally {
      setSaving({ ...saving, user: false });
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      return notify.warning('أدخل كلمة المرور الحالية والجديدة');
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return notify.warning('كلمة المرور الجديدة غير متطابقة');
    }
    if (passwordForm.newPassword.length < 6) {
      return notify.warning('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }
    setSaving({ ...saving, password: true });
    try {
      await api.put('/auth/update-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      notify.success('تم تغيير كلمة المرور');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      notify.error(err.response?.data?.message || 'كلمة المرور الحالية غير صحيحة');
    } finally {
      setSaving({ ...saving, password: false });
    }
  };

  const handleSaveWhatsApp = async () => {
    setSaving({ ...saving, whatsapp: true });
    try {
      const res = await api.put('/settings/whatsapp', {
        whatsappNumber: whatsappForm.phoneNumber,
        whatsappToken: whatsappForm.accessToken,
        whatsappPhoneId: whatsappForm.phoneNumberId,
        notifications: whatsappForm.notifications,
      });
      if (res.data.data?.configured) {
        setWhatsappStatus('success');
        notify.success('تم حفظ وتفعيل WhatsApp');
      } else {
        notify.success('تم حفظ الإعدادات');
      }
      getMe();
    } catch (err) {
      notify.error(err.response?.data?.message || 'خطأ في الحفظ');
    } finally {
      setSaving({ ...saving, whatsapp: false });
    }
  };

  const handleTestWhatsApp = async () => {
    if (!whatsappForm.phoneNumber) return notify.warning('أدخل رقم الاختبار');
    setTestingWhatsApp(true);
    setWhatsappStatus(null);
    try {
      const res = await api.post('/settings/whatsapp/test', { phone: whatsappForm.phoneNumber });
      if (res.data.data?.success) {
        setWhatsappStatus('success');
        notify.success('تم إرسال رسالة الاختبار');
      } else {
        setWhatsappStatus('error');
        notify.error(res.data.data?.error?.message || 'فشل الإرسال');
      }
    } catch (err) {
      setWhatsappStatus('error');
      notify.error('خطأ في الاتصال');
    } finally {
      setTestingWhatsApp(false);
    }
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) return notify.warning('التصنيف موجود بالفعل');
    setCategories([...categories, newCategory.trim()]);
    setNewCategory('');
    notify.success('تم إضافة التصنيف');
  };

  const removeCategory = (cat) => {
    setCategories(categories.filter(c => c !== cat));
    notify.success('تم حذف التصنيف');
  };

  // ===== Avatar Functions =====
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return notify.warning('يرجى اختيار ملف صورة');
    if (file.size > 5 * 1024 * 1024) return notify.warning('حجم الصورة لا يتجاوز 5MB');

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await api.put('/auth/update-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await getMe();
      notify.success('تم تحديث الصورة الشخصية');
    } catch (err) {
      notify.error('حدث خطأ في رفع الصورة');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      await api.delete('/auth/remove-avatar');
      await getMe();
      notify.success('تم حذف الصورة الشخصية');
    } catch (err) {
      notify.error('حدث خطأ في حذف الصورة');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ===== Helpers =====
  const getRoleBadge = (role) => {
    const roles = {
      admin: { label: 'مدير النظام', color: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' },
      vendor: { label: 'بائع', color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' },
      coordinator: { label: 'منسق', color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' },
    };
    const r = roles[role] || { label: role, color: 'bg-gray-100 text-gray-600' };
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${r.color}`}>{r.label}</span>;
  };

  const formatDate = (date) => {
    if (!date) return 'غير متاح';
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // ===== Render Tab Content =====
  const renderTabContent = () => {
    switch (activeTab) {
      case 'store':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">بيانات المتجر</h2>
                <p className="text-sm text-gray-400">معلومات متجرك الأساسية</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="اسم المتجر *" value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} placeholder="مثال: إلكترونيات المعادي" />
              <Input label="البريد الإلكتروني" type="email" value={storeForm.email} onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })} placeholder="info@store.com" />
              <Input label="رقم الهاتف" value={storeForm.phone} onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })} placeholder="01000000000" />
              <Input label="العنوان" value={storeForm.address} onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })} placeholder="المعادي، القاهرة" />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveStore} loading={saving.store} icon={<Save className="w-4 h-4" />}>حفظ بيانات المتجر</Button>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-8">
            {/* Profile Header with Avatar */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-4xl font-bold shadow-lg overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user?.name?.charAt(0) || 'م'
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                    ) : (
                      <Camera className="w-4 h-4 text-primary-500" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                {user?.avatar && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    حذف الصورة
                  </button>
                )}
              </div>

              {/* Quick Info */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold">{user?.name}</h2>
                  {getRoleBadge(user?.role)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Phone className="w-4 h-4" />
                    <span>{user?.phone || 'غير محدد'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Building2 className="w-4 h-4" />
                    <span>{tenant?.name || 'غير محدد'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>آخر دخول: {formatDate(user?.lastLogin)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Profile Form */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-5">
                <Edit3 className="w-5 h-5 text-primary-500" />
                <h3 className="font-bold text-lg">تعديل البيانات الشخصية</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">الاسم *</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className={`w-full pr-10 pl-4 py-2.5 rounded-xl border text-sm ${
                        dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                      } focus:ring-2 focus:ring-primary-500 focus:border-transparent transition`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={userForm.email}
                      disabled
                      className={`w-full pr-10 pl-4 py-2.5 rounded-xl border text-sm opacity-60 cursor-not-allowed ${
                        dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">لا يمكن تغيير البريد الإلكتروني</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">رقم الهاتف</label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={userForm.phone}
                      onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                      className={`w-full pr-10 pl-4 py-2.5 rounded-xl border text-sm ${
                        dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                      } focus:ring-2 focus:ring-primary-500 focus:border-transparent transition`}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={handleSaveUser} loading={saving.user} icon={<Save className="w-4 h-4" />}>حفظ التغييرات</Button>
              </div>
            </div>

            {/* Password Change with Eye/EyeOff */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold">تغيير كلمة المرور</h3>
                  <p className="text-sm text-gray-400">تأمين حسابك</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'currentPassword', label: 'كلمة المرور الحالية', show: 'current' },
                  { key: 'newPassword', label: 'كلمة المرور الجديدة', show: 'new' },
                  { key: 'confirmPassword', label: 'تأكيد كلمة المرور', show: 'confirm' },
                ].map(({ key, label, show }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">{label}</label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPasswords[show] ? 'text' : 'password'}
                        value={passwordForm[key]}
                        onChange={(e) => setPasswordForm({ ...passwordForm, [key]: e.target.value })}
                        className={`w-full pr-10 pl-10 py-2.5 rounded-xl border text-sm ${
                          dark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                        } focus:ring-2 focus:ring-primary-500 focus:border-transparent transition`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, [show]: !showPasswords[show] })}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords[show] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4">
                <Button variant="warning" onClick={handleChangePassword} loading={saving.password} icon={<Lock className="w-4 h-4" />}>تغيير كلمة المرور</Button>
              </div>
            </div>

            {/* Account Info Cards */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-lg">معلومات الحساب</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoCard icon={Shield} label="الصلاحية" value={user?.role === 'admin' ? 'مدير النظام' : user?.role === 'vendor' ? 'بائع' : 'منسق'} color="blue" dark={dark} />
                <InfoCard icon={Building2} label="المتجر" value={tenant?.name || 'غير محدد'} color="purple" dark={dark} />
                <InfoCard icon={Calendar} label="الخطة" value={tenant?.subscription?.plan === 'trial' ? 'تجريبية' : tenant?.subscription?.plan || 'غير محدد'} color="amber" dark={dark} />
                <InfoCard icon={CheckCircle} label="حالة الحساب" value={user?.isActive ? 'نشط' : 'معطل'} color={user?.isActive ? 'emerald' : 'red'} dark={dark} />
                <InfoCard icon={Clock} label="آخر تسجيل دخول" value={formatDate(user?.lastLogin)} color="gray" dark={dark} />
                <InfoCard icon={Calendar} label="تاريخ الانضمام" value={formatDate(user?.createdAt)} color="gray" dark={dark} />
              </div>
            </div>
          </div>
        );

      case 'whatsapp':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-lg">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">WhatsApp Business API</h2>
                  <p className="text-sm text-gray-400">إرسال الإشعارات عبر واتساب</p>
                </div>
              </div>
              {whatsappStatus === 'success' && <Badge variant="success"><CheckCircle className="w-3 h-3 ml-1" />متصل</Badge>}
              {whatsappStatus === 'error' && <Badge variant="danger"><AlertTriangle className="w-3 h-3 ml-1" />غير متصل</Badge>}
            </div>

            {/* Warning Box */}
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <div className="flex gap-2">
                <Info className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-bold text-amber-700 dark:text-amber-400">مهم!</p>
                  <p className="text-amber-600 dark:text-amber-300">
                    لإرسال رسائل للعملاء في أي وقت، يجب إنشاء Message Templates في Meta Business Suite.
                  </p>
                </div>
              </div>
            </div>

            {/* API Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="رقم WhatsApp للاختبار" placeholder="01012345678" value={whatsappForm.phoneNumber} onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumber: e.target.value })} />
              <Input label="Phone Number ID" placeholder="من Meta Business Suite" value={whatsappForm.phoneNumberId} onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumberId: e.target.value })} />
            </div>
            <Input label="Access Token" type="password" placeholder="من Meta Business Suite" value={whatsappForm.accessToken} onChange={(e) => setWhatsappForm({ ...whatsappForm, accessToken: e.target.value })} />

            {/* Notifications Toggles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: 'installmentReminder', label: 'تذكير الأقساط', icon: '⏰' },
                { key: 'invoiceCreated', label: 'فاتورة جديدة', icon: '🧾' },
                { key: 'lowStock', label: 'نقص المخزون', icon: '📦' },
                { key: 'supplierReminder', label: 'تذكير المورد', icon: '🚛' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={whatsappForm.notifications[item.key]}
                    onChange={(e) => setWhatsappForm({
                      ...whatsappForm,
                      notifications: { ...whatsappForm.notifications, [item.key]: e.target.checked }
                    })}
                    className="w-4 h-4 rounded text-green-500"
                  />
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSaveWhatsApp} loading={saving.whatsapp} icon={<Save className="w-4 h-4" />}>حفظ الإعدادات</Button>
              <Button variant="outline" onClick={handleTestWhatsApp} loading={testingWhatsApp} icon={<TestTube className="w-4 h-4" />}>اختبار الاتصال</Button>
              <a href="https://business.facebook.com/latest/whatsapp_manager/message_templates" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" icon={<ExternalLink className="w-4 h-4" />}>فتح Meta Business Suite</Button>
              </a>
            </div>

            {/* Templates List */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
              <h3 className="font-bold mb-4">قوالب الرسائل المطلوبة (Message Templates)</h3>
              <div className="grid gap-3">
                {REQUIRED_TEMPLATES.map((template) => (
                  <div key={template.name} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">{template.nameAr}</p>
                        <p className="text-xs text-gray-400">{template.name}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{template.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'categories':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg">
                <Tag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">تصنيفات المنتجات</h2>
                <p className="text-sm text-gray-400">إدارة الفئات والتصنيفات</p>
              </div>
            </div>

            {/* Add Category */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Input placeholder="اسم التصنيف الجديد..." value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addCategory()} />
              </div>
              <Button onClick={addCategory} icon={<Tag className="w-4 h-4" />}>إضافة</Button>
            </div>

            {/* Categories List */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 group">
                  <span className="font-medium">{cat}</span>
                  <button onClick={() => removeCategory(cat)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-500 transition-opacity">✕</button>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-400">
                  <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد تصنيفات بعد</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'installments':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">إعدادات الأقساط</h2>
                <p className="text-sm text-gray-400">تخصيص خيارات التقسيط</p>
              </div>
            </div>

            <div className="space-y-4">
              {installmentConfigs.map((config, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <Input label="عدد الأشهر" type="number" value={config.months} onChange={(e) => {
                    const newConfigs = [...installmentConfigs];
                    newConfigs[idx].months = parseInt(e.target.value) || 0;
                    setInstallmentConfigs(newConfigs);
                  }} />
                  <Input label="الحد الأدنى (ج.م)" type="number" value={config.minAmount} onChange={(e) => {
                    const newConfigs = [...installmentConfigs];
                    newConfigs[idx].minAmount = parseInt(e.target.value) || 0;
                    setInstallmentConfigs(newConfigs);
                  }} />
                  <Input label="نسبة الفائدة %" type="number" value={config.interestRate} onChange={(e) => {
                    const newConfigs = [...installmentConfigs];
                    newConfigs[idx].interestRate = parseFloat(e.target.value) || 0;
                    setInstallmentConfigs(newConfigs);
                  }} />
                  <Button variant="ghost" size="sm" onClick={() => {
                    setInstallmentConfigs(installmentConfigs.filter((_, i) => i !== idx));
                  }}>حذف</Button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setInstallmentConfigs([...installmentConfigs, { months: 6, minAmount: 1000, interestRate: 0 }])} icon={<CreditCard className="w-4 h-4" />}>
                إضافة خيار تقسيط
              </Button>
              <Button onClick={() => notify.success('تم حفظ إعدادات الأقساط')} icon={<Save className="w-4 h-4" />}>
                حفظ الإعدادات
              </Button>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center shadow-lg">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">المظهر والثيم</h2>
                <p className="text-sm text-gray-400">تخصيص شكل التطبيق</p>
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${dark ? 'bg-gray-700' : 'bg-amber-100'}`}>
                    {dark ? <Moon className="w-7 h-7 text-blue-400" /> : <Sun className="w-7 h-7 text-amber-500" />}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{dark ? 'الوضع الداكن' : 'الوضع الفاتح'}</p>
                    <p className="text-sm text-gray-400">اضغط للتبديل بين الأوضاع</p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative w-16 h-9 rounded-full transition-colors duration-300 ${dark ? 'bg-primary-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-7 h-7 rounded-full bg-white shadow-md transition-all duration-300 ${dark ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>

            {/* Color Preview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-primary-500 text-white">
                <p className="font-bold">اللون الأساسي</p>
                <p className="text-sm opacity-80">#6366f1</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500 text-white">
                <p className="font-bold">اللون الثانوي</p>
                <p className="text-sm opacity-80">#10b981</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center shadow-lg">
          <Settings2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">الإعدادات</h1>
          <p className="text-sm text-gray-400">إدارة إعدادات النظام والتخصيصات</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <Card className="p-2">
            <nav className="space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? `bg-${tab.color}-50 dark:bg-${tab.color}-500/10 text-${tab.color}-600 dark:text-${tab.color}-400`
                        : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1 text-right">{tab.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4" />}
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <Card className="p-6">
            {renderTabContent()}
          </Card>
        </div>
      </div>
    </div>
  );
}

// InfoCard sub-component for account info display
function InfoCard({ icon: Icon, label, value, color, dark }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    red: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
    gray: 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${dark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}
