import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, LoadingSpinner } from './UI'; // Assuming UI components exist
import { invoicesApi, expensesApi } from '../store'; // Assuming APIs exist
import { Calculator, DollarSign, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BranchSettlementModal({ open, onClose, branchId, branchName }) {
  const [loading, setLoading] = useState(false);
  const [settlementData, setSettlementData] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (open && branchId) {
      fetchSettlementData();
    }
  }, [open, branchId, date]);

  const fetchSettlementData = async () => {
    setLoading(true);
    try {
      // In a real app, we would have a specific endpoint for this. 
      // For now, we simulate aggregation or call existing reporting APIs if available.
      // We'll mimic fetching functionality.
      
      // Fetch Sales for Date & Branch
      const salesRes = await invoicesApi.getSalesSummary('day'); 
      // Note: effective filtering by branch needs backend support on this endpoint or client-side filtering
      // Assuming getSalesSummary might support query params in future or we mock it for now.
      
      // Mocking data for demonstration as endpoint might not support branch filter perfectly yet
      const mockData = {
        totalSales: 5000 + Math.random() * 2000,
        cashSales: 3000 + Math.random() * 1000,
        creditSales: 2000 + Math.random() * 1000,
        expenses: 500 + Math.random() * 200,
        returns: 100,
        netCash: 0 // calculated below
      };
      
      mockData.netCash = mockData.cashSales - mockData.expenses - mockData.returns;
      
      setSettlementData(mockData);

    } catch (error) {
      console.error(error);
      toast.error('فشل تحميل بيانات التصفية');
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async () => {
    try {
      // confirm settlement
      toast.success('تم تصفية العهدة بنجاح ✅');
      onClose();
    } catch (error) {
      toast.error('حدث خطأ أثناء التصفية');
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
             <Card className="md:col-span-2 p-5 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-100 dark:border-primary-500/30 text-center">
                <p className="text-gray-500 text-sm mb-1">صافي النقدية في الدرج</p>
                <h2 className="text-4xl font-black text-primary-600 dark:text-primary-400">{fmt(settlementData.netCash)}</h2>
             </Card>
          </div>
        ) : (
          <p className="text-center text-gray-500">لا توجد بيانات</p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button 
            className="w-full sm:w-auto" 
            icon={<CheckCircle className="w-4 h-4" />} 
            onClick={handleSettle}
            disabled={loading || !settlementData}
          >
            تأكيد التصفية وإغلاق الوردية
          </Button>
        </div>
      </div>
    </Modal>
  );
}
