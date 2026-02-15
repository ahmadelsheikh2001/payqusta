import React, { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import { useAuthStore } from '../../store';
import { Button, Input } from '../UI';

export default function SettingsInstallments() {
  const { tenant } = useAuthStore();
  const [installmentConfigs, setInstallmentConfigs] = useState([
    { months: 3, minAmount: 1000, interestRate: 0 },
    { months: 6, minAmount: 3000, interestRate: 0 },
    { months: 12, minAmount: 5000, interestRate: 0 },
  ]);

  useEffect(() => {
    if (tenant?.settings?.installmentConfigs) {
      setInstallmentConfigs(tenant.settings.installmentConfigs);
    }
  }, [tenant]);

  const addConfig = () => {
    setInstallmentConfigs([...installmentConfigs, { months: 3, minAmount: 1000, interestRate: 0 }]);
  }

  // NOTE: Original code didn't show where this was saved. 
  // We should probably add a Save button here acting on `tenant.settings`.

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
          <Button onClick={addConfig}>+ إضافة خطة</Button>
      </div>
    </div>
  );
}
