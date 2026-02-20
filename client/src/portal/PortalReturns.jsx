import React, { useEffect, useState } from 'react';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { RefreshCcw, CheckCircle, Clock, XCircle, ChevronLeft, Package, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PortalReturns() {
    const { fetchReturnRequests, loading } = usePortalStore();
    const { dark } = useThemeStore();
    const [requests, setRequests] = useState([]);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        const data = await fetchReturnRequests();
        setRequests(data || []);
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'approved': return { label: 'تمت الموافقة', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle };
            case 'rejected': return { label: 'مرفوض', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle };
            case 'completed': return { label: 'مكتمل', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle };
            default: return { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock };
        }
    };

    return (
        <div className="space-y-6 pb-20" dir="rtl">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <RefreshCcw className="w-6 h-6 text-primary-500" />
                    طلبات الإرجاع والاستبدال
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    متابعة حالة طلبات الإرجاع الخاصة بك.
                    يمكنك تقديم طلب إرجاع من صفحة <Link to="/portal/invoices" className="text-primary-500 underline">الفواتير</Link>.
                </p>
            </div>

            {loading && requests.length === 0 ? (
                <div className="flex justify-center py-16">
                    <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <RefreshCcw className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد طلبات إرجاع سابقة</p>
                    <Link to="/portal/invoices" className="inline-block mt-4 px-6 py-2 bg-primary-500 text-white rounded-xl font-bold text-sm hover:bg-primary-600 transition">
                        استعراض الفواتير
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => {
                        const status = getStatusConfig(req.status);
                        const StatusIcon = status.icon;

                        return (
                            <div key={req._id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center">
                                            <Package className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                                                {req.product?.name || 'منتج غير معروف'}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                الكمية: {req.quantity} • فاتورة #{req.invoice?.invoiceNumber}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${status.color}`}>
                                        <StatusIcon className="w-3 h-3" />
                                        {status.label}
                                    </span>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 text-xs space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">تاريخ الطلب:</span>
                                        <span className="font-bold text-gray-700 dark:text-gray-300">
                                            {new Date(req.createdAt).toLocaleDateString('ar-EG')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">السبب:</span>
                                        <span className="font-bold text-gray-700 dark:text-gray-300">
                                            {req.reason === 'defective' ? 'عيوب صناعة' :
                                                req.reason === 'wrong_item' ? 'منتج خاطئ' :
                                                    req.reason === 'changed_mind' ? 'تغير الرأي' : 'أخرى'}
                                        </span>
                                    </div>
                                    {req.adminNotes && (
                                        <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                                            <span className="block text-gray-500 dark:text-gray-400 mb-1">ملاحظات المتجر:</span>
                                            <p className="text-gray-700 dark:text-gray-300">{req.adminNotes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
