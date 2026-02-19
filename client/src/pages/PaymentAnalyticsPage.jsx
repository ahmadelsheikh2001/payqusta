/**
 * Payment Analytics Dashboard
 * Shows comprehensive payment gateway statistics
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock,
  Download
} from 'lucide-react';
import { api } from '../store';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const GATEWAY_NAMES = {
  paymob: 'Paymob',
  fawry: 'Fawry',
  vodafone: 'Vodafone Cash',
  instapay: 'InstaPay'
};

const PaymentAnalytics = () => {
  const [period, setPeriod] = useState('30');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/payments/analytics?period=${period}`);
      setAnalytics(data.data);
    } catch (error) {
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!analytics) return null;

  // Prepare data for charts
  const gatewayData = analytics.byGateway?.map(g => ({
    name: GATEWAY_NAMES[g._id] || g._id,
    amount: g.totalAmount,
    count: g.count,
    successRate: (g.successRate * 100).toFixed(1)
  })) || [];

  const dailyData = analytics.dailyTrend?.map(d => ({
    date: new Date(d._id).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
    amount: d.amount,
    count: d.count,
    successRate: d.successCount > 0 ? ((d.successCount / d.count) * 100).toFixed(1) : 0
  })) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            تحليلات الدفع الإلكتروني
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            إحصائيات شاملة حول المدفوعات الإلكترونية
          </p>
        </div>

        {/* Period Selector */}
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="7">آخر 7 أيام</option>
          <option value="30">آخر 30 يوم</option>
          <option value="90">آخر 3 شهور</option>
          <option value="365">آخر سنة</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Amount */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <DollarSign size={32} className="opacity-80" />
            <span className="text-blue-100 text-sm">إجمالي المبالغ</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {gatewayData.reduce((sum, g) => sum + g.amount, 0).toLocaleString()} ج.م
          </div>
          <p className="text-blue-100 text-sm">
            {gatewayData.reduce((sum, g) => sum + g.count, 0)} معاملة
          </p>
        </div>

        {/* Success Rate */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle size={32} className="opacity-80" />
            <span className="text-green-100 text-sm">معدل النجاح</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {dailyData.length > 0 
              ? (dailyData.reduce((sum, d) => sum + parseFloat(d.successRate), 0) / dailyData.length).toFixed(1)
              : 0}%
          </div>
          <p className="text-green-100 text-sm">
            من إجمالي المعاملات
          </p>
        </div>

        {/* Average Transaction */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <CreditCard size={32} className="opacity-80" />
            <span className="text-purple-100 text-sm">متوسط المعاملة</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {gatewayData.reduce((sum, g) => sum + g.count, 0) > 0
              ? (gatewayData.reduce((sum, g) => sum + g.amount, 0) / gatewayData.reduce((sum, g) => sum + g.count, 0)).toFixed(0)
              : 0} ج.م
          </div>
          <p className="text-purple-100 text-sm">
            للمعاملة الواحدة
          </p>
        </div>

        {/* Most Used Gateway */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp size={32} className="opacity-80" />
            <span className="text-orange-100 text-sm">البوابة الأكثر استخداماً</span>
          </div>
          <div className="text-2xl font-bold mb-1">
            {gatewayData.length > 0 
              ? gatewayData.reduce((max, g) => g.count > max.count ? g : max, gatewayData[0]).name
              : '-'}
          </div>
          <p className="text-orange-100 text-sm">
            {gatewayData.length > 0 
              ? `${gatewayData.reduce((max, g) => g.count > max.count ? g : max, gatewayData[0]).count} معاملة`
              : ''}
          </p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gateway Comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
            مقارنة البوابات
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gatewayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="amount" fill="#3b82f6" name="المبلغ" />
              <Bar dataKey="count" fill="#10b981" name="العدد" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Success Rate by Gateway */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
            معدل النجاح لكل بوابة
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={gatewayData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.successRate}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="successRate"
              >
                {gatewayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
          الاتجاه اليومي
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="amount" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="المبلغ"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="count" 
              stroke="#10b981" 
              strokeWidth={2}
              name="العدد"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gateway Details Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
          تفاصيل البوابات
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  البوابة
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  عدد المعاملات
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  إجمالي المبلغ
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  معدل النجاح
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  متوسط المعاملة
                </th>
              </tr>
            </thead>
            <tbody>
              {gatewayData.map((gateway, index) => (
                <tr 
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {gateway.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {gateway.count}
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                    {gateway.amount.toLocaleString()} ج.م
                  </td>
                  <td className="py-3 px-4">
                    <span className={`
                      px-2 py-1 rounded-full text-sm font-medium
                      ${parseFloat(gateway.successRate) >= 80 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : parseFloat(gateway.successRate) >= 60
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }
                    `}>
                      {gateway.successRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {(gateway.amount / gateway.count).toFixed(0)} ج.م
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentAnalytics;
