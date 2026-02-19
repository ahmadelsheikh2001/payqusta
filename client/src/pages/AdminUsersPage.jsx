import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, Edit2, Trash2, Building2,
  Mail, Phone, Shield, CheckCircle, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notify } from '../components/AnimatedNotification';
import { adminApi } from '../store';
import { Button, Input, Modal, Badge, Card, LoadingSpinner, EmptyState } from '../components/UI';
import Pagination from '../components/Pagination';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

import { useAuthStore } from '../store';

export default function AdminUsersPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.isSuperAdmin;
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'vendor',
    tenantId: '',
  });

  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (tenantFilter) params.tenant = tenantFilter;

      const res = await adminApi.getUsers(params);
      setUsers(res.data.data || []);
      setPagination({
        totalPages: res.data.pagination?.pages || 1,
        total: res.data.pagination?.total || 0,
      });
    } catch (err) {
      toast.error('خطأ في تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, tenantFilter]);

  const loadTenants = async () => {
    try {
      const res = await adminApi.getTenants({ limit: 1000 });
      setTenants(res.data.data || []);
    } catch (err) {
      console.error('Error loading tenants:', err);
    }
  };

  const loadBranches = async () => {
    if (isSuperAdmin) return;
    try {
      const res = await useAuthStore.getState().getBranches();
      setBranches(res || []);
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  useEffect(() => {
    load();
    if (isSuperAdmin) {
      loadTenants();
    } else {
      loadBranches();
    }
  }, [load, isSuperAdmin]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, tenantFilter]);

  const openAdd = () => {
    setEditId(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'vendor',
      tenantId: isSuperAdmin ? '' : user.tenant._id,
      branch: '',
    });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditId(user._id);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      branch: user.branch?._id || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (editId) {
      // Update existing user
      if (!form.name || !form.email) return toast.error('الاسم والبريد مطلوبان');
      setSaving(true);
      try {
        await adminApi.updateUser(editId, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          isActive: form.isActive,
          branch: form.branch || null,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success('تم تحديث المستخدم ✅');
        setShowModal(false);
        load();
      } catch (err) {
        toast.error(err.response?.data?.message || 'حدث خطأ');
      } finally {
        setSaving(false);
      }
    } else {
      // Create new user
      if (!form.name || !form.email || !form.phone || (isSuperAdmin && !form.tenantId)) {
        return toast.error('جميع الحقول مطلوبة');
      }
      setSaving(true);
      try {
        await adminApi.createUser({
          ...form,
          tenantId: isSuperAdmin ? form.tenantId : user.tenant._id, // Ensure tenantId is sent
        });
        toast.success('تم إنشاء المستخدم بنجاح ✅');
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
      title: 'تأكيد تعطيل المستخدم',
      message: 'هل أنت متأكد من تعطيل هذا المستخدم؟ لن يتمكن من تسجيل الدخول.',
      duration: 10000,
      action: {
        label: 'تأكيد التعطيل',
        onClick: async () => {
          try {
            await adminApi.deleteUser(id);
            notify.success('تم تعطيل المستخدم بنجاح', 'تم التعطيل');
            load();
          } catch (err) {
            notify.error(err.response?.data?.message || 'فشل تعطيل المستخدم', 'حدث خطأ');
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">إدارة المستخدمين</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pagination.total} مستخدم إجمالاً
            </p>
          </div>
        </div>
        <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>
          إضافة مستخدم جديد
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="بحث عن مستخدم..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">كل الأدوار</option>
              <option value="admin">Admin</option>
              <option value="vendor">Vendor</option>
              <option value="coordinator">Coordinator</option>
            </select>
            {isSuperAdmin && (
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">كل المتاجر</option>
                {tenants.map((tenant) => (
                  <option key={tenant._id} value={tenant._id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </Card>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="لا يوجد مستخدمين"
          description="ابدأ بإضافة مستخدم جديد"
          action={<Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>إضافة مستخدم</Button>}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-right p-4 text-sm font-bold text-gray-500 dark:text-gray-400">المستخدم</th>
                  <th className="text-right p-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                    {isSuperAdmin ? 'المتجر' : 'الفرع'}
                  </th>
                  <th className="text-right p-4 text-sm font-bold text-gray-500 dark:text-gray-400">الدور</th>
                  <th className="text-right p-4 text-sm font-bold text-gray-500 dark:text-gray-400">الحالة</th>
                  <th className="text-right p-4 text-sm font-bold text-gray-500 dark:text-gray-400">تاريخ الإنشاء</th>
                  <th className="text-center p-4 text-sm font-bold text-gray-500 dark:text-gray-400">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {user.name?.charAt(0) || 'م'}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{user.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Mail className="w-3 h-3" />
                            <span>{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Phone className="w-3 h-3" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {isSuperAdmin ? (
                        user.tenant ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{user.tenant.name}</span>
                          </div>
                        ) : (
                          <Badge variant="warning">System Admin</Badge>
                        )
                      ) : (
                        user.branch ? (
                          <span className="text-sm font-medium">{user.branch.name}</span>
                        ) : (
                          <span className="text-xs text-gray-400">--</span>
                        )
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={
                        user.role === 'admin' ? 'warning' :
                        user.role === 'vendor' ? 'primary' :
                        'gray'
                      }>
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.isActive ? 'success' : 'danger'}>
                        {user.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            نشط
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            معطل
                          </>
                        )}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: ar })}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 text-primary-500 transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {user.role !== 'admin' && user.isActive && (
                          <button
                            onClick={() => handleDelete(user._id)}
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
          title={editId ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
          onClose={() => setShowModal(false)}
          size="md"
        >
          <div className="space-y-4">
            {editId ? (
              // Edit Mode
              <>
                <div>
                  <label className="block text-sm font-bold mb-2">الاسم *</label>
                  <Input
                    placeholder="محمد أحمد"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">البريد الإلكتروني *</label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">رقم الهاتف</label>
                  <Input
                    placeholder="01012345678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">الدور</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  >
                    <option value="vendor">Vendor</option>
                    <option value="coordinator">Coordinator</option>
                  </select>
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
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                  <label className="block text-sm font-bold mb-2 text-amber-600">تعيين كلمة مرور جديدة (اختياري)</label>
                  <Input
                    type="password"
                    placeholder="أدخل كلمة مرور جديدة..."
                    value={form.password || ''}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <p className="text-xs text-gray-400 mt-1">اتركه فارغاً إذا كنت لا تريد تغيير كلمة المرور</p>
                </div>
              </>
            ) : (
              // Create Mode
              <>
                {isSuperAdmin ? (
                  <div>
                    <label className="block text-sm font-bold mb-2">المتجر *</label>
                    <select
                      value={form.tenantId}
                      onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    >
                      <option value="">اختر المتجر</option>
                      {tenants.map((tenant) => (
                        <option key={tenant._id} value={tenant._id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold mb-2">الفرع</label>
                    <select
                      value={form.branch}
                      onChange={(e) => setForm({ ...form, branch: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    >
                      <option value="">(اختياري) اختر الفرع</option>
                      {branches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold mb-2">الاسم *</label>
                  <Input
                    placeholder="محمد أحمد"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">البريد الإلكتروني *</label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">رقم الهاتف *</label>
                  <Input
                    placeholder="01012345678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">كلمة المرور</label>
                  <Input
                    type="password"
                    placeholder="اتركه فارغاً لاستخدام 123456"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <p className="text-xs text-gray-400 mt-1">افتراضياً: 123456</p>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">الدور</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  >
                    <option value="vendor">Vendor</option>
                    <option value="coordinator">Coordinator</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} loading={saving} className="flex-1">
                {editId ? 'حفظ التعديلات' : 'إنشاء المستخدم'}
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