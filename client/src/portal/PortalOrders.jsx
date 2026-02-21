import React, { useEffect, useState } from 'react';
import { usePortalStore } from '../store/portalStore';
import { Package, Clock, CheckCircle, Truck, XCircle, RotateCcw, ChevronLeft, X, ShoppingBag } from 'lucide-react';
import { notify } from '../components/AnimatedNotification';

const orderStatusConfig = {
    pending: { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    confirmed: { label: 'تم التأكيد', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
    processing: { label: 'جاري التجهيز', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Package },
    shipped: { label: 'في الشحن', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: Truck },
    delivered: { label: 'تم التوصيل', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

const paymentStatusConfig = {
    paid: { label: 'مدفوعة', color: 'text-green-600 dark:text-green-400' },
    partial: { label: 'جزئية', color: 'text-yellow-600 dark:text-yellow-400' },
    pending: { label: 'معلق', color: 'text-blue-600 dark:text-blue-400' },
    overdue: { label: 'متأخر', color: 'text-red-600 dark:text-red-400' },
};

const trackingSteps = [
    { key: 'pending', label: 'استلام الطلب' },
    { key: 'confirmed', label: 'تأكيد الطلب' },
    { key: 'processing', label: 'تجهيز الطلب' },
    { key: 'shipped', label: 'الشحن' },
    { key: 'delivered', label: 'التوصيل' },
];
const stepOrder = trackingSteps.map(s => s.key);

export default function PortalOrders() {
    const { fetchOrders, fetchOrderDetails, reorder, cancelOrder } = usePortalStore();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [reordering, setReordering] = useState(null);
    const [cancelling, setCancelling] = useState(null);

    useEffect(() => {
        loadOrders();
    }, [statusFilter]);

    const loadOrders = async () => {
        setLoading(true);
        const res = await fetchOrders(1, statusFilter);
        if (res) setOrders(res.orders || []);
        setLoading(false);
    };

    const openDetails = async (id) => {
        setDetailsLoading(true);
        const res = await fetchOrderDetails(id);
        if (res) setSelectedOrder(res);
        setDetailsLoading(false);
    };

    const handleReorder = async (id) => {
        setReordering(id);
        const res = await reorder(id);
        if (res.success) notify.success(res.message);
        else notify.error(res.message);
        setReordering(null);
    };

    const handleCancel = async (id) => {
        if (!window.confirm('هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟')) return;
        setCancelling(id);
        const res = await cancelOrder(id);
        if (res.success) {
            notify.success('تم إلغاء الطلب بنجاح');
            loadOrders();
        } else {
            notify.error(res.message);
        }
        setCancelling(null);
    };

    const filters = [
        { value: 'all', label: 'الكل' },
        { value: 'pending', label: 'قيد المراجعة' },
        { value: 'confirmed', label: 'مؤكدة' },
        { value: 'shipped', label: 'في الشحن' },
        { value: 'delivered', label: 'مُسلَّمة' },
        { value: 'cancelled', label: 'ملغية' },
    ];

    const getStepIndex = (status) => stepOrder.indexOf(status);

    return (
        <div className="space-y-4 pb-20" dir="rtl">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="w-6 h-6 text-primary-500" />
                    طلباتي
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">{orders.length} طلب</span>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {filters.map(f => (
                    <button
                        key={f.value}
                        onClick={() => setStatusFilter(f.value)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${statusFilter === f.value
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Orders */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingBag className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد طلبات</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => {
                        const ostatus = orderStatusConfig[order.orderStatus] || orderStatusConfig.pending;
                        const OIcon = ostatus.icon;
                        const currentStepIdx = getStepIndex(order.orderStatus);

                        return (
                            <div
                                key={order._id}
                                className="bg-white dark:bg-gray-800/80 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm"
                            >
                                {/* Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">طلب #{order.invoiceNumber}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {new Date(order.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${ostatus.color}`}>
                                        <OIcon className="w-3.5 h-3.5" />
                                        {ostatus.label}
                                    </span>
                                </div>

                                {/* Tracking Timeline (mini) */}
                                {order.orderStatus !== 'cancelled' && (
                                    <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                                        {trackingSteps.map((step, idx) => (
                                            <React.Fragment key={step.key}>
                                                <div className="flex flex-col items-center min-w-0">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${idx <= currentStepIdx
                                                        ? 'bg-primary-500 text-white'
                                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                                        }`}>
                                                        {idx < currentStepIdx ? '✓' : idx + 1}
                                                    </div>
                                                    <span className={`text-[9px] mt-0.5 whitespace-nowrap ${idx <= currentStepIdx ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-gray-400'}`}>
                                                        {step.label}
                                                    </span>
                                                </div>
                                                {idx < trackingSteps.length - 1 && (
                                                    <div className={`flex-1 h-0.5 mb-3 ${idx < currentStepIdx ? 'bg-primary-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}

                                {/* Price */}
                                <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 text-center text-xs mb-3">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 mb-0.5">الإجمالي</p>
                                        <p className="font-bold text-gray-900 dark:text-white">{order.totalAmount?.toLocaleString()}</p>
                                    </div>
                                    <div className="border-x border-gray-200 dark:border-gray-700">
                                        <p className="text-gray-500 dark:text-gray-400 mb-0.5">المدفوع</p>
                                        <p className="font-bold text-green-600 dark:text-green-400">{order.paidAmount?.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 mb-0.5">المتبقي</p>
                                        <p className="font-bold text-red-600 dark:text-red-400">{order.remainingAmount?.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openDetails(order._id)}
                                        className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition flex items-center justify-center gap-1"
                                    >
                                        التفاصيل <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    {(order.orderStatus === 'delivered' || order.status === 'paid') && (
                                        <button
                                            onClick={() => handleReorder(order._id)}
                                            disabled={reordering === order._id}
                                            className="flex-1 py-2 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition flex items-center justify-center gap-1 disabled:opacity-60"
                                        >
                                            {reordering === order._id ? (
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <><RotateCcw className="w-4 h-4" /> إعادة الطلب</>
                                            )}
                                        </button>
                                    )}
                                    {order.orderStatus === 'pending' && (
                                        <button
                                            onClick={() => handleCancel(order._id)}
                                            disabled={cancelling === order._id}
                                            className="flex-1 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition flex items-center justify-center gap-1 disabled:opacity-60"
                                        >
                                            {cancelling === order._id ? (
                                                <span className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                                            ) : (
                                                <><XCircle className="w-4 h-4" /> إلغاء الطلب</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Order Details Modal */}
            {(selectedOrder || detailsLoading) && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => !detailsLoading && setSelectedOrder(null)}>
                    <div
                        className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {detailsLoading ? (
                            <div className="flex justify-center py-20">
                                <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                            </div>
                        ) : selectedOrder && (
                            <>
                                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 flex justify-between items-center z-10">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">طلب #{selectedOrder.invoiceNumber}</h3>
                                    <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                                <div className="p-4 space-y-4">
                                    {/* Full Timeline */}
                                    {selectedOrder.orderStatus !== 'cancelled' && (
                                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                                            <h4 className="font-bold text-sm mb-3 text-gray-700 dark:text-gray-300">تتبع الطلب</h4>
                                            <div className="space-y-3">
                                                {trackingSteps.map((step, idx) => {
                                                    const currentIdx = getStepIndex(selectedOrder.orderStatus);
                                                    const isDone = idx <= currentIdx;
                                                    return (
                                                        <div key={step.key} className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isDone ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                                                                {isDone ? '✓' : idx + 1}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className={`text-sm font-bold ${isDone ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{step.label}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Items */}
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">المنتجات</h4>
                                        <div className="space-y-2">
                                            {selectedOrder.items?.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                                    {item.product?.images?.[0] && (
                                                        <img src={item.product.images[0]} alt={item.product.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.product?.name || item.productName}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">الكمية: {item.quantity} × {item.price?.toLocaleString()} ج.م</p>
                                                    </div>
                                                    <p className="font-bold text-sm text-primary-600">{item.total?.toLocaleString()} ج.م</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
