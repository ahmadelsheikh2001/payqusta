import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePortalStore } from "../store/portalStore";
import { Button, LoadingSpinner } from "../components/UI";
import { Toaster } from 'react-hot-toast';
import { Phone, Lock } from 'lucide-react';

export default function PortalLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState(''); // Optional: if needed to identify tenant
  const { login, loading, error } = usePortalStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(phone, password, tenantSlug);
    if (success) {
      navigate('/portal/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Cairo']">
      <Toaster position="top-center" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          بوابة العملاء
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          سجل دخولك لمتابعة رصيدك ومشترياتك
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                رقم الهاتف
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  required
                  className="block w-full pr-10 border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2.5 border"
                  placeholder="01xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                كلمة المرور
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full pr-10 border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2.5 border"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

           {/*  <div>
              <div className="text-sm text-left">
                <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                  نسيت كلمة المرور؟
                </a>
              </div>
            </div> */}

            <div>
              <Button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                disabled={loading}
              >
                {loading ? <LoadingSpinner size="sm" /> : 'تسجيل الدخول'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
