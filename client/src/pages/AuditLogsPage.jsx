import React, { useState, useEffect } from 'react';
import { adminApi } from '../store';
import { Card, Badge, LoadingSpinner, Button } from '../components/UI';
import { Shield, User, Clock, Search, Activity, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // We can also have aggregation stats here if the API provides it
  // For now, simple list

  useEffect(() => {
    fetchLogs();
  }, [page, filter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Assuming GET /admin/audit-logs accepts page, limit, sort, search
      const { data } = await adminApi.getAuditLogs({ 
        page, 
        limit: 20, 
        sort: '-createdAt',
        search: filter 
      });
      setLogs(data.data);
      setTotalPages(Math.ceil(data.total / 20));
    } catch (error) {
      toast.error('فشل تحميل السجلات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const ACTION_COLORS = {
    'create': 'green',
    'update': 'blue',
    'delete': 'red',
    'login': 'purple',
    'logout': 'gray',
    'import': 'orange',
  };

  const getActionColor = (action) => {
    const key = Object.keys(ACTION_COLORS).find(k => action.toLowerCase().includes(k));
    return ACTION_COLORS[key] || 'gray';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('ar-EG', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">سجلات النظام (Audit Logs)</h1>
            <p className="text-sm text-gray-500">تتبع نشاط المستخدمين والعمليات الحساسة</p>
          </div>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-2 border border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="بحث في السجلات..." 
            className="bg-transparent border-none outline-none w-full text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : (
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>لا توجد سجلات مطابقة</p>
            </div>
          ) : (
            logs.map((log) => (
              <Card key={log._id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 w-2 h-2 rounded-full bg-${getActionColor(log.action)}-500`} />
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* User Info */}
                    <div className="col-span-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold uppercase">
                          {log.user?.name?.substring(0, 2) || '??'}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{log.user?.name || 'مستخدم محذوف'}</p>
                          <p className="text-[10px] text-gray-400">{log.user?.role || 'User'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action & Resource */}
                    <div className="col-span-1 md:col-span-2">
                       <div className="flex flex-col">
                         <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                           {log.action} <span className="text-gray-400">on</span> {log.resource}
                         </span>
                         {log.details && (
                           <span className="text-xs text-gray-500 font-mono mt-1 w-full truncate">
                             {JSON.stringify(log.details)}
                           </span>
                         )}
                       </div>
                    </div>

                    {/* Meta (IP & Time) */}
                    <div className="col-span-1 text-left">
                       <div className="flex flex-col items-end gap-1">
                         <Badge variant="neutral" className="gap-1">
                           <Clock className="w-3 h-3" /> {formatDate(log.createdAt)}
                         </Badge>
                         {log.ipAddress && (
                           <span className="text-[10px] text-gray-400 font-mono">IP: {log.ipAddress}</span>
                         )}
                       </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}

          {/* Pagination */}
          <div className="flex justify-center gap-2 mt-6">
            <Button 
              variant="outline" 
              disabled={page === 1} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              السابق
            </Button>
            <span className="flex items-center px-4 font-bold text-sm">
              صفحة {page} من {totalPages}
            </span>
            <Button 
              variant="outline" 
              disabled={page === totalPages} 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              التالي
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
