import React, { useState, useEffect, useCallback } from 'react';
import {
    ShoppingBag, MapPin, Phone, User, Search, Eye, CheckCircle,
    Truck, Package, XCircle, Clock, RefreshCw, Filter
} from 'lucide-react';
import { useAuthStore, api } from '../store';
import { Badge, Card, LoadingSpinner, EmptyState, Modal } from '../components/UI';
import { notify } from '../components/AnimatedNotification';
import Pagination from '../components/Pagination';

const ORDER_STATUS_OPTIONS = [
    { value: '', label: 'كل الطلبات' },
    { value: 'pending', label: 'قيد الانتظار' },
    { value: 'confirmed', label: 'مؤكد' },
    { value: 'processing', label: 'جاري التجهيز' },
    { value: 'shipped', label: 'تم الشحن' },
    { value: 'delivered', label: 'تم التسليم' },
    { value: 'cancelled', label: 'ملغي' },
];

const STATUS_CONFIG = {
    pending: { label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
    confirmed: { label: 'مؤكد', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
    processing: { label: 'جاري التجهيز', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Package },
    shipped: { label: 'تم الشحن', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: Truck },
    delivered: { label: 'تم التسليم', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

const NEXT_STATUS = {
    pending: 'confirmed',
    confirmed: 'processing',
    processing: 'shipped',
    shipped: 'delivered',
};

export default function PortalOrdersAdminPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
    const { token } = useAuthStore();
    const LIMIT = 15;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: LIMIT, source: 'portal', sort: '-createdAt' };
            if (statusFilter) params.orderStatus = statusFilter;
            if (search) params.search = search;
            const res = await api.get('/invoices', {
                params,
            });
            const payload = res.data?.data || res.data;
            const list = Array.isArray(payload) ? payload : (payload?.invoices || []);
            const pag = payload?.pagination || res.data?.pagination || {};
            setOrders(list);
            setPagination({ totalPages: pag.pages || pag.totalPages || 1, total: pag.total || pag.totalItems || list.length });
        } catch (err) {
            notify.error('فشل تحميل الطلبات');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, search, token]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [statusFilter, search]);

    const updateStatus = async (orderId, newStatus) => {
        setUpdatingId(orderId);
        try {
            await api.patch(`/invoices/${orderId}/order-status`,
                { orderStatus: newStatus }
            );
            notify.success('تم تحديث حالة الطلب');
            load();
            if (selected?._id === orderId) setSelected(prev => ({ ...prev, orderStatus: newStatus }));
        } catch {
            notify.error('فشل تحديث الحالة');
        } finally {
            setUpdatingId(null);
        }
    };

    const fmt = (n) => (n || 0).toLocaleString('ar-EG');

    const StatusBadge = ({ status }) => {
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
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
                        <ShoppingBag className="w-6 h-6 text-primary-500" /> طلبات البوابة الإلكترونية
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">الطلبات التي أرسلها العملاء من بوابتهم</p>
                </div>
                <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                    <RefreshCw className="w-4 h-4" /> تحديث
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="بحث باسم العميل أو رقم الطلب..."
                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-sm focus:border-primary-500 outline-none transition"
                    />
                </div>
                <div className="relative sm:w-52">
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-sm focus:border-primary-500 outline-none transition appearance-none"
                    >
                        {ORDER_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Summary chips */}
            <div className="flex gap-2 flex-wrap">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const count = orders.filter(o => o.orderStatus === key).length;
                    if (!count) return null;
                    return (
                        <button
                            key={key}
                            onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition ${statusFilter === key ? cfg.color + ' border-transparent' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-300'}`}
                        >
                            {cfg.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            {loading ? <LoadingSpinner /> : orders.length === 0 ? (
                <EmptyState
                    icon={<ShoppingBag className="w-12 h-12 text-gray-300" />}
                    title="لا توجد طلبات"
                    description={statusFilter ? 'لا توجد طلبات بهذه الحالة' : 'لم يتم استلام أي طلبات من البوابة بعد'}
                />
            ) : (
                <>
                    <Card className="overflow-hidden border-0 shadow-lg shadow-gray-100/50 dark:shadow-none">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                        <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">رقم الطلب</th>
                                        <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">العميل</th>
                                        <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">التوصيل</th>
                                        <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">التاريخ</th>
                                        <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">الإجمالي</th>
                                        <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400">الحالة</th>
                                        <th className="px-5 py-4 font-bold text-gray-500 dark:text-gray-400 text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {orders.map(order => (
                                        <tr key={order._id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-5 py-4 font-bold text-primary-600 dark:text-primary-400">
                                                #{order.invoiceNumber}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-gray-800 dark:text-gray-200">{order.customer?.name || '—'}</div>
                                                <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {order.shippingAddress?.phone || order.customer?.phone || '—'}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                {order.shippingAddress ? (
                                                    <div className="flex items-start gap-1 text-xs text-gray-600 dark:text-gray-400 max-w-[180px]">
                                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                                                        <span className="truncate">{order.shippingAddress.governorate} — {order.shippingAddress.address}</span>
                                                    </div>
                                                ) : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="px-5 py-4 text-gray-500 text-xs">
                                                {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                                                <div className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className="px-5 py-4 font-black text-gray-800 dark:text-gray-200">
                                                {fmt(order.totalAmount)} <span className="text-[10px] font-normal text-gray-400">ج.م</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusBadge status={order.orderStatus || 'pending'} />
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setSelected(order)}
                                                        className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition"
                                                        title="عرض التفاصيل"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {NEXT_STATUS[order.orderStatus] && (
                                                        <button
                                                            onClick={() => updateStatus(order._id, NEXT_STATUS[order.orderStatus])}
                                                            disabled={updatingId === order._id}
                                                            className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 transition disabled:opacity-50"
                                                            title={`تحديث إلى: ${STATUS_CONFIG[NEXT_STATUS[order.orderStatus]]?.label}`}
                                                        >
                                                            {updatingId === order._id
                                                                ? <RefreshCw className="w-4 h-4 animate-spin" />
                                                                : <CheckCircle className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                    {order.orderStatus !== 'cancelled' && order.orderStatus !== 'delivered' && (
                                                        <button
                                                            onClick={() => updateStatus(order._id, 'cancelled')}
                                                            className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition"
                                                            title="إلغاء الطلب"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                    <Pagination currentPage={page} totalPages={pagination.totalPages} totalItems={pagination.total} onPageChange={setPage} />
                </>
            )}

            {/* Order Detail Modal */}
            <Modal open={!!selected} onClose={() => setSelected(null)} title={`تفاصيل الطلب #${selected?.invoiceNumber}`} size="lg">
                {selected && (
                    <div className="space-y-5" dir="rtl">
                        {/* Status */}
                        <div className="flex items-center gap-3">
                            <StatusBadge status={selected.orderStatus || 'pending'} />
                            {NEXT_STATUS[selected.orderStatus] && (
                                <button
                                    onClick={() => updateStatus(selected._id, NEXT_STATUS[selected.orderStatus])}
                                    disabled={updatingId === selected._id}
                                    className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    {updatingId === selected._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> تحديث إلى: {STATUS_CONFIG[NEXT_STATUS[selected.orderStatus]]?.label}</>}
                                </button>
                            )}
                        </div>

                        {/* Customer & Shipping */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                                <h4 className="font-bold text-xs text-gray-400 uppercase mb-3 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> بيانات العميل</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-400">الاسم</span><span className="font-bold">{selected.customer?.name}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-400">التليفون</span><span className="font-bold" dir="ltr">{selected.customer?.phone}</span></div>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                                <h4 className="font-bold text-xs text-gray-400 uppercase mb-3 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> بيانات التوصيل</h4>
                                {selected.shippingAddress ? (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span className="text-gray-400">المستلم</span><span className="font-bold">{selected.shippingAddress.fullName}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">التليفون</span><span className="font-bold" dir="ltr">{selected.shippingAddress.phone}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">المحافظة</span><span className="font-bold">{selected.shippingAddress.governorate} {selected.shippingAddress.city && `/ ${selected.shippingAddress.city}`}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400 flex-shrink-0">العنوان</span><span className="font-bold text-left max-w-[60%]">{selected.shippingAddress.address}</span></div>
                                        {selected.shippingAddress.notes && <div className="flex justify-between"><span className="text-gray-400">ملاحظات</span><span className="text-gray-600 dark:text-gray-400 text-left max-w-[60%]">{selected.shippingAddress.notes}</span></div>}
                                    </div>
                                ) : <p className="text-xs text-gray-400">لا توجد بيانات توصيل</p>}
                            </div>
                        </div>

                        {/* Items */}
                        <div>
                            <h4 className="font-bold text-xs text-gray-400 uppercase mb-3 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> المنتجات</h4>
                            <div className="space-y-2">
                                {selected.items?.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3">
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.productName || item.product?.name || '—'}</p>
                                            <p className="text-xs text-gray-400">الكمية: {item.quantity} × {fmt(item.unitPrice)} ج.م</p>
                                        </div>
                                        <p className="font-black text-primary-600">{fmt(item.totalPrice)} ج.م</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-gray-100 dark:border-gray-700 px-4">
                                <span className="font-bold text-gray-700 dark:text-gray-300">الإجمالي</span>
                                <span className="font-black text-xl text-primary-600">{fmt(selected.totalAmount)} ج.م</span>
                            </div>
                        </div>

                        {/* Notes */}
                        {selected.notes && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400">
                                <span className="font-bold">ملاحظات: </span>{selected.notes}
                            </div>
                        )}

                        {/* Electronic Signature */}
                        {selected.electronicSignature && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                                <h4 className="font-bold mb-1 flex items-center gap-2">التوقيع الإلكتروني الإلزامي (للشراء الآجل)</h4>
                                <p className="text-emerald-600 dark:text-emerald-500 text-xs mb-2">
                                    أقر العميل بصحة البيانات وبالموافقة على شروط الدفع الآجل بالتفويض التالي:
                                </p>
                                <p className="font-medium text-emerald-900 dark:text-emerald-100 font-mono text-base bg-white/60 dark:bg-black/20 px-4 py-2 rounded-lg text-center shadow-inner">
                                    {selected.electronicSignature}
                                </p>
                            </div>
                        )}

                        {/* Status History */}
                        {selected.orderStatusHistory?.length > 0 && (
                            <div>
                                <h4 className="font-bold text-xs text-gray-400 uppercase mb-3">سجل الحالة</h4>
                                <div className="space-y-2">
                                    {selected.orderStatusHistory.map((h, i) => (
                                        <div key={i} className="flex items-center gap-3 text-xs">
                                            <span className={`px-2 py-0.5 rounded-full font-bold ${STATUS_CONFIG[h.status]?.color || 'bg-gray-100 text-gray-600'}`}>{STATUS_CONFIG[h.status]?.label || h.status}</span>
                                            <span className="text-gray-400">{new Date(h.date).toLocaleString('ar-EG')}</span>
                                            {h.note && <span className="text-gray-500">— {h.note}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
