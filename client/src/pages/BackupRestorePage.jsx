import React, { useState, useEffect, useRef } from 'react';
import {
  Database, Download, Upload, Package, Users, FileText, Truck,
  Receipt, CheckCircle, AlertTriangle, Loader2, Shield,
  HardDrive, RefreshCw, Info, FileSpreadsheet, FileJson,
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
  const [exportFormat, setExportFormat] = useState('json'); // 'json' or 'excel'
  const [restoreFormat, setRestoreFormat] = useState('json'); // 'json' or 'excel'

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
      if (exportFormat === 'json') {
        const response = await api.get('/backup/export-json', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `PayQusta_Backup_${date}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        notify.success('تم تصدير النسخة الاحتياطية JSON بنجاح');
      } else {
        const response = await api.get('/backup/export', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `PayQusta_Backup_${date}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        notify.success('تم تصدير النسخة الاحتياطية Excel بنجاح');
      }
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

    if (restoreFormat === 'json') {
      if (ext !== 'json') {
        notify.warning('يرجى اختيار ملف JSON (.json)');
        return;
      }
    } else {
      if (!['xlsx', 'xls'].includes(ext)) {
        notify.warning('يرجى اختيار ملف Excel (.xlsx)');
        return;
      }
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

      const endpoint = restoreFormat === 'json' ? '/backup/restore-json' : '/backup/restore';
      const { data } = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRestoreResult(data.data);
      notify.success(data.message || 'تم استعادة البيانات بنجاح');
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

  const FormatToggle = ({ value, onChange }) => (
    <div className={`inline-flex rounded-xl p-1 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
      <button
        onClick={() => onChange('json')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          value === 'json'
            ? 'bg-teal-500 text-white shadow-sm'
            : dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <FileJson className="w-4 h-4" />
        JSON
      </button>
      <button
        onClick={() => onChange('excel')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          value === 'excel'
            ? 'bg-teal-500 text-white shadow-sm'
            : dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <FileSpreadsheet className="w-4 h-4" />
        Excel
      </button>
    </div>
  );

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold">تصدير نسخة احتياطية</h3>
          </div>
          <FormatToggle value={exportFormat} onChange={setExportFormat} />
        </div>

        <div className={`rounded-xl p-4 mb-5 ${dark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
          <div className="flex gap-2 text-sm">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-blue-700 dark:text-blue-300">
              {exportFormat === 'json' ? (
                <>
                  <p className="font-medium mb-1">نسخة احتياطية كاملة بصيغة JSON تحتوي على:</p>
                  <ul className="list-disc list-inside text-xs space-y-0.5 text-blue-600 dark:text-blue-400">
                    <li>جميع البيانات بالكامل مع كل التفاصيل (بيانات مالية، أقساط، إلخ)</li>
                    <li>المنتجات، العملاء، الفواتير، الموردين، المصروفات</li>
                    <li>مناسب للاستعادة الكاملة ونقل البيانات بين الأجهزة</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="font-medium mb-1">سيتم تصدير البيانات في ملف Excel يحتوي على:</p>
                  <ul className="list-disc list-inside text-xs space-y-0.5 text-blue-600 dark:text-blue-400">
                    <li>المنتجات (الاسم، SKU، الأسعار، المخزون، التصنيف)</li>
                    <li>العملاء (الاسم، الهاتف، البريد، الرصيد)</li>
                    <li>الفواتير (الرقم، العميل، المبلغ، الحالة)</li>
                    <li>الموردين (الاسم، الهاتف، الرصيد المستحق)</li>
                    <li>المصروفات (الوصف، المبلغ، التصنيف، التاريخ)</li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            icon={<Download className="w-4 h-4" />}
            loading={exporting}
            onClick={handleExport}
            className="w-full sm:w-auto"
          >
            {exportFormat === 'json' ? 'تحميل النسخة الاحتياطية (JSON)' : 'تحميل النسخة الاحتياطية (Excel)'}
          </Button>
          {exportFormat === 'json' && (
            <span className={`text-xs px-2 py-1 rounded-full ${dark ? 'bg-teal-500/10 text-teal-400' : 'bg-teal-50 text-teal-600'}`}>
              موصى به
            </span>
          )}
        </div>
      </div>

      {/* Restore Section */}
      <div className={`rounded-2xl border p-6 ${dark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold">استعادة من نسخة احتياطية</h3>
          </div>
          <FormatToggle value={restoreFormat} onChange={setRestoreFormat} />
        </div>

        <div className={`rounded-xl p-4 mb-5 ${dark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
          <div className="flex gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-amber-700 dark:text-amber-300">
              <p className="font-medium">تحذير هام:</p>
              <p className="text-xs mt-1">
                {restoreFormat === 'json'
                  ? 'عملية الاستعادة ستضيف البيانات من ملف JSON. البيانات المكررة سيتم تخطيها تلقائياً (بناءً على الاسم / الهاتف / رقم الفاتورة).'
                  : 'عملية الاستعادة ستضيف البيانات من ملف النسخة الاحتياطية. البيانات المكررة سيتم تخطيها تلقائياً.'}
              </p>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={restoreFormat === 'json' ? '.json' : '.xlsx,.xls'}
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
          {restoring
            ? 'جاري الاستعادة...'
            : restoreFormat === 'json'
              ? 'اختيار ملف النسخة الاحتياطية (JSON)'
              : 'اختيار ملف النسخة الاحتياطية (Excel)'}
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
            {restoreResult.totalImported !== undefined && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                تم استيراد {restoreResult.totalImported} سجل — تم تخطي {restoreResult.totalSkipped} مكرر
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Object.entries(dataIcons).map(([key, { icon: Icon, color, label }]) => {
              const val = restoreResult[key];
              if (!val && val !== 0) return null;
              const imported = typeof val === 'object' ? val.imported : val;
              const skipped = typeof val === 'object' ? val.skipped : 0;

              return (
                <div key={key} className={`text-center p-3 rounded-xl ${dark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                  <p className="text-xl font-bold text-emerald-500">{imported || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                  {skipped > 0 && (
                    <p className="text-[10px] text-amber-500 mt-0.5">({skipped} مكرر)</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
