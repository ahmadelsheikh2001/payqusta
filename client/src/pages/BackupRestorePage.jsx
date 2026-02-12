import React, { useState, useEffect, useRef } from 'react';
import {
  Database, Download, Upload, Package, Users, FileText, Truck,
  Receipt, CheckCircle, AlertTriangle, Loader2, Shield,
  HardDrive, Clock, RefreshCw, Info, FileSpreadsheet,
} from 'lucide-react';
import { useThemeStore, api } from '../store';
import { Button } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

export default function BackupRestorePage() {
  const { dark } = useThemeStore();
  const fileInputRef = useRef(null);

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreResult, setRestoreResult] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const { data } = await api.get('/backup/stats');
      setStats(data.data);
    } catch (err) {
      notify.error('حدث خطأ في جلب الإحصائيات');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/backup/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `payqusta_backup_${date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notify.success('تم تصدير النسخة الاحتياطية بنجاح');
    } catch (err) {
      notify.error('حدث خطأ في التصدير');
    } finally {
      setExporting(false);
    }
  };

  const handleRestoreFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = selected.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      notify.warning('يرجى اختيار ملف Excel (.xlsx)');
      return;
    }

    setRestoreFile(selected);
    setShowRestoreConfirm(true);
    setRestoreResult(null);
  };

  const handleRestore = async () => {
    if (!restoreFile) return;

    setRestoring(true);
    setShowRestoreConfirm(false);
    try {
      const formData = new FormData();
      formData.append('file', restoreFile);

      const { data } = await api.post('/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRestoreResult(data.data);
      notify.success('تم استعادة البيانات بنجاح');
      fetchStats();
    } catch (err) {
      notify.error(err.response?.data?.message || 'حدث خطأ في الاستعادة');
    } finally {
      setRestoring(false);
      setRestoreFile(null);
    }
  };

  const dataIcons = {
    products: { icon: Package, color: 'blue', label: 'المنتجات' },
    customers: { icon: Users, color: 'emerald', label: 'العملاء' },
    invoices: { icon: FileText, color: 'purple', label: 'الفواتير' },
    suppliers: { icon: Truck, color: 'amber', label: 'الموردين' },
    expenses: { icon: Receipt, color: 'red', label: 'المصروفات' },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">النسخ الاحتياطي والاستعادة</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">تصدير واستعادة بيانات المتجر</p>
        </div>
      </div>

      {/* Data Stats */}
      <div className={`rounded-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-2 mb-5">
          <HardDrive className="w-5 h-5 text-teal-500" />
          <h3 className="text-lg font-bold">بيانات المتجر الحالية</h3>
          <button onClick={fetchStats} className="mr-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loadingStats ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingStats ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {Object.entries(dataIcons).map(([key, { icon: Icon, color, label }]) => {
              const colorClasses = {
                blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
                emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
                amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
                red: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
              };

              return (
                <div key={key} className={`text-center p-4 rounded-xl ${dark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                  <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold">{stats?.[key] ?? 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className={`rounded-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-bold">تصدير نسخة احتياطية</h3>
        </div>

        <div className={`rounded-xl p-4 mb-5 ${dark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
          <div className="flex gap-2 text-sm">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">سيتم تصدير جميع البيانات في ملف Excel واحد يحتوي على:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5 text-blue-600 dark:text-blue-400">
                <li>المنتجات (الاسم، SKU، الأسعار، المخزون، التصنيف)</li>
                <li>العملاء (الاسم، الهاتف، البريد، الرصيد)</li>
                <li>الفواتير (الرقم، العميل، المبلغ، الحالة)</li>
                <li>الموردين (الاسم، الهاتف، الرصيد المستحق)</li>
                <li>المصروفات (الوصف، المبلغ، التصنيف، التاريخ)</li>
              </ul>
            </div>
          </div>
        </div>

        <Button
          icon={<Download className="w-4 h-4" />}
          loading={exporting}
          onClick={handleExport}
          className="w-full sm:w-auto"
        >
          تحميل النسخة الاحتياطية (Excel)
        </Button>
      </div>

      {/* Restore Section */}
      <div className={`rounded-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-bold">استعادة من نسخة احتياطية</h3>
        </div>

        <div className={`rounded-xl p-4 mb-5 ${dark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
          <div className="flex gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-amber-700 dark:text-amber-300">
              <p className="font-medium">تحذير هام:</p>
              <p className="text-xs mt-1">عملية الاستعادة ستضيف البيانات من ملف النسخة الاحتياطية. البيانات المكررة سيتم تخطيها تلقائياً.</p>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleRestoreFileSelect}
        />

        <Button
          variant="warning"
          icon={restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          disabled={restoring}
          onClick={() => fileInputRef.current?.click()}
          className="w-full sm:w-auto"
        >
          {restoring ? 'جاري الاستعادة...' : 'اختيار ملف النسخة الاحتياطية'}
        </Button>
      </div>

      {/* Restore Confirm Modal */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowRestoreConfirm(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`relative w-full max-w-md rounded-2xl p-6 shadow-2xl ${dark ? 'bg-gray-900' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold mb-1">تأكيد الاستعادة</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                هل أنت متأكد من استعادة البيانات من الملف: <br />
                <span className="font-medium text-gray-700 dark:text-gray-300">{restoreFile?.name}</span>
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="ghost" onClick={() => { setShowRestoreConfirm(false); setRestoreFile(null); }}>
                إلغاء
              </Button>
              <Button variant="warning" onClick={handleRestore} icon={<Upload className="w-4 h-4" />}>
                تأكيد الاستعادة
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Result */}
      {restoreResult && (
        <div className={`rounded-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold mb-1">تمت الاستعادة بنجاح!</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Object.entries(restoreResult).map(([key, val]) => {
              const info = dataIcons[key];
              if (!info) return null;
              return (
                <div key={key} className={`text-center p-3 rounded-xl ${dark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                  <p className="text-xl font-bold text-emerald-500">{val?.imported || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{info.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
