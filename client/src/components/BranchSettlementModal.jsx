import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, LoadingSpinner } from './UI';
import { api } from '../store';
import { Calculator, DollarSign, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import notify from './AnimatedNotification';

export default function BranchSettlementModal({ open, onClose, branchId, branchName }) {
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settlementData, setSettlementData] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashInHand, setCashInHand] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && branchId) {
      fetchSettlementData();
    }
  }, [open, branchId]);

  const fetchSettlementData = async () => {
    setLoading(true);
    try {
      // Get branch stats (today's data)
      const res = await api.get(`/branches/${branchId}/stats`);
      const stats = res.data.data;

      // Prepare settlement data from today's stats
      const data = {
        totalSales: stats.today.sales || 0,
        cashSales: stats.today.paid || 0, // Simplified: assuming paid = cash for now
        cardSales: 0, // Would need payment method breakdown from backend
        creditSales: stats.today.sales - stats.today.paid || 0,
        expenses: stats.today.expenses || 0,
        returns: 0, // Would need returns data
        netCash: (stats.today.paid || 0) - (stats.today.expenses || 0),
        invoicesCount: stats.today.invoicesCount || 0
      };

      setSettlementData(data);
      setCashInHand(data.netCash.toString());
    } catch (error) {
      console.error('Error fetching settlement data:', error);
      notify.error('فشل تحميل بيانات التصفية');
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!cashInHand || isNaN(parseFloat(cashInHand))) {
      notify.warning('الرجاء إدخال المبلغ النقدي الفعلي');
      return;
    }

    setSettling(true);
    try {
      const expectedCash = settlementData.netCash;
      const actualCash = parseFloat(cashInHand);
      const variance = actualCash - expectedCash;

      await api.post(`/branches/${branchId}/settlement`, {
        date,
        cashInHand: actualCash,
        expectedCash,
        variance,
        notes
      });

      notify.success('تم تصفية العهدة وإغلاق الوردية بنجاح ✅');
      onClose();
    } catch (error) {
      console.error('Error settling branch:', error);
      notify.error(error.response?.data?.message || 'حدث خطأ أثناء التصفية');
    } finally {
      setSettling(false);
    }
  };

  const fmt = (n) => (n || 0).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });

  return (
    <Modal open={open} onClose={onClose} title={`تصفية وردية - ${branchName || 'الفرع'}`} size="lg">
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-gray-500" />
            <span className="font-bold text-sm">تاريخ التصفية:</span>
          </div>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="bg-transparent font-mono text-sm outline-none"
          />
        </div>

        {loading ? (
          <div className="py-10 flex justify-center"><LoadingSpinner /></div>
        ) : settlementData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Sales Summary */}
             <Card className="p-4 border-l-4 border-l-green-500">
               <h4 className="flex items-center gap-2 font-bold mb-3 text-green-700 dark:text-green-400">
                 <TrendingUp className="w-4 h-4" /> المبيعات
               </h4>
               <div className="space-y-2 text-sm">
                 <div className="flex justify-between">
                   <span className="text-gray-500">مبيعات نقدية</span>
                   <span className="font-bold">{fmt(settlementData.cashSales)}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-500">مبيعات آجلة</span>
                   <span className="font-bold">{fmt(settlementData.creditSales)}</span>
                 </div>
                 <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                   <span className="font-bold">الإجمالي</span>
                   <span className="font-bold text-green-600">{fmt(settlementData.totalSales)}</span>
                 </div>
               </div>
             </Card>

             {/* Deductions */}
             <Card className="p-4 border-l-4 border-l-red-500">
               <h4 className="flex items-center gap-2 font-bold mb-3 text-red-700 dark:text-red-400">
                 <TrendingDown className="w-4 h-4" /> الخصومات
               </h4>
               <div className="space-y-2 text-sm">
                 <div className="flex justify-between">
                   <span className="text-gray-500">المصروفات</span>
                   <span className="font-bold text-red-500">-{fmt(settlementData.expenses)}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-500">مرتجعات</span>
                   <span className="font-bold text-red-500">-{fmt(settlementData.returns)}</span>
                 </div>
               </div>
             </Card>

             {/* Net Cash */}
             <Card className="md:col-span-2 p-5 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-100 dark:border-primary-500/30">
                <p className="text-gray-500 text-sm mb-1 text-center">صافي النقدية المتوقع</p>
                <h2 className="text-4xl font-black text-primary-600 dark:text-primary-400 text-center mb-4">{fmt(settlementData.netCash)}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      المبلغ الفعلي في الدرج <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={cashInHand}
                      onChange={(e) => setCashInHand(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold text-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      الفرق (عجز/زيادة)
                    </label>
                    <div className={`w-full px-4 py-2 border rounded-xl font-bold text-lg flex items-center justify-center ${
                      parseFloat(cashInHand || 0) - settlementData.netCash === 0
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-600 dark:text-green-400'
                        : parseFloat(cashInHand || 0) - settlementData.netCash > 0
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400'
                    }`}>
                      {fmt((parseFloat(cashInHand || 0) - settlementData.netCash))}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                    rows="2"
                    placeholder="أي ملاحظات حول التصفية..."
                  />
                </div>
             </Card>
          </div>
        ) : (
          <p className="text-center text-gray-500">لا توجد بيانات</p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose} disabled={settling}>إلغاء</Button>
          <Button
            className="w-full sm:w-auto"
            icon={settling ? <LoadingSpinner /> : <CheckCircle className="w-4 h-4" />}
            onClick={handleSettle}
            disabled={loading || !settlementData || settling || !cashInHand}
          >
            {settling ? 'جاري التصفية...' : 'تأكيد التصفية وإغلاق الوردية'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
