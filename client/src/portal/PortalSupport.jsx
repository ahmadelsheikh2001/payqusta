import React, { useState, useEffect } from 'react';
import { usePortalStore } from '../store/portalStore';
import { MessageCircle, Phone, Mail, Send, HelpCircle, Package, CreditCard, AlertTriangle, FileText, Clock, CheckCircle2, ChevronLeft } from 'lucide-react';
import { notify } from '../components/AnimatedNotification';
import { Link } from 'react-router-dom';
import PortalEmptyState from './components/PortalEmptyState';
import PortalSkeleton from './components/PortalSkeleton';

const issueTypes = [
    { value: 'inquiry', label: 'استفسار عام', icon: HelpCircle },
    { value: 'order', label: 'مشكلة في طلب', icon: Package },
    { value: 'payment', label: 'مشكلة في الدفع', icon: CreditCard },
    { value: 'complaint', label: 'شكوى', icon: AlertTriangle },
];

export default function PortalSupport() {
    const { sendSupportMessage, fetchSupportMessages, loading } = usePortalStore();
    const [activeTab, setActiveTab] = useState('new');
    const [selectedType, setSelectedType] = useState('inquiry');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(false);
    const [storeContact, setStoreContact] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);

    useEffect(() => {
        if (activeTab === 'tickets') {
            loadTickets();
        }
    }, [activeTab]);

    const loadTickets = async () => {
        setLoadingTickets(true);
        const data = await fetchSupportMessages();
        setTickets(data);
        setLoadingTickets(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) {
            notify.error('برجاء ملء جميع الحقول');
            return;
        }
        const res = await sendSupportMessage(subject, message, selectedType);
        if (res.success) {
            setSent(true);
            setStoreContact(res.data?.storeContact);
            notify.success(res.message);
        } else {
            notify.error(res.message);
        }
    };

    if (sent) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6" dir="rtl">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                    <Send className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">تم إرسال رسالتك!</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">سيتم التواصل معك قريباً</p>

                {storeContact && (storeContact.phone || storeContact.email) && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 w-full max-w-sm mb-6 space-y-3">
                        <p className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">أو تواصل معنا مباشرة:</p>
                        {storeContact.phone && (
                            <a href={`tel:${storeContact.phone}`} className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-primary-600">
                                <Phone className="w-5 h-5 text-primary-500" />
                                <span className="font-mono">{storeContact.phone}</span>
                            </a>
                        )}
                        {storeContact.email && (
                            <a href={`mailto:${storeContact.email}`} className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-primary-600">
                                <Mail className="w-5 h-5 text-primary-500" />
                                <span>{storeContact.email}</span>
                            </a>
                        )}
                    </div>
                )}

                <button
                    onClick={() => { setSent(false); setSubject(''); setMessage(''); }}
                    className="px-6 py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition"
                >
                    إرسال رسالة أخرى
                </button>
            </div>
        );
    }

    const getStatusInfo = (status) => {
        switch (status) {
            case 'replied': return { label: 'تم الرد', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 };
            case 'closed': return { label: 'مغلقة', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: CheckCircle2 };
            default: return { label: 'مفتوحة', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock };
        }
    };

    return (
        <div className="space-y-5 pb-20" dir="rtl">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 text-primary-500" />
                    الدعم الفني
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">كيف يمكننا مساعدتك اليوم؟</p>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-6">
                <button
                    onClick={() => setActiveTab('new')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'new'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    رسالة جديدة
                </button>
                <button
                    onClick={() => setActiveTab('tickets')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'tickets'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    تذاكري السابقة
                </button>
            </div>

            {activeTab === 'new' ? (
                <>
                    {/* Issue Type */}
                    <div className="grid grid-cols-2 gap-3">
                        {issueTypes.map(type => {
                            const TypeIcon = type.icon;
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => setSelectedType(type.value)}
                                    className={`p-3 rounded-2xl border-2 text-right flex items-center gap-2 transition-all ${selectedType === type.value
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                        }`}
                                >
                                    <TypeIcon className={`w-5 h-5 flex-shrink-0 ${selectedType === type.value ? 'text-primary-500' : 'text-gray-400'}`} />
                                    <span className={`text-sm font-bold ${selectedType === type.value ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400'}`}>
                                        {type.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">الموضوع *</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                placeholder="موضوع رسالتك..."
                                required
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">رسالتك *</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="اكتب رسالتك هنا بأكبر قدر من التفاصيل..."
                                required
                                rows={5}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition resize-none"
                            />
                            <p className="text-xs text-gray-400 mt-1 text-left">{message.length} / 1000</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-primary-500 text-white rounded-2xl font-bold text-base hover:bg-primary-600 transition shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {loading
                                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <><Send className="w-5 h-5" />إرسال الرسالة</>}
                        </button>
                    </form>
                </>
            ) : (
                <div className="space-y-4">
                    {loadingTickets ? (
                        <div className="pt-8">
                            <PortalSkeleton count={3} type="list" />
                        </div>
                    ) : tickets.length === 0 ? (
                        <PortalEmptyState
                            icon={FileText}
                            title="لا توجد رسائل سابقة"
                            message="أي رسالة ترسلها للدعم الفني ستظهر هنا لتتمكن من متابعة الردود عليها."
                            className="my-8"
                        />
                    ) : (
                        tickets.map(ticket => {
                            const StatusInfo = getStatusInfo(ticket.status);
                            const StatusIcon = StatusInfo.icon;

                            return (
                                <Link
                                    to={`/portal/support/${ticket._id}`}
                                    key={ticket._id}
                                    className="block p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all shadow-sm"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                                                <MessageCircle className="w-5 h-5 text-primary-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{ticket.subject}</h3>
                                                <p className="text-xs text-gray-500 mt-1">{new Date(ticket.createdAt).toLocaleDateString('ar-EG')}</p>
                                            </div>
                                        </div>
                                        <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${StatusInfo.color}`}>
                                            <StatusIcon className="w-3.5 h-3.5" />
                                            {StatusInfo.label}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 px-2 border-r-2 border-gray-200 dark:border-gray-700">
                                        {ticket.message}
                                    </p>
                                    <div className="mt-4 text-left">
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700">
                                            عرض المحادثة <ChevronLeft className="w-4 h-4" />
                                        </span>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
