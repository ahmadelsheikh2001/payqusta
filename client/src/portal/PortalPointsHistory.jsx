import React, { useState, useEffect } from 'react';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { TrendingUp, TrendingDown, Gift, ShoppingCart, Award, Calendar, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function PortalPointsHistory() {
  const { fetchPointsHistory, fetchPoints, customer } = usePortalStore();
  const { dark } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all'); // all, earned, redeemed

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyData, pointsData] = await Promise.all([
        fetchPointsHistory(),
        fetchPoints()
      ]);

      if (historyData) {
        setHistory(historyData.history || []);
        setStats(historyData.summary || null);
      } else if (pointsData) {
        // Fallback if history endpoint fails
        setStats(pointsData);
      }
    } catch (err) {
      console.error('Error loading points data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    if (filter === 'earned') return item.type === 'earn';
    if (filter === 'redeemed') return item.type === 'redeem';
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'earn':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'redeem':
        return <Gift className="w-5 h-5 text-purple-500" />;
      default:
        return <Award className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'earn':
        return 'نقاط مكتسبة';
      case 'redeem':
        return 'نقاط مستبدلة';
      default:
        return 'نشاط';
    }
  };

  const getReasonLabel = (reason) => {
    const labels = {
      purchase: 'شراء منتجات',
      referral: 'دعوة صديق',
      birthday: 'هدية عيد ميلاد',
      reward: 'مكافأة خاصة',
      discount: 'استبدال خصم',
      gift: 'استبدال هدية',
      cashback: 'استرداد نقدي'
    };
    return labels[reason] || reason;
  };

  return (
    <div className={`min-h-screen ${dark ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold">سجل النقاط</h1>
                <p className="text-purple-100">تتبع نقاطك ومكافآتك</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <p className="text-purple-100 text-sm mb-1">رصيد النقاط الحالي</p>
                <p className="text-4xl font-black">{customer?.points?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <p className="text-purple-100 text-sm mb-1">إجمالي المكتسب</p>
                <p className="text-3xl font-bold">{stats?.totalEarned?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <p className="text-purple-100 text-sm mb-1">إجمالي المستبدل</p>
                <p className="text-3xl font-bold">{stats?.totalRedeemed?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Filter className="w-5 h-5" />
            <span className="text-sm font-bold">تصفية:</span>
          </div>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filter === 'all'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilter('earned')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filter === 'earned'
                ? 'bg-green-600 text-white shadow-lg shadow-green-500/30'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            مكتسبة
          </button>
          <button
            onClick={() => setFilter('redeemed')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filter === 'redeemed'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            مستبدلة
          </button>
        </div>

        {/* History List */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">جاري التحميل...</p>
            </div>
          ) : filteredHistory.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredHistory.map((item, index) => (
                <div
                  key={item._id || index}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      item.type === 'earn'
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-purple-50 dark:bg-purple-900/20'
                    }`}>
                      {getIcon(item.type)}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">
                            {getReasonLabel(item.reason)}
                          </h3>
                          {item.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className={`text-xl font-black shrink-0 ${
                          item.type === 'earn'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-purple-600 dark:text-purple-400'
                        }`}>
                          {item.type === 'earn' ? '+' : '-'}{item.points}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(item.createdAt), 'dd MMM yyyy, hh:mm a', { locale: ar })}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full ${
                          item.type === 'earn'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        }`}>
                          {getTypeLabel(item.type)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Award className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">
                لا توجد سجلات
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                {filter === 'all'
                  ? 'لم تقم بأي نشاط يتعلق بالنقاط حتى الآن'
                  : filter === 'earned'
                  ? 'لم تكسب أي نقاط حتى الآن'
                  : 'لم تستبدل أي نقاط حتى الآن'}
              </p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <Award className="w-5 h-5" />
            كيف تكسب المزيد من النقاط؟
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li className="flex items-start gap-2">
              <ShoppingCart className="w-4 h-4 mt-0.5 shrink-0" />
              <span>اكسب نقطة واحدة عن كل 10 جنيه من مشترياتك</span>
            </li>
            <li className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
              <span>مكافآت خاصة في المناسبات والعروض الموسمية</span>
            </li>
            <li className="flex items-start gap-2">
              <Gift className="w-4 h-4 mt-0.5 shrink-0" />
              <span>استبدل نقاطك بخصومات أو هدايا قيمة</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
