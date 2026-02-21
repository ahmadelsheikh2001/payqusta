import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, Search, Send, RefreshCw, Eye, CheckCircle, XCircle,
  Clock, User, Phone, ChevronLeft, Lock, MessageSquare, Filter
} from 'lucide-react';
import { useAuthStore, api as globalApi } from '../store';
import { Card, LoadingSpinner, EmptyState, Modal } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

const STATUS_CONFIG = {
  open: { label: 'مفتوحة', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  replied: { label: 'تم الرد', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: MessageCircle },
  closed: { label: 'مغلقة', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: Lock },
};

const TYPE_LABELS = {
  inquiry: 'استفسار',
  complaint: 'شكوى',
  suggestion: 'اقتراح',
  other: 'أخرى',
};

const TYPE_COLORS = {
  inquiry: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  complaint: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  suggestion: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function SupportMessagesPage() {
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const { token, user } = useAuthStore();

  const api = useCallback((method, url, data) =>
    globalApi({ method, url, data }),
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api('get', `/manage/support?status=${statusFilter}`);
      const payload = data.data || data;
      setMessages(payload.messages || []);
      setStats(payload.stats || {});
    } catch {
      notify.error('فشل تحميل الرسائل');
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openMessage = async (msg) => {
    setDetailLoading(true);
    setSelected(msg);
    try {
      const { data } = await api('get', `/manage/support/${msg._id}`);
      setSelected(data.data || data);
    } catch {
      // use the list data
    } finally {
      setDetailLoading(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setReplyLoading(true);
    try {
      const { data } = await api('post', `/manage/support/${selected._id}/reply`, { message: replyText });
      setSelected(data.data || data);
      setReplyText('');
      notify.success('تم إرسال الرد');
      load();
    } catch {
      notify.error('فشل إرسال الرد');
    } finally {
      setReplyLoading(false);
    }
  };

  const closeTicket = async (id) => {
    try {
      await api('patch', `/manage/support/${id}/close`);
      notify.success('تم إغلاق التذكرة');
      setSelected(null);
      load();
    } catch {
      notify.error('فشل إغلاق التذكرة');
    }
  };

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    return `منذ ${Math.floor(diff / 86400)} يوم`;
  };

  const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary-500" /> رسائل الدعم
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">إدارة رسائل الدعم والاستفسارات من العملاء</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
          <RefreshCw className="w-4 h-4" /> تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'مفتوحة', count: stats.open || 0, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20', filter: 'open' },
          { label: 'تم الرد', count: stats.replied || 0, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', filter: 'replied' },
          { label: 'مغلقة', count: stats.closed || 0, color: 'text-gray-600 bg-gray-50 dark:bg-gray-800', filter: 'closed' },
        ].map((s) => (
          <button
            key={s.filter}
            onClick={() => setStatusFilter(statusFilter === s.filter ? '' : s.filter)}
            className={`p-4 rounded-2xl text-center transition-all border-2 ${statusFilter === s.filter ? 'border-primary-500 shadow-md' : 'border-transparent'} ${s.color}`}
          >
            <p className="text-2xl font-black">{s.count}</p>
            <p className="text-xs font-bold mt-1 opacity-70">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Messages List */}
      {loading ? <LoadingSpinner /> : messages.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="w-12 h-12 text-gray-300" />}
          title="لا توجد رسائل"
          description={statusFilter ? 'لا توجد رسائل بهذه الحالة' : 'لم يتم استلام أي رسائل دعم بعد'}
        />
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card
              key={msg._id}
              className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => openMessage(msg)}
            >
              <div className="p-4 flex items-start gap-4">
                {/* Avatar */}
                <div className="w-11 h-11 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {msg.customer?.profilePhoto ? (
                    <img src={msg.customer.profilePhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-primary-600" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">{msg.customer?.name || 'عميل'}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TYPE_COLORS[msg.type] || TYPE_COLORS.other}`}>
                        {TYPE_LABELS[msg.type] || msg.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={msg.status} />
                    </div>
                  </div>

                  <p className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-1 truncate">{msg.subject}</p>
                  <p className="text-xs text-gray-500 truncate">{msg.message}</p>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-400">{timeAgo(msg.createdAt)}</span>
                    {msg.replies?.length > 0 && (
                      <span className="text-[10px] text-primary-500 font-bold">{msg.replies.length} رد</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 mt-2">
                  <span className="text-xs text-primary-600 bg-primary-50 dark:bg-primary-900/10 px-2 py-1 rounded-lg font-bold">
                    عرض التفاصيل
                  </span>
                  <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Message Detail Modal */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setReplyText(''); }} title={selected?.subject || 'تفاصيل الرسالة'} size="lg">
        {selected && (
          <div className="flex flex-col h-[70vh]" dir="rtl">
            {/* Customer Info */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center overflow-hidden">
                  {selected.customer?.profilePhoto ? (
                    <img src={selected.customer.profilePhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-primary-600" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm">{selected.customer?.name}</p>
                  <p className="text-xs text-gray-400">{selected.customer?.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selected.status} />
                {selected.status !== 'closed' && (
                  <button
                    onClick={() => closeTicket(selected._id)}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 hover:bg-gray-200 transition flex items-center gap-1"
                  >
                    <Lock className="w-3 h-3" /> إغلاق
                  </button>
                )}
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Original message */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary-600" />
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tr-md p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-sm">{selected.customer?.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TYPE_COLORS[selected.type]}`}>{TYPE_LABELS[selected.type]}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selected.message}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">{new Date(selected.createdAt).toLocaleString('ar-EG')}</span>
                </div>
              </div>

              {/* Replies */}
              {selected.replies?.map((reply, i) => (
                <div key={i} className={`flex gap-3 ${reply.sender === 'vendor' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${reply.sender === 'vendor' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-primary-100 dark:bg-primary-900/30'}`}>
                    {reply.sender === 'vendor' ? (
                      <MessageSquare className="w-4 h-4 text-green-600" />
                    ) : (
                      <User className="w-4 h-4 text-primary-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`rounded-2xl p-4 ${reply.sender === 'vendor'
                      ? 'bg-green-50 dark:bg-green-900/20 rounded-tl-md'
                      : 'bg-gray-100 dark:bg-gray-800 rounded-tr-md'
                      }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs">
                          {reply.sender === 'vendor' ? (reply.senderName || 'الإدارة') : selected.customer?.name}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{reply.message}</p>
                    </div>
                    <span className={`text-[10px] text-gray-400 mt-1 block ${reply.sender === 'vendor' ? 'text-left' : ''}`}>
                      {new Date(reply.createdAt).toLocaleString('ar-EG')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            {selected.status !== 'closed' && (
              <div className="border-t border-gray-100 dark:border-gray-800 p-4 flex-shrink-0">
                <div className="flex gap-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب ردك هنا..."
                    className="flex-1 p-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-sm resize-none h-20 focus:border-primary-500 outline-none"
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) sendReply(); }}
                  />
                  <button
                    onClick={sendReply}
                    disabled={replyLoading || !replyText.trim()}
                    className="self-end px-6 py-3 rounded-xl bg-primary-500 text-white font-bold text-sm hover:bg-primary-600 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {replyLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    إرسال
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Ctrl+Enter للإرسال السريع</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
