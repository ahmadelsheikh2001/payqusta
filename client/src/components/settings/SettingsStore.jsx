import React, { useState, useEffect } from 'react';
import { Save, Building2 } from 'lucide-react';
import { useAuthStore, api } from '../../store';
import { Card, Button, Input } from '../UI';
import { notify } from '../AnimatedNotification';

export default function SettingsStore() {
  const { tenant, getMe } = useAuthStore();
  const [storeForm, setStoreForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setStoreForm({
        name: tenant.name || '',
        email: tenant.businessInfo?.email || '',
        phone: tenant.businessInfo?.phone || '',
        address: tenant.businessInfo?.address || '',
      });
    }
  }, [tenant]);

  const handleSaveStore = async () => {
    if (!storeForm.name) return notify.error('اسم المتجر مطلوب');
    setSaving(true);
    try {
      await api.put('/settings/store', { 
        name: storeForm.name, 
        businessInfo: { 
          email: storeForm.email, 
          phone: storeForm.phone, 
          address: storeForm.address 
        } 
      });
      notify.success('تم حفظ بيانات المتجر');
      getMe();
    } catch (err) {
      notify.error(err.response?.data?.message || 'خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  };

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
        <Input 
          label="اسم المتجر *" 
          value={storeForm.name} 
          onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} 
          placeholder="مثال: إلكترونيات المعادي" 
        />
        <Input 
          label="البريد الإلكتروني" 
          type="email" 
          value={storeForm.email} 
          onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })} 
          placeholder="info@store.com" 
        />
        <Input 
          label="رقم الهاتف" 
          value={storeForm.phone} 
          onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })} 
          placeholder="01000000000" 
        />
        <Input 
          label="العنوان" 
          value={storeForm.address} 
          onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })} 
          placeholder="المعادي، القاهرة" 
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSaveStore} loading={saving} icon={<Save className="w-4 h-4" />}>
          حفظ بيانات المتجر
        </Button>
      </div>
    </div>
  );
}
