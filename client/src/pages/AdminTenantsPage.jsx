import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Search, Edit2, Trash2, CheckCircle,
  XCircle, Calendar, Users, CreditCard, Crown, Key, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notify } from '../components/AnimatedNotification';
import { superAdminApi } from '../store';
import { Button, Input, Modal, Badge, Card, LoadingSpinner, EmptyState } from '../components/UI';
import Pagination from '../components/Pagination';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

import { useAuthStore } from '../store';
import BranchManagement from './BranchManagement';

export default function AdminTenantsPage() {
  const { user } = useAuthStore();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [impersonating, setImpersonating] = useState(null);
  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerPassword: '',
    plan: 'free',
  });

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // ... (keep existing load function) ...

  const handleViewDetails = async (tenant) => {
    setSelectedTenant(null);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    try {
      const res = await superAdminApi.getTenantDetails(tenant._id);
      setSelectedTenant(res.data.data);
    } catch (err) {
      toast.error('فشل تحميل تفاصيل المتجر');
      setShowDetailsModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  // ... (keep existing handlers) ...

  return (
    <div className="space-y-6">
      {/* ... (keep existing Header and Filters) ... */}

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
              {/* ... (keep table header) ... */}
              <tbody>
                {tenants.map((tenant) => (
                  <tr
                    key={tenant._id}
                    className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    {/* ... (keep existing columns) ... */}
                    
                    {/* Updated Actions Column */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetails(tenant)}
                          className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-500 transition-colors"
                          title="التفاصيل والفروع"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                         <button
                          onClick={() => handleImpersonate(tenant._id)}
                          className={`p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-600 transition-colors ${impersonating === tenant._id ? 'opacity-50 cursor-wait' : ''}`}
                          title="الدخول كمسؤول للمتجر"
                          disabled={impersonating === tenant._id}
                        >
                          {impersonating === tenant._id ? <LoadingSpinner size="sm" /> : <Key className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEdit(tenant)}
                          className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 text-primary-500 transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {tenant.isActive ? (
                             <button
                            onClick={() => handleDelete(tenant._id)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors"
                            title="تعطيل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                             <button
                             disabled
                            className="p-2 rounded-lg text-gray-300 cursor-not-allowed"
                            title="معطل بالفعل"
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
          {/* ... (keep pagination) ... */}
        </Card>
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <Modal
          title="تفاصيل المتجر والفروع"
          onClose={() => setShowDetailsModal(false)}
          size="xl"
        >
          {detailsLoading || !selectedTenant ? (
             <div className="flex items-center justify-center py-10">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gray-50 dark:bg-gray-800 border-none">
                   <p className="text-xs text-gray-500 mb-1">إجمالي المبيعات</p>
                   <p className="text-lg font-bold text-primary-600">{selectedTenant.stats?.revenue?.toLocaleString()} د.ك</p>
                </Card>
                <Card className="p-4 bg-gray-50 dark:bg-gray-800 border-none">
                   <p className="text-xs text-gray-500 mb-1">عدد الفواتير</p>
                   <p className="text-lg font-bold">{selectedTenant.stats?.invoices}</p>
                </Card>
                <Card className="p-4 bg-gray-50 dark:bg-gray-800 border-none">
                   <p className="text-xs text-gray-500 mb-1">العملاء</p>
                   <p className="text-lg font-bold">{selectedTenant.stats?.customers}</p>
                </Card>
                <Card className="p-4 bg-gray-50 dark:bg-gray-800 border-none">
                   <p className="text-xs text-gray-500 mb-1">المنتجات</p>
                   <p className="text-lg font-bold">{selectedTenant.stats?.products}</p>
                </Card>
              </div>

              {/* Business Info */}
              <div>
                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  بيانات الشركة
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl space-y-2 text-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between">
                      <span className="text-gray-500">الاسم التجاري:</span>
                      <span className="font-semibold">{selectedTenant.tenant?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">البريد الإلكتروني:</span>
                      <span className="font-semibold">{selectedTenant.users?.find(u => u.role === 'admin')?.email || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">الهاتف:</span>
                      <span className="font-semibold">{selectedTenant.tenant?.businessInfo?.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">العنوان:</span>
                      <span className="font-semibold">{selectedTenant.tenant?.businessInfo?.address || '-'}</span>
                    </div>
                </div>
              </div>

              {/* Branches List */}
              <div>
                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  الفروع ({selectedTenant.branches?.length || 0})
                </h3>
                <div className="border rounded-xl overflow-hidden border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="p-3 text-right">الاسم</th>
                        <th className="p-3 text-right">النوع</th>
                        <th className="p-3 text-right">المدير</th>
                        <th className="p-3 text-right">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {selectedTenant.branches?.length > 0 ? (
                        selectedTenant.branches.map(branch => (
                          <tr key={branch._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="p-3 font-medium">{branch.name}</td>
                            <td className="p-3 text-gray-500">{branch.type === 'physical' ? 'فرع فعلي' : 'متجر إلكتروني'}</td>
                            <td className="p-3">{branch.managerName || '-'}</td>
                            <td className="p-3">
                              <Badge variant={branch.isActive ? 'success' : 'danger'} size="sm">
                                {branch.isActive ? 'نشط' : 'معطل'}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="p-4 text-center text-gray-500">لا توجد فروع مسجلة</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Modal>
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
                    placeholder="8 أحرف على الأقل"
                    value={form.ownerPassword}
                    onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">مطلوب · 8 أحرف على الأقل</p>
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
