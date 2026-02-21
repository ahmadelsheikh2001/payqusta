import React, { useState, useEffect } from 'react';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { Star, MessageSquare, CheckCircle, Clock, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { notify } from '../components/AnimatedNotification';
import PortalEmptyState from './components/PortalEmptyState';
import PortalSkeleton from './components/PortalSkeleton';

function StarRating({ value, onChange, size = 'md' }) {
  const [hovered, setHovered] = useState(0);
  const sizeClass = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange && onChange(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={`transition-transform ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
        >
          <Star
            className={`${sizeClass} ${(hovered || value) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  const [showReply, setShowReply] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <StarRating value={review.rating} />
          {review.title && <p className="font-bold text-gray-900 dark:text-white mt-1">{review.title}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          {review.isVerifiedPurchase && (
            <span className="flex items-center gap-1 text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> شراء موثق
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${review.status === 'approved'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : review.status === 'rejected'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
            }`}>
            {review.status === 'approved' ? 'منشور' : review.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
          </span>
        </div>
      </div>

      {review.body && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{review.body}</p>}
      {review.product && (
        <p className="text-xs text-primary-500 mt-2">المنتج: {review.product.name}</p>
      )}

      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
        {new Date(review.createdAt).toLocaleDateString('ar-EG')}
      </p>

      {/* Vendor Reply */}
      {review.reply?.body && (
        <div className="mt-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-primary-500" />
            رد المتجر
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{review.reply.body}</p>
        </div>
      )}
    </div>
  );
}

export default function PortalReviews() {
  const { fetchMyReviews, submitReview } = usePortalStore();
  const { dark } = useThemeStore();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    type: 'store',
    rating: 0,
    title: '',
    body: '',
  });

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    const data = await fetchMyReviews();
    setReviews(data?.reviews || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (form.rating === 0) {
      notify.error('يرجى اختيار التقييم');
      return;
    }
    if (!form.body.trim()) {
      notify.error('يرجى كتابة تقييمك');
      return;
    }

    setSubmitting(true);
    const res = await submitReview({
      type: form.type,
      rating: form.rating,
      title: form.title,
      body: form.body,
    });
    setSubmitting(false);

    if (res.success) {
      notify.success(res.message || 'تم إرسال تقييمك بنجاح');
      setShowForm(false);
      setForm({ type: 'store', rating: 0, title: '', body: '' });
      loadReviews();
    } else {
      notify.error(res.message);
    }
  };

  return (
    <div className="space-y-4 pb-20" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-500" />
          تقييماتي
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/20"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'إلغاء' : 'تقييم جديد'}
        </button>
      </div>

      {/* New Review Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white">أضف تقييمك</h3>

          {/* Type */}
          <div className="flex gap-2">
            {[
              { value: 'store', label: 'تقييم المتجر' },
              { value: 'service', label: 'جودة الخدمة' },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setForm({ ...form, type: t.value })}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${form.type === t.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">التقييم *</label>
            <StarRating value={form.rating} onChange={(r) => setForm({ ...form, rating: r })} size="lg" />
            <p className="text-xs text-gray-400 mt-1">
              {form.rating === 1 ? 'سيء جداً' : form.rating === 2 ? 'سيء' : form.rating === 3 ? 'مقبول' : form.rating === 4 ? 'جيد' : form.rating === 5 ? 'ممتاز' : 'اختر تقييمك'}
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">عنوان التقييم (اختياري)</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مثال: تجربة رائعة..."
              maxLength={100}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">تفاصيل التقييم *</label>
            <textarea
              rows={3}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="شاركنا تجربتك مع المتجر..."
              maxLength={2000}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-left">{form.body.length}/2000</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/20 disabled:opacity-50"
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
          </button>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <PortalSkeleton count={4} type="card" className="mt-4" />
      ) : reviews.length === 0 ? (
        <PortalEmptyState
          icon={Star}
          title="لم تقم بأي تقييم بعد"
          message="شاركنا تجربتك مع المتجر"
          className="my-8"
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review._id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
