import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Filter, Download, Search, Calendar } from 'lucide-react';
import { api, auditLogsApi, API_URL } from '../store';
import { Card, Input, Select, Button, Badge, LoadingSpinner, EmptyState } from '../components/UI';
import Pagination from '../components/Pagination';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const ACTION_COLORS = {
  create: 'success',
  update: 'warning',
  delete: 'danger',
  login: 'info',
  payment: 'primary',
  invoice: 'primary',
  stock_change: 'warning',
};

const ACTION_LABELS = {
  create: 'إنشاء',
  update: 'تعديل',
  delete: 'حذف',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
  payment: 'دفع',
  invoice: 'فاتورة',
  stock_change: 'تعديل مخزون',
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    user: '',
    startDate: '',
    endDate: '',
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 25,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)),
      };

      const res = await auditLogsApi.getLogs(params);
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)));
      window.open(`${API_URL}/admin/audit-logs/export?${params}`, '_blank');
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary-500" />
            سجل الأنشطة
          </h1>
          <p className="text-gray-500 text-sm mt-1">تتبع جميع العمليات في النظام</p>
        </div>
        <Button onClick={handleExport} variant="outline" icon={<Download className="w-4 h-4" />}>
          تصدير Excel
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select
              label="الإجراء"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              options={[
                { value: '', label: 'الكل' },
                ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <Input
              label="المورد"
              placeholder="مثال: product, customer"
              value={filters.resource}
              onChange={(e) => handleFilterChange('resource', e.target.value)}
            />
            <Input
              label="من تاريخ"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
            <Input
              label="إلى تاريخ"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="لا توجد سجلات"
            description="لم يتم العثور على أنشطة بالمعايير المحددة"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-medium">
                <tr>
                  <th className="p-4 text-right">التاريخ</th>
                  <th className="p-4 text-right">المستخدم</th>
                  <th className="p-4 text-right">الإجراء</th>
                  <th className="p-4 text-right">المورد</th>
                  <th className="p-4 text-right">التفاصيل</th>
                  <th className="p-4 text-right">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logs.map(log => (
                  <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4 text-xs text-gray-400">
                      {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm', { locale: ar })}
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{log.user?.name || 'نظام'}</div>
                      <div className="text-xs text-gray-400">{log.user?.email}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant={ACTION_COLORS[log.action] || 'gray'}>
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-xs">{log.resource}</td>
                    <td className="p-4 text-xs text-gray-500 max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="p-4 text-xs font-mono text-gray-400">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="p-4">
            <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
