import React, { useEffect, useState } from 'react';
import { usePortalStore } from "../store/portalStore";
import { Card, LoadingSpinner, Badge, Button } from "../components/UI";
import { CreditCard, Calendar, ArrowLeft, ShoppingBag, Receipt, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function PortalHome() {
  const { fetchDashboard, loading } = usePortalStore();
  const [data, setData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const res = await fetchDashboard();
    if (res) setData(res);
  };

  if (loading || !data) return <LoadingSpinner />;

  const { wallet, upcomingInstallments, recentOrders, profile } = data;
  
  // Wallet Pie Data
  const pieData = [
    { name: 'مستخدم', value: wallet.usedCredit, color: '#ef4444' }, // Red
    { name: 'متاح', value: wallet.availableCredit, color: '#22c55e' }, // Green
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Credit Wallet Card */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-500/20 rounded-full -ml-10 -mb-10 blur-xl"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">الرصيد المتاح للشراء</p>
              <h2 className="text-4xl font-black tracking-tight">
                {wallet.availableCredit.toLocaleString()} <span className="text-lg font-medium text-gray-400">{wallet.currency}</span>
              </h2>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <CreditCard className="w-6 h-6 text-primary-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-white/5 p-3 rounded-xl backdrop-blur-sm">
              <p className="text-xs text-gray-400 mb-1">إجمالي الحد الائتماني</p>
              <p className="font-bold">{wallet.creditLimit.toLocaleString()}</p>
            </div>
            <div className="bg-white/5 p-3 rounded-xl backdrop-blur-sm">
              <p className="text-xs text-gray-400 mb-1">المستخدم حالياً</p>
              <p className="font-bold text-red-400">{wallet.usedCredit.toLocaleString()}</p>
            </div>
          </div>
          
          <Link to="/portal/products">
            <Button className="w-full mt-6 bg-primary-600 hover:bg-primary-500 text-white border-none">
              تسوق الآن واستخدم رصيدك <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Upcoming Installments */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            أقساط مستحقة
          </h3>
          {upcomingInstallments.length > 0 && (
             <Badge variant="warning">{upcomingInstallments.length} قسط</Badge>
          )}
        </div>

        {upcomingInstallments.length === 0 ? (
           <Card className="p-8 text-center bg-white border-2 border-dashed border-gray-200">
             <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
               <Receipt className="w-6 h-6 text-green-600" />
             </div>
             <p className="text-gray-500 text-sm">لا توجد أقساط مستحقة قريباً</p>
           </Card>
        ) : (
          <div className="space-y-3">
            {upcomingInstallments.map((inst, idx) => (
              <Card key={idx} className="p-4 flex justify-between items-center border-l-4 border-l-orange-400">
                <div>
                  <p className="font-bold text-gray-800">فاتورة #{inst.invoiceNumber}</p>
                  <p className="text-xs text-gray-500 mt-1">تستحق في {new Date(inst.dueDate).toLocaleDateString('ar-EG')}</p>
                </div>
                <div className="text-left">
                  <p className="font-black text-lg text-orange-600">{inst.amount.toLocaleString()} ج.م</p>
                  <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    قسط {inst.installmentNumber}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/portal/products" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:bg-gray-50 transition-colors">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2 text-blue-600">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm">تصفح المنتجات</span>
        </Link>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center opacity-50 cursor-not-allowed">
           <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-2 text-purple-600">
            <Receipt className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm">سداد قسط (قريباً)</span>
        </div>
      </div>

    </div>
  );
}
