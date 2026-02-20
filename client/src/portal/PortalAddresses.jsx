import React, { useEffect, useState } from 'react';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { MapPin, Plus, Edit2, Trash2, X, Check, Home, Briefcase } from 'lucide-react';
import { notify } from '../components/AnimatedNotification';

export default function PortalAddresses() {
    const { fetchAddresses, addAddress, updateAddress, deleteAddress } = usePortalStore();
    const { dark } = useThemeStore();

    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        label: 'المنزل',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        isDefault: false
    });
    const [submitLoading, setSubmitLoading] = useState(false);

    useEffect(() => {
        loadAddresses();
    }, []);

    const loadAddresses = async () => {
        setLoading(true);
        const data = await fetchAddresses();
        setAddresses(data || []);
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);

        let res;
        if (editingId) {
            res = await updateAddress(editingId, formData);
        } else {
            res = await addAddress(formData);
        }

        if (res.success) {
            notify.success(editngId ? 'تم تحديث العنوان بنجاح' : 'تم إضافة العنوان بنجاح');
            setAddresses(res.addresses);
            setModalOpen(false);
            resetForm();
        } else {
            notify.error(res.message);
        }
        setSubmitLoading(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('هل أنت متأكد من حذف هذا العنوان؟')) {
            const res = await deleteAddress(id);
            if (res.success) {
                notify.success('تم حذف العنوان');
                setAddresses(res.addresses);
            } else {
                notify.error(res.message);
            }
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            label: 'المنزل',
            street: '',
            city: '',
            state: '',
            zipCode: '',
            isDefault: false
        });
    };

    const openEdit = (addr) => {
        setEditingId(addr._id);
        setFormData({
            label: addr.label || 'المنزل',
            street: addr.street,
            city: addr.city,
            state: addr.state || '',
            zipCode: addr.zipCode || '',
            isDefault: addr.isDefault || false
        });
        setModalOpen(true);
    };

    return (
        <div className="space-y-6 pb-20" dir="rtl">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-primary-500" />
                        دفتر العناوين
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        إدارة عناوين التوصيل الخاصة بك.
                    </p>
                </div>
                <button
                    onClick={() => { resetForm(); setModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl font-bold text-sm hover:bg-primary-600 transition shadow-lg shadow-primary-500/20"
                >
                    <Plus className="w-4 h-4" />
                    إضافة عنوان
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                </div>
            ) : addresses.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MapPin className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد عناوين محفوظة</p>
                    <button
                        onClick={() => { resetForm(); setModalOpen(true); }}
                        className="inline-block mt-4 px-6 py-2 bg-primary-500 text-white rounded-xl font-bold text-sm hover:bg-primary-600 transition"
                    >
                        إضافة عنوان جديد
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                        <div key={addr._id} className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border transition ${addr.isDefault ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-100 dark:border-gray-700'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center">
                                        {addr.label === 'العمل' ? <Briefcase className="w-5 h-5 text-gray-400" /> : <Home className="w-5 h-5 text-gray-400" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{addr.label}</h4>
                                        {addr.isDefault && (
                                            <span className="text-[10px] bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-0.5 rounded-full font-bold">
                                                افتراضي
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openEdit(addr)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(addr._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 pr-12">
                                <p>{addr.street}</p>
                                <p>{addr.city} {addr.state && `، ${addr.state}`}</p>
                                {addr.zipCode && <p className="text-gray-400 text-xs">الرمز البريدي: {addr.zipCode}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-primary-500" />
                                {editingId ? 'تعديل عنوان' : 'إضافة عنوان جديد'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">تسمية العنوان</label>
                                <input
                                    type="text"
                                    value={formData.label}
                                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                    placeholder="المنزل، العمل..."
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">العنوان بالتفصيل</label>
                                <input
                                    type="text"
                                    value={formData.street}
                                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                    placeholder="اسم الشارع، رقم المبنى..."
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">المدينة</label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">المحافظة / المنطقة</label>
                                    <input
                                        type="text"
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isDefault}
                                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                        className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">تعيين كعنوان افتراضي</span>
                                </label>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={submitLoading}
                                    className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary-500/20 disabled:opacity-50"
                                >
                                    {submitLoading ? 'جاري الحفظ...' : (editingId ? 'تحديث العنوان' : 'إضافة العنوان')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
