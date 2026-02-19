import React, { useState, useEffect } from 'react';
import { api } from '../store';
import { Card, Badge, LoadingSpinner } from './UI';
import { AlertCircle, TrendingDown, ArrowRight, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AIStockWidget() {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const { data } = await api.get('/bi/stock-forecast');
        setForecast(data.data || []);
      } catch (err) {
        console.error('Failed to fetch stock forecast', err);
      } finally {
        setLoading(false);
      }
    };
    fetchForecast();
  }, []);

  if (loading) return <Card className="p-6 flex justify-center"><LoadingSpinner /></Card>;
  
  const atRiskItems = forecast.filter(item => item.status === 'critical' || item.status === 'high').slice(0, 5);
  
  if (atRiskItems.length === 0) return null; // Don't show if everything is fine

  return (
    <div className="md:col-span-2 lg:col-span-1">
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden border border-indigo-500/30">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-500/20 rounded-lg animate-pulse">
              <TrendingDown className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg">تحليل المخزون بالذكاء الاصطناعي</h3>
              <p className="text-xs text-indigo-300">توقعات النفاذ بناءً على المبيعات</p>
            </div>
          </div>

          <div className="space-y-3">
            {atRiskItems.map((item) => (
              <div key={item.productId} className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-sm truncate w-2/3" title={item.name}>{item.name}</h4>
                  <Badge variant={item.status === 'critical' ? 'danger' : 'warning'} size="sm">
                    {item.status === 'critical' ? 'حرج جداً' : 'منخفض'}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-end text-xs text-gray-300">
                  <div>
                    <p>المخزون الحالي: <span className="text-white font-bold">{item.currentStock}</span></p>
                    <p>معدل البيع: {item.ads} / يوم</p>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-red-300 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      ينفذ في {item.daysUntilStockout} أيام
                    </p>
                    <Link 
                      to={`/products/restock?id=${item.productId}`} // We might need to implement this page/modal later
                      className="inline-flex items-center gap-1 text-indigo-300 hover:text-white transition-colors text-[10px] bg-indigo-500/20 px-2 py-1 rounded"
                    >
                      <ShoppingCart className="w-3 h-3" /> طلب توريد
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link to="/reports/inventory" className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/30">
            عرض التقرير الكامل <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
