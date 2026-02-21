import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore, useThemeStore } from '../store';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [registerData, setRegisterData] = useState({ name: '', storeName: '', phone: '' });

  const { login, register, loading } = useAuthStore();
  const { dark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('تم تسجيل الدخول بنجاح! 🎉');
      
      // Get role from store or response (login updates store)
      const { user } = useAuthStore.getState();
      if (user?.isSuperAdmin) {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      toast.error(err.message || 'خطأ في تسجيل الدخول');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await register({
        name: registerData.name,
        email,
        phone: registerData.phone,
        password,
        storeName: registerData.storeName,
      });
      toast.success('تم إنشاء الحساب بنجاح! 🎉');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'خطأ في إنشاء الحساب');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-5 ${dark ? 'dark' : ''}`}>
      <div className="fixed inset-0 bg-gradient-to-br from-primary-100 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950" />

      {/* Decorative blobs */}
      <div className="fixed top-10 right-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-xl shadow-primary-500/30 mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">
            Pay<span className="text-primary-500">Qusta</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">نظام إدارة المبيعات والأقساط الذكي</p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-gray-800 p-8">
          <form onSubmit={isRegister ? handleRegister : handleLogin}>
            {isRegister && (
              <>
                <div className="mb-4">
                  <label htmlFor="register-name" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">الاسم الكامل</label>
                  <input
                    id="register-name"
                    name="name"
                    type="text"
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:border-primary-500 transition-all text-gray-900 dark:text-white"
                    placeholder="مثال: محمد أحمد"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="register-store-name" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">اسم المتجر</label>
                  <input
                    id="register-store-name"
                    name="storeName"
                    type="text"
                    value={registerData.storeName}
                    onChange={(e) => setRegisterData({ ...registerData, storeName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:border-primary-500 transition-all text-gray-900 dark:text-white"
                    placeholder="مثال: إلكترونيات المعادي"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="register-phone" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">رقم الهاتف</label>
                  <input
                    id="register-phone"
                    name="phone"
                    type="tel"
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:border-primary-500 transition-all text-gray-900 dark:text-white"
                    placeholder="01XXXXXXXXX"
                    required
                  />
                </div>
              </>
            )}

            <div className="mb-4">
              <label htmlFor="auth-email" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">البريد الإلكتروني</label>
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:border-primary-500 transition-all text-gray-900 dark:text-white"
                placeholder="example@email.com"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="auth-password" className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <input
                  id="auth-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:border-primary-500 transition-all text-gray-900 dark:text-white pl-12"
                  placeholder="••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isRegister && (
              <div className="mb-6 text-left">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-base shadow-xl shadow-primary-500/30 hover:shadow-primary-500/50 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري المعالجة...
                </span>
              ) : isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-primary-500 hover:text-primary-600 font-semibold"
            >
              {isRegister ? 'لديك حساب بالفعل؟ سجل دخول' : 'ليس لديك حساب؟ أنشئ حساب جديد'}
            </button>
          </div>
        </div>

        {/* Theme toggle */}
        <div className="text-center mt-5">
          <button
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur text-gray-500 text-sm font-medium border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
          </button>
        </div>
      </div>
    </div>
  );
}
