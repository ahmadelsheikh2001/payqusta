/**
 * Field Collection App - Main Component
 * Mobile-optimized interface for field collectors
 */

import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  User,
  Phone,
  FileText,
  Clock,
  TrendingUp,
  Camera,
  Edit3
} from 'lucide-react';
import { api } from '../store';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import SignatureCanvas from '../components/SignatureCanvas';
import PhotoUpload from '../components/PhotoUpload';

const FieldCollectionApp = () => {
  const [tasks, setTasks] = useState([]);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showSignature, setShowSignature] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [collectionData, setCollectionData] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    collected: 0
  });

  useEffect(() => {
    fetchTodayData();
  }, []);

  const fetchTodayData = async () => {
    setLoading(true);
    try {
      // Fetch today's tasks
      const tasksRes = await api.get('/collection/tasks/today');
      const taskData = tasksRes.data.data || [];
      setTasks(taskData);

      // Calculate stats
      const stats = {
        total: taskData.length,
        completed: taskData.filter(t => t.status === 'collected').length,
        collected: taskData
          .filter(t => t.status === 'collected')
          .reduce((sum, t) => sum + (t.collectedAmount || 0), 0)
      };
      setStats(stats);

      // Try to fetch route
      try {
        const routeRes = await api.get('/collection/routes/today');
        setRoute(routeRes.data.data);
      } catch (err) {
        console.log('No route for today');
      }
    } catch (error) {
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleVisit = async (taskId) => {
    try {
      await api.post(`/collection/tasks/${taskId}/visit`);
      toast.success('تم تسجيل الزيارة');
      fetchTodayData();
    } catch (error) {
      toast.error('فشل تسجيل الزيارة');
    }
  };

  const handleCollect = async (taskId, amount, method) => {
    try {
      await api.post(`/collection/tasks/${taskId}/collect`, {
        amount,
        paymentMethod: method
      });
      toast.success('✅ تم التحصيل بنجاح');
      setSelectedTask(null);
      fetchTodayData();
    } catch (error) {
      toast.error('فشل تسجيل التحصيل');
    }
  };

  const handleSkip = async (taskId, reason) => {
    try {
      await api.post(`/collection/tasks/${taskId}/skip`, { reason });
      toast.success('تم تخطي المهمة');
      fetchTodayData();
    } catch (error) {
      toast.error('فشل تخطي المهمة');
    }
  };

  const openInMaps = (task) => {
    if (task.location && task.location.coordinates) {
      const [lng, lat] = task.location.coordinates;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, '_blank');
    } else {
      toast.error('الموقع غير متوفر');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => 
    ['pending', 'assigned', 'in-progress', 'visited'].includes(t.status)
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header Stats */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
        <h1 className="text-2xl font-bold mb-4">التحصيل الميداني</h1>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-blue-100">إجمالي المهام</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
            <div className="text-2xl font-bold">{stats.completed}</div>
            <div className="text-sm text-blue-100">تم التحصيل</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
            <div className="text-2xl font-bold">
              {stats.collected.toLocaleString()}
            </div>
            <div className="text-sm text-blue-100">ج.م</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>التقدم</span>
            <span>{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="p-4 space-y-3">
        {pendingTasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto mb-3 text-green-500" size={48} />
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              لا توجد مهام متبقية
            </p>
            <p className="text-sm text-gray-500 mt-1">
              أحسنت! أكملت جميع المهام
            </p>
          </div>
        ) : (
          pendingTasks.map(task => (
            <motion.div
              key={task._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden"
            >
              {/* Task Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User size={20} className="text-gray-400" />
                    <span className="font-bold text-gray-900 dark:text-white">
                      {task.customer?.name || 'عميل'}
                    </span>
                  </div>
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${task.priority === 'urgent' 
                      ? 'bg-red-100 text-red-700'
                      : task.priority === 'high'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-700'
                    }
                  `}>
                    {task.priority === 'urgent' ? 'عاجل' : task.priority === 'high' ? 'أولوية' : 'عادي'}
                  </span>
                </div>

                {/* Customer Info */}
                {task.customer?.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Phone size={16} />
                    <a href={`tel:${task.customer.phone}`} className="hover:text-blue-600">
                      {task.customer.phone}
                    </a>
                  </div>
                )}

                {task.invoice && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <FileText size={16} />
                    <span>فاتورة #{task.invoice.invoiceNumber}</span>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <DollarSign size={20} />
                    <span className="text-sm">المبلغ المطلوب</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {task.amount?.toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 flex gap-2">
                <button
                  onClick={() => openInMaps(task)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Navigation size={18} />
                  التوجيه
                </button>
                
                <button
                  onClick={() => setSelectedTask(task)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  تحصيل
                </button>

                <button
                  onClick={() => {
                    const reason = prompt('سبب التخطي:');
                    if (reason) handleSkip(task._id, reason);
                  }}
                  className="px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition"
                >
                  <XCircle size={18} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Collection Modal */}
      {selectedTask && (
        <CollectionModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onCollect={handleCollect}
        />
      )}
    </div>
  );
};

// Collection Modal Component
const CollectionModal = ({ task, onClose, onCollect }) => {
  const [amount, setAmount] = useState(task.amount);
  const [method, setMethod] = useState('cash');

  const handleSubmit = () => {
    if (amount <= 0 || amount > task.amount) {
      toast.error('المبلغ غير صحيح');
      return;
    }
    onCollect(task._id, amount, method);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-md p-6 pb-8"
      >
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
        
        <h3 className="font-bold text-xl mb-4 text-gray-900 dark:text-white">
          تحصيل من {task.customer?.name}
        </h3>

        {/* Amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            المبلغ المحصل
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            max={task.amount}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-lg font-bold focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            المبلغ المطلوب: {task.amount} ج.م
          </p>
        </div>

        {/* Payment Method */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            طريقة الدفع
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['cash', 'card', 'bank_transfer', 'mobile_wallet'].map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`
                  px-4 py-2 rounded-lg border-2 font-medium transition
                  ${method === m 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {m === 'cash' ? 'نقدي' : m === 'card' ? 'بطاقة' : m === 'bank_transfer' ? 'تحويل' : 'محفظة'}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
          >
            تأكيد التحصيل
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default FieldCollectionApp;
