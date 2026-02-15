import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { DollarSign, Clock, Lock, CheckCircle, AlertTriangle, History } from 'lucide-react';
import { Button, Card, Input, Modal, LoadingSpinner, EmptyState, Badge } from '../components/UI';
import Pagination from '../components/Pagination';

export default function CashDrawerPage() {
  const [activeShift, setActiveShift] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  
  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  
  // Forms
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingForm, setClosingForm] = useState({ actualCash: 0, notes: '' });

  const fetchDat = async () => {
    setLoading(true);
    try {
      const [currentRes, historyRes] = await Promise.all([
        axios.get('/api/v1/cash-shifts/current'),
        axios.get(`/api/v1/cash-shifts/history?page=${page}&limit=10`)
      ]);
      setActiveShift(currentRes.data.data);
      setHistory(historyRes.data.data);
      setPagination(historyRes.data.pagination);
    } catch (err) {
      toast.error('فشل تحميل بيانات الخزينة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDat();
  }, [page]);

  const handleOpenShift = async () => {
    try {
      await axios.post('/api/v1/cash-shifts/open', { openingBalance: Number(openingBalance) });
      toast.success('تم فتح الوردية');
      setShowOpenModal(false);
      fetchDat();
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطأ');
    }
  };

  const handleCloseShift = async () => {
    try {
      await axios.post('/api/v1/cash-shifts/close', { 
        actualCash: Number(closingForm.actualCash),
        notes: closingForm.notes
      });
      toast.success('تم إغلاق الوردية');
      setShowCloseModal(false);
      setClosingForm({ actualCash: 0, notes: '' });
      fetchDat();
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطأ');
    }
  };

  const fmt = (n) => new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(n);

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">إدارة الخزينة والورديات</h1>
          <p className="text-gray-500 mt-1">فتح وإغلاق الورديات ومتابعة النقدية</p>
        </div>
      </div>

      {/* Active Shift Area */}
      {loading ? <LoadingSpinner /> : (
        <>
          {!activeShift ? (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 text-white text-center shadow-xl">
              <Lock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold mb-2">لا توجد وردية مفتوحة</h2>
              <p className="text-gray-400 mb-6">يجب فتح وردية جديدة لبدء تسجيل المبيعات النقدية</p>
              <Button size="lg" onClick={() => setShowOpenModal(true)} icon={<DollarSign />}>فتح وردية جديدة</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-emerald-600 to-green-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-lg font-bold opacity-90">الوردية الحالية</h2>
                      <p className="text-sm opacity-75">{new Date(activeShift.startTime).toLocaleString('ar-EG')}</p>
                    </div>
                    <Badge className="bg-white/20 text-white border-0">مفتوحة ✅</Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-black/10 rounded-xl">
                      <span className="text-sm font-medium opacity-80">الرصيد الافتتاحي</span>
                      <span className="font-bold text-lg">{fmt(activeShift.openingBalance)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-black/10 rounded-xl">
                      <span className="text-sm font-medium opacity-80">مبيعات نقدية (حتى الآن)</span>
                      <span className="font-bold text-lg text-green-200">+{fmt(activeShift.currentSales)}</span>
                    </div>
                    <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                       <span className="text-lg font-bold">المتوقع في الدرج</span>
                       <span className="text-3xl font-black">{fmt(activeShift.expectedNow)}</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button 
                      variant="danger" 
                      className="w-full bg-white/10 hover:bg-white/20 border-0 text-white backdrop-blur-sm"
                      onClick={() => setShowCloseModal(true)}
                    >
                      إغلاق الوردية
                    </Button>
                  </div>
                </div>
              </div>

              <Card className="p-6 flex flex-col justify-center items-center text-center space-y-4">
                <Clock className="w-12 h-12 text-primary-500" />
                <div>
                   <h3 className="text-xl font-bold">زمن الوردية</h3>
                   <p className="text-gray-500">مفتوحة منذ {Math.floor((new Date() - new Date(activeShift.startTime)) / 1000 / 60)} دقيقة</p>
                </div>
              </Card>
            </div>
          )}

          {/* History Table */}
          <div className="mt-10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><History className="w-5 h-5" /> سجل الورديات السابق</h3>
            <Card className="overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-right text-sm">
                   <thead className="bg-gray-50 dark:bg-gray-800">
                     <tr>
                       <th className="p-4">التاريخ</th>
                       <th className="p-4">الموظف</th>
                       <th className="p-4">الفتح</th>
                       <th className="p-4">الإغلاق</th>
                       <th className="p-4">المبيعات</th>
                       <th className="p-4">العجز/الزيادة</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                     {history.length === 0 ? (
                       <tr><td colSpan="6" className="p-8 text-center text-gray-500">لا يوجد سجل سابق</td></tr>
                     ) : history.map(shift => (
                       <tr key={shift._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                         <td className="p-4">{new Date(shift.startTime).toLocaleDateString('ar-EG')}</td>
                         <td className="p-4">{shift.user?.name}</td>
                         <td className="p-4">{new Date(shift.startTime).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</td>
                         <td className="p-4">{shift.endTime ? new Date(shift.endTime).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : '—'}</td>
                         <td className="p-4 font-bold">{fmt(shift.totalCashSales)}</td>
                         <td className="p-4">
                           {shift.variance === 0 ? (
                             <Badge variant="success">مطابق</Badge>
                           ) : shift.variance < 0 ? (
                             <span className="text-red-500 font-bold dir-ltr">{fmt(shift.variance)}</span>
                           ) : (
                             <span className="text-green-500 font-bold">+{fmt(shift.variance)}</span>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </Card>
            <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {/* Open Modal */}
      <Modal open={showOpenModal} onClose={() => setShowOpenModal(false)} title="فتح وردية جديدة">
        <div className="space-y-4">
          <Input 
            label="الرصيد الافتتاحي (كم يوجد في الدرج الآن؟)"
            type="number"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            className="text-lg"
          />
          <Button onClick={handleOpenShift} className="w-full">بدء الوردية</Button>
        </div>
      </Modal>

      {/* Close Modal */}
      <Modal open={showCloseModal} onClose={() => setShowCloseModal(false)} title="إغلاق الوردية">
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-center">
             <p className="text-gray-500 text-sm">المبلغ المتوقع في الدرج</p>
             <p className="text-3xl font-black text-primary-600">{activeShift && fmt(activeShift.expectedNow)}</p>
          </div>
          <Input 
            label="النقدية الفعلية (بعد العد)"
            type="number"
            value={closingForm.actualCash}
            onChange={(e) => setClosingForm({...closingForm, actualCash: e.target.value})}
            className="text-lg"
            autoFocus
          />
          <Input 
            label="ملاحظات"
            value={closingForm.notes}
            onChange={(e) => setClosingForm({...closingForm, notes: e.target.value})}
          />
          
          {closingForm.actualCash > 0 && activeShift && (
             <div className={`p-3 rounded-lg text-center font-bold ${
                Number(closingForm.actualCash) - activeShift.expectedNow === 0 ? 'bg-green-50 text-green-600' : 
                Number(closingForm.actualCash) - activeShift.expectedNow < 0 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
             }`}>
                الفرق: {fmt(Number(closingForm.actualCash) - activeShift.expectedNow)}
             </div>
          )}

          <Button onClick={handleCloseShift} variant="danger" className="w-full">تأكيد الإغلاق</Button>
        </div>
      </Modal>
    </div>
  );
}
