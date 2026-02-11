import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, Filter, Calendar, User, Activity,
  Shield, AlertCircle, CheckCircle, XCircle, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../store';
import { Input, Badge, Card, LoadingSpinner, EmptyState } from '../components/UI';
import Pagination from '../components/Pagination';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (actionFilter) params.action = actionFilter;
      if (resourceFilter) params.resource = resourceFilter;

      const res = await adminApi.getAuditLogs(params);
      setLogs(res.data.data || []);
      setPagination({
        totalPages: res.data.pagination?.pages || 1,
        total: res.data.pagination?.total || 0,
      });
    } catch (err) {
      toast.error('خطأ في تحميل السجلات');
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, resourceFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, actionFilter, resourceFilter]);

  const getActionIcon = (action) => {
    switch (action) {
      case 'create':
        return <CheckCircle className="w-4 h-4" />;
      case 'update':
        return <Activity className="w-4 h-4" />;
      case 'delete':
        return <XCircle className="w-4 h-4" />;
      case 'view':
        return <Eye className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'create':
        return 'success';
      case 'update':
        return 'info';
      case 'delete':
        return 'danger';
      case 'view':
        return 'gray';
      default:
        return 'warning';
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      create: 'إنشاء',
      update: 'تحديث',
      delete: 'حذف',
      view: 'عرض',
    };
    return labels[action] || action;
  };

  const getResourceLabel = (resource) => {
    const labels = {
      tenant: 'متجر',
      user: 'مستخدم',
      product: 'منتج',
      customer: 'عميل',
      invoice: 'فاتورة',
      supplier: 'مورد',
      expense: 'مصروف',
      settings: 'إعدادات',
    };
    return labels[resource] || resource;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold">سجلات النظام (Audit Logs)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pagination.total} سجل إجمالاً
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="بحث في السجلات..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">كل الإجراءات</option>
              <option value="create">إنشاء</option>
              <option value="update">تحديث</option>
              <option value="delete">حذف</option>
              <option value="view">عرض</option>
            </select>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">كل الموارد</option>
              <option value="tenant">متجر</option>
              <option value="user">مستخدم</option>
              <option value="product">منتج</option>
              <option value="customer">عميل</option>
              <option value="invoice">فاتورة</option>
              <option value="supplier">مورد</option>
              <option value="expense">مصروف</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="لا توجد سجلات"
          description="لم يتم تسجيل أي إجراءات بعد"
        />
      ) : (
        <Card>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.map((log) => (
              <div
                key={log._id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* User Avatar */}
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {log.user?.name?.charAt(0) || 'م'}
                  </div>

                  {/* Log Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm">
                        {log.user?.name || 'مستخدم محذوف'}
                      </h3>
                      <Badge variant={getActionColor(log.action)}>
                        <span className="flex items-center gap-1">
                          {getActionIcon(log.action)}
                          {getActionLabel(log.action)}
                        </span>
                      </Badge>
                      <Badge variant="gray">
                        {getResourceLabel(log.resource)}
                      </Badge>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {log.description || `${getActionLabel(log.action)} ${getResourceLabel(log.resource)}`}
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-500">
                      {log.user?.email && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="truncate">{log.user.email}</span>
                        </div>
                      )}
                      {log.tenant && (
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          <span className="truncate">{log.tenant.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(new Date(log.createdAt), 'dd MMM yyyy - hh:mm a', { locale: ar })}
                        </span>
                      </div>
                    </div>

                    {/* IP Address */}
                    {log.ipAddress && (
                      <div className="mt-2 text-xs text-gray-400">
                        IP: {log.ipAddress}
                      </div>
                    )}

                    {/* Details Object */}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-primary-500 cursor-pointer hover:text-primary-600">
                          عرض التفاصيل الكاملة
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
