import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, XCircle, MessageSquare, Trash2, Filter, RefreshCw } from 'lucide-react';
import { reviewsApi } from '../store';
import { useThemeStore } from '../store';
import { Card, Badge, Button, LoadingSpinner } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

function StarDisplay({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${value >= s ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { dark } = useThemeStore();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [replyModal, setReplyModal] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        reviewsApi.getAll({ status: statusFilter !== 'all' ? statusFilter : undefined }),
        reviewsApi.getStats(),
      ]);
      setReviews(reviewsRes.data.data.reviews || []);
      setStats(statsRes.data.data);
    } catch (err) {
      notify.error('فشل تحميل التقييمات');
    }
    setLoading(false);
  };

  const handleStatus = async (id, status) => {
    try {
      await reviewsApi.updateStatus(id, status);
      notify.success(status === 'approved' ? 'تم قبول التقييم' : 'تم رفض التقييم');
      loadData();
    } catch {
      notify.error('فشل تحديث الحالة');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return notify.error('يرجى كتابة رد');
    setReplyLoading(true);
    try {
      await reviewsApi.addReply(replyModal._id, replyText);
      notify.success('تم إضافة الرد بنجاح');
      setReplyModal(null);
      setReplyText('');
      loadData();
    } catch {
      notify.error('فشل إضافة الرد');
    }
    setReplyLoading(false);
  };

  const handleDelete = async (id) => {
    notify.custom({
      title: 'حذف التقييم',
      message: 'هل أنت متأكد من حذف هذا التقييم؟',
      type: 'warning',
      actions: [
        {
          label: 'حذف',
          onClick: async () => {
            try {
              await reviewsApi.delete(id);
              notify.success('تم حذف التقييم');
              loadData();
            } catch {
              notify.error('فشل الحذف');
            }
          },
          style: 'danger',
        },
        { label: 'إلغاء', onClick: () => {}, style: 'secondary' },
      ],
    });
  };

  const statusFilters = [
    { value: 'pending', label: 'قيد المراجعة' },
    { value: 'approved', label: 'منشور' },
    { value: 'rejected', label: 'مرفوض' },
    { value: 'all', label: 'الكل' },
  ];

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            التقييمات والمراجعات
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">إدارة تقييمات العملاء</p>
        </div>
        <Button onClick={loadData} icon={<RefreshCw className="w-4 h-4" />} variant="outline">
          تحديث
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-3xl font-black text-yellow-500">{stats.avgRating || '—'}</p>
            <StarDisplay value={Math.round(stats.avgRating || 0)} />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">متوسط التقييم</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-black text-blue-500">{stats.pending || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">قيد المراجعة</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-black text-green-500">{stats.approved || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">منشور</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-3xl font-black text-gray-500">{stats.total || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">الإجمالي</p>
          </Card>
        </div>
      )}

      {/* Rating Distribution */}
      {stats?.ratingDistribution && (
        <Card className="p-4">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3 text-sm">توزيع التقييمات</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.ratingDistribution[star] || 0;
              const pct = stats.totalApproved > 0 ? (count / stats.totalApproved) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 w-4">{star}</span>
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-6">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition ${
              statusFilter === f.value
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                : `bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700`
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="py-10 flex justify-center"><LoadingSpinner /></div>
      ) : reviews.length === 0 ? (
        <Card className="p-10 text-center">
          <Star className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">لا توجد تقييمات</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review._id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      {review.customer?.name || 'عميل'}
                    </p>
                    {review.isVerifiedPurchase && (
                      <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">
                        شراء موثق
                      </span>
                    )}
                  </div>
                  <StarDisplay value={review.rating} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    review.status === 'approved'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : review.status === 'rejected'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                  }`}>
                    {review.status === 'approved' ? 'منشور' : review.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                  </span>
                </div>
              </div>

              {review.title && <p className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">{review.title}</p>}
              {review.body && <p className="text-sm text-gray-600 dark:text-gray-400">{review.body}</p>}

              <p className="text-[10px] text-gray-400 mt-2">
                {new Date(review.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                {review.product && ` · منتج: ${review.product.name}`}
              </p>

              {/* Vendor Reply */}
              {review.reply?.body && (
                <div className="mt-3 bg-primary-50 dark:bg-primary-900/10 rounded-xl p-3 border border-primary-100 dark:border-primary-800">
                  <p className="text-xs font-bold text-primary-700 dark:text-primary-400 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> ردك:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{review.reply.body}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {review.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleStatus(review._id, 'approved')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-bold hover:bg-green-200 transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> قبول
                    </button>
                    <button
                      onClick={() => handleStatus(review._id, 'rejected')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-200 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" /> رفض
                    </button>
                  </>
                )}
                {!review.reply?.body && (
                  <button
                    onClick={() => { setReplyModal(review); setReplyText(''); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-200 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> رد
                  </button>
                )}
                <button
                  onClick={() => handleDelete(review._id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> حذف
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {replyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-500" />
              الرد على التقييم
            </h3>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <StarDisplay value={replyModal.rating} />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{replyModal.body}</p>
            </div>

            <textarea
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="اكتب ردك هنا..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={handleReply}
                disabled={replyLoading}
                className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition disabled:opacity-50"
              >
                {replyLoading ? 'جاري الإرسال...' : 'إرسال الرد'}
              </button>
              <button
                onClick={() => setReplyModal(null)}
                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-bold hover:bg-gray-200 transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
