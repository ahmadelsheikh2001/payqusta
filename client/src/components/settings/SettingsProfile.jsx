import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, Building2, Clock, Edit3, Save, Lock, Eye, EyeOff,
  Camera, Loader2, Trash2, Shield, Calendar, CheckCircle, LogOut
} from 'lucide-react';
import { useAuthStore, useThemeStore, api } from '../../store';
import { Button } from '../UI';
import { notify } from '../AnimatedNotification';

const InfoCard = ({ icon: Icon, label, value, color, dark }) => (
  <div className={`p-4 rounded-xl border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} shadow-sm flex items-center gap-4`}>
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
      color === 'blue' ? 'bg-blue-100 text-blue-600' :
      color === 'purple' ? 'bg-purple-100 text-purple-600' :
      color === 'amber' ? 'bg-amber-100 text-amber-600' : 
      color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : 
      color === 'red' ? 'bg-red-100 text-red-600' :
      'bg-gray-100 text-gray-600'
    }`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="font-bold text-sm">{value}</p>
    </div>
  </div>
);

export default function SettingsProfile() {
  const { user, tenant, getMe, logoutAll } = useAuthStore();
  const { dark } = useThemeStore();
  
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setUserForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
    }
  }, [user]);

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

      {/* Session Security */}
      <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <LogOut className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-lg">أمان الجلسات</h3>
        </div>
        <div className={`p-4 rounded-xl border ${dark ? 'bg-gray-800 border-gray-700' : 'bg-red-50 border-red-100'}`}>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            تسجيل الخروج من جميع الأجهزة المتصلة بحسابك. سيتم إلغاء جميع الجلسات النشطة وستحتاج إلى تسجيل الدخول مرة أخرى.
          </p>
          <Button
            variant="danger"
            icon={<LogOut className="w-4 h-4" />}
            onClick={() => {
              notify.custom({
                title: 'تسجيل الخروج من كل الأجهزة',
                message: 'سيتم إنهاء جميع الجلسات النشطة. هل أنت متأكد؟',
                type: 'warning',
                actions: [
                  {
                    label: 'تسجيل الخروج من الكل',
                    onClick: async () => {
                      await logoutAll();
                    },
                    style: 'danger',
                  },
                  { label: 'إلغاء', onClick: () => {}, style: 'secondary' },
                ],
              });
            }}
          >
            تسجيل الخروج من جميع الأجهزة
          </Button>
        </div>
      </div>
    </div>
  );
}
