import React, { useEffect, useState } from 'react';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import { FileText, Upload, Trash2, CheckCircle, Clock, XCircle, AlertCircle, Eye, Shield } from 'lucide-react';
import { notify } from '../components/AnimatedNotification';

const docTypes = [
    { id: 'national_id', label: 'بطاقة الهوية الوطنية', required: true },
    { id: 'passport', label: 'جواز السفر', required: false },
    { id: 'utility_bill', label: 'إيصال مرافق (كهرباء/مياه)', required: false },
    { id: 'contract', label: 'عقد إيجار/تمليك', required: false },
    { id: 'other', label: 'مستندات أخرى', required: false },
];

export default function PortalDocuments() {
    const { fetchDocuments, uploadDocument, deleteDocument, loading } = usePortalStore();
    const { dark } = useThemeStore();
    const [documents, setDocuments] = useState([]);
    const [uploadingType, setUploadingType] = useState(null);

    useEffect(() => {
        loadDocs();
    }, []);

    const loadDocs = async () => {
        const docs = await fetchDocuments();
        setDocuments(docs || []);
    };

    const handleUpload = async (type, e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            notify.error('حجم الملف يجب أن يكون أقل من 5 ميجابايت');
            return;
        }

        setUploadingType(type);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const res = await uploadDocument(type, reader.result);
            if (res.success) {
                notify.success('تم رفع المستند بنجاح');
                setDocuments(res.documents);
            } else {
                notify.error(res.message);
            }
            setUploadingType(null);
        };
        reader.readAsDataURL(file);
    };

    const handleDelete = async (id) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المستند؟')) {
            const res = await deleteDocument(id);
            if (res.success) {
                notify.success('تم حذف المستند');
                setDocuments(res.documents);
            } else {
                notify.error(res.message);
            }
        }
    };

    return (
        <div className="space-y-6 pb-20" dir="rtl">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-6 h-6 text-primary-500" />
                    التوثيق والمستندات
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    قم برفع المستندات المطلوبة لتفعيل حسابك وزيادة الحد الائتماني.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {docTypes.map((type) => {
                    const uploadedDoc = documents.find(d => d.type === type.id && d.status !== 'rejected');
                    const rejectedDoc = documents.find(d => d.type === type.id && d.status === 'rejected'); // Show rejection history if needed, or just allow re-upload

                    // If currently has an active doc (pending/approved), show it.
                    // If rejected, show upload form again but maybe with a warning? 
                    // Actually, let's just show the active one. If rejected, it's treated as "not uploaded" but we can show the last rejection message.

                    const currentDoc = uploadedDoc || rejectedDoc;
                    const isRejected = currentDoc?.status === 'rejected';
                    const isUploaded = !!uploadedDoc;

                    return (
                        <div key={type.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isUploaded
                                            ? currentDoc.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                            : isRejected ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                                            {type.label}
                                            {type.required && <span className="text-red-500 mr-1">*</span>}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {isUploaded
                                                ? (currentDoc.status === 'approved' ? 'تم التوثيق' : 'قيد المراجعة')
                                                : isRejected ? 'مرفوض - يرجى إعادة الرفع' : 'لم يتم الرفع'}
                                        </p>
                                    </div>
                                </div>

                                {isUploaded && (
                                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${currentDoc.status === 'approved'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        }`}>
                                        {currentDoc.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                        {currentDoc.status === 'approved' ? 'مقبول' : 'قيد المراجعة'}
                                    </div>
                                )}
                            </div>

                            {isRejected && (
                                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl mb-4 flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block mb-1">سبب الرفض:</span>
                                        {currentDoc.rejectionReason || 'الملف غير واضح أو غير صالح'}
                                    </div>
                                </div>
                            )}

                            {isUploaded ? (
                                <div className="flex items-center gap-2">
                                    <a
                                        href={currentDoc.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                                    >
                                        <Eye className="w-4 h-4" />
                                        عرض المستند
                                    </a>
                                    {currentDoc.status === 'pending' && (
                                        <button
                                            onClick={() => handleDelete(currentDoc._id)}
                                            className="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl flex items-center justify-center transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <label className={`block w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition group ${uploadingType === type.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        className="hidden"
                                        onChange={(e) => handleUpload(type.id, e)}
                                    />
                                    {uploadingType === type.id ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-xs text-primary-500 font-bold">جاري الرفع...</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 group-hover:text-primary-600">
                                            <Upload className="w-6 h-6" />
                                            <span className="text-xs font-bold">اضغط لرفع الملف</span>
                                            <span className="text-[10px] text-gray-400">PDF, JPG, PNG (Max 5MB)</span>
                                        </div>
                                    )}
                                </label>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
