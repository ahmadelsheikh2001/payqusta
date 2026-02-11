import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Search, Edit2, Trash2, CheckCircle,
  XCircle, Calendar, Users, CreditCard, Crown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notify } from '../components/AnimatedNotification';
import { adminApi } from '../store';
import { Button, Input, Modal, Badge, Card, LoadingSpinner, EmptyState } from '../components/UI';
import Pagination from '../components/Pagination';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerPassword: '',
    plan: 'free',
  });

  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await adminApi.getTenants(params);
      setTenants(res.data.data || []);
      setPagination({
        totalPages: res.data.pagination?.pages || 1,
        total: res.data.pagination?.total || 0,
      });
    } catch (err) {
      toast.error('خطأ في تحميل المتاجر');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const openAdd = () => {
    setEditId(null);
    setForm({
      name: '',
      ownerName: '',
      ownerEmail: '',
      ownerPhone: '',
      ownerPassword: '',
      plan: 'free',
    });
    setShowModal(true);
  };

  const openEdit = (tenant) => {
    setEditId(tenant._id);
    setForm({
      name: tenant.name,
      isActive: tenant.isActive,
      subscription: tenant.subscription,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (editId) {
      // Update existing tenant
      if (!form.name) return toast.error('الاسم مطلوب');
      setSaving(true);
      try {
        await adminApi.updateTenant(editId, {
          name: form.name,
          isActive: form.isActive,
          subscription: form.subscription,
        });
        toast.success('تم تحديث المتجر ✅');
        setShowModal(false);
        load();
      } catch (err) {
        toast.error(err.response?.data?.message || 'حدث خطأ');
      } finally {
        setSaving(false);
      }
    } else {
      // Create new tenant
      if (!form.name || !form.ownerName || !form.ownerEmail || !form.ownerPhone) {
        return toast.error('جميع الحقول مطلوبة');
      }
      setSaving(true);
      try {
        await adminApi.createTenant(form);
        toast.success('تم إنشاء المتجر بنجاح ✅');
        setShowModal(false);
        load();
      } catch (err) {
        toast.error(err.response?.data?.message || 'حدث خطأ');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDelete = async (id) => {
    notify.custom({
      type: 'error',
      title: 'تأكيد تعطيل المتجر',
      message: 'هل أنت متأكد من تعطيل هذا المتجر؟ سيتم تعطيل جميع المستخدمين أيضاً. هذا إجراء خطير!',
      duration: 15000,
      action: {
        label: 'تأكيد التعطيل',
        onClick: async () => {
          try {
            await adminApi.deleteTenant(id);
            notify.success('تم تعطيل المتجر وجميع المستخدمين', 'تم التعطيل');
            load();
          } catch (err) {
            notify.error(err.response?.data?.message || 'فشل تعطيل المتجر', 'حدث خطأ');
          }
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">إدارة المتاجر</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pagination.total} متجر إجمالاً
            </p>
          </div>
        </div>
        <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>
          إضافة متجر جديد
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="بحث عن متجر..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">معطل</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tenants Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : tenants.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="لا توجد متاجر"
          description="ابدأ بإضافة متجر جديد"
          action={<Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>إضافة متجر</Button>}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-right p-4 text-sm font-bold text-gray-500 dark:text-gray-400">المتجر</th>
                  <th className="text-right p-4 text-sm font-bold text-gray-500 dark:text-gray-400">المالك</th>
                  <th className="text-right p-4 text-sm font-bold text-gray-500 dark:text-gray-400">الباقة</th>
                  <th className="text-right p-4 text-sm font-bold text-gray-500 dark:text-gray-400">الحالة</th>
                  <th className="text-right p-4 text-sm font-bold text-gray-500 dark:text-gray-400">تاريخ الإنشاء</th>
                  <th className="text-center p-4 text-sm font-bold text-gray-500 dark:text-gray-400">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr
                    key={tenant._id}
                    className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {tenant.name?.charAt(0) || 'م'}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{tenant.name}</p>
                          <p className="text-xs text-gray-400">{tenant.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {tenant.owner ? (
                        <div>
                          <p className="text-sm font-medium">{tenant.owner.name}</p>
                          <p className="text-xs text-gray-400">{tenant.owner.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={
                        tenant.subscription?.plan === 'professional' ? 'primary' :
                        tenant.subscription?.plan === 'basic' ? 'info' :
                        'gray'
                      }>
                        {tenant.subscription?.plan || 'free'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={tenant.isActive ? 'success' : 'danger'}>
                        {tenant.isActive ? 'نشط' : 'معطل'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(tenant.createdAt), 'dd MMM yyyy', { locale: ar })}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(tenant)}
                          className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 text-primary-500 transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {tenant.isActive && (
                          <button
                            onClick={() => handleDelete(tenant._id)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors"
                            title="تعطيل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal
          title={editId ? 'تعديل المتجر' : 'إضافة متجر جديد'}
          onClose={() => setShowModal(false)}
          size="lg"
        >
          <div className="space-y-4">
            {editId ? (
              // Edit Mode
              <>
                <div>
                  <label className="block text-sm font-bold mb-2">اسم المتجر</label>
                  <Input
                    placeholder="اسم المتجر"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">الحالة</label>
                  <select
                    value={form.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">معطل</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">الباقة</label>
                  <select
                    value={form.subscription?.plan || 'free'}
                    onChange={(e) => setForm({
                      ...form,
                      subscription: { ...form.subscription, plan: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  >
                    <option value="free">مجاني</option>
                    <option value="basic">أساسي</option>
                    <option value="professional">احترافي</option>
                    <option value="enterprise">مؤسسي</option>
                  </select>
                </div>
              </>
            ) : (
              // Create Mode
              <>
                <div>
                  <label className="block text-sm font-bold mb-2">اسم المتجر *</label>
                  <Input
                    placeholder="إلكترونيات المعادي"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">اسم المالك *</label>
                    <Input
                      placeholder="محمد أحمد"
                      value={form.ownerName}
                      onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">هاتف المالك *</label>
                    <Input
                      placeholder="01012345678"
                      value={form.ownerPhone}
                      onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">بريد المالك *</label>
                  <Input
                    type="email"
                    placeholder="vendor@example.com"
                    value={form.ownerEmail}
                    onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">كلمة المرور</label>
                  <Input
                    type="password"
                    placeholder="اتركه فارغاً لاستخدام 123456"
                    value={form.ownerPassword}
                    onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                  />
                  <p className="text-xs text-gray-400 mt-1">افتراضياً: 123456</p>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">الباقة</label>
                  <select
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  >
                    <option value="free">مجاني</option>
                    <option value="basic">أساسي</option>
                    <option value="professional">احترافي</option>
                    <option value="enterprise">مؤسسي</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} loading={saving} className="flex-1">
                {editId ? 'حفظ التعديلات' : 'إنشاء المتجر'}
              </Button>
              <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">
                إلغاء
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
