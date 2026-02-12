import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, Shield, Calendar, Camera, Save, Lock,
  Eye, EyeOff, Building2, Clock, CheckCircle, AlertTriangle,
  Loader2, Trash2, Edit3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore, useThemeStore, api } from '../store';
import { Card, Button, Input } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

export default function UserProfilePage() {
  const { user, tenant, getMe } = useAuthStore();
  const { dark } = useThemeStore();
  const fileInputRef = useRef(null);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // Avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleProfileSave = async () => {
    if (!profileForm.name.trim()) return notify.warning('الاسم مطلوب');
    if (!profileForm.phone.trim()) return notify.warning('رقم الهاتف مطلوب');

    setSavingProfile(true);
    try {
      await api.put('/auth/update-profile', {
        name: profileForm.name,
        phone: profileForm.phone,
      });
      await getMe();
      notify.success('تم تحديث الملف الشخصي بنجاح');
    } catch (err) {
      notify.error(err.response?.data?.message || 'حدث خطأ في حفظ البيانات');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword) return notify.warning('كلمة المرور الحالية مطلوبة');
    if (!passwordForm.newPassword) return notify.warning('كلمة المرور الجديدة مطلوبة');
    if (passwordForm.newPassword.length < 6) return notify.warning('كلمة المرور الجديدة لا تقل عن 6 أحرف');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return notify.warning('كلمة المرور الجديدة غير متطابقة');

    setSavingPassword(true);
    try {
      await api.put('/auth/update-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      notify.success('تم تغيير كلمة المرور بنجاح');
    } catch (err) {
      notify.error(err.response?.data?.message || 'كلمة المرور الحالية غير صحيحة');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return notify.warning('يرجى اختيار ملف صورة');
    }
    if (file.size > 5 * 1024 * 1024) {
      return notify.warning('حجم الصورة لا يتجاوز 5MB');
    }

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">الملف الشخصي</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">إدارة بيانات حسابك وكلمة المرور</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className={`rounded-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar Section */}
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

          {/* Info Section */}
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
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>تاريخ التسجيل: {formatDate(user?.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      <div className={`rounded-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-2 mb-5">
          <Edit3 className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-bold">تعديل البيانات الشخصية</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">الاسم</label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className={`w-full pr-10 pl-4 py-2.5 rounded-xl border text-sm ${
                  dark
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-gray-50 border-gray-200 text-gray-900'
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
                value={profileForm.email}
                disabled
                className={`w-full pr-10 pl-4 py-2.5 rounded-xl border text-sm opacity-60 cursor-not-allowed ${
                  dark
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-gray-50 border-gray-200 text-gray-900'
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
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className={`w-full pr-10 pl-4 py-2.5 rounded-xl border text-sm ${
                  dark
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-gray-50 border-gray-200 text-gray-900'
                } focus:ring-2 focus:ring-primary-500 focus:border-transparent transition`}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            onClick={handleProfileSave}
            loading={savingProfile}
            icon={<Save className="w-4 h-4" />}
          >
            حفظ التغييرات
          </Button>
        </div>
      </div>

      {/* Change Password */}
      <div className={`rounded-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-bold">تغيير كلمة المرور</h3>
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
                    dark
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-gray-50 border-gray-200 text-gray-900'
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

        <div className="mt-5 flex justify-end">
          <Button
            variant="warning"
            onClick={handlePasswordChange}
            loading={savingPassword}
            icon={<Lock className="w-4 h-4" />}
          >
            تغيير كلمة المرور
          </Button>
        </div>
      </div>

      {/* Account Info */}
      <div className={`rounded-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-emerald-500" />
          <h3 className="text-lg font-bold">معلومات الحساب</h3>
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
}

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
