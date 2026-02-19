import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Plus, Search, Edit2, Trash2, Mail, Phone, Shield, 
  CheckCircle, XCircle, MoreVertical 
} from 'lucide-react';
import { api } from '../../store';
import { Button, Input, Modal, Badge, Card, LoadingSpinner, EmptyState } from '../UI';
import { notify } from '../AnimatedNotification';
import Pagination from '../Pagination';

export default function SettingsUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'coordinator',
    isActive: true
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/auth/users?page=${page}&limit=10&search=${search}`);
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      notify.error('فشل تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenAdd = () => {
    setEditId(null);
    setForm({ name: '', email: '', phone: '', password: '', role: 'coordinator', isActive: true });
    setShowModal(true);
  };

  const handleOpenEdit = (user) => {
    setEditId(user._id);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive,
      password: '' // Don't fill password
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.role) return notify.warning('البيانات الأساسية مطلوبة');
    if (!editId && !form.password) return notify.warning('كلمة المرور مطلوبة للمستخدم الجديد');

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/auth/users/${editId}`, form);
        notify.success('تم تحديث المستخدم');
      } else {
        await api.post('/auth/users', form);
        notify.success('تم إضافة المستخدم');
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      notify.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من تعطيل هذا المستخدم؟')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      notify.success('تم تعطيل المستخدم');
      loadUsers();
    } catch (err) {
      notify.error('فشل التعطيل');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">إدارة الموظفين</h2>
          <p className="text-gray-500 text-sm">إضافة وتعديل صلاحيات المستخدمين</p>
        </div>
        <Button onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>مستخدم جديد</Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="بحث بالاسم أو البريد..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : users.length === 0 ? (
          <EmptyState 
            icon={<Users className="w-8 h-8" />} 
            title="لا يوجد مستخدمين" 
            description="قم بإضافة موظفين لمساعدتك في إدارة المتجر" 
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-medium">
                <tr>
                  <th className="p-4 text-right">المستخدم</th>
                  <th className="p-4 text-right">الدور</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map(user => (
                  <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center font-bold">
                          {user.name[0]}
                        </div>
                        <div>
                          <p className="font-bold">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                          {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.role === 'vendor' ? 'primary' : 'info'}>
                        {user.role === 'vendor' ? 'مسؤول (Vendor)' : 'منسق (Coordinator)'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.isActive ? 'success' : 'danger'}>
                        {user.isActive ? 'نشط' : 'معطل'}
                      </Badge>
                    </td>
                    <td className="p-4 flex justify-center gap-2">
                      <button onClick={() => handleOpenEdit(user)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-blue-500">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user._id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
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

      <Modal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        title={editId ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
      >
        <div className="space-y-4">
          <Input 
            label="الاسم" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
          />
          <Input 
            label="البريد الإلكتروني" 
            type="email"
            value={form.email} 
            onChange={e => setForm({...form, email: e.target.value})}
            disabled={!!editId} // Email immutable on edit usually
          />
          <Input 
            label="رقم الهاتف" 
            value={form.phone} 
            onChange={e => setForm({...form, phone: e.target.value})} 
          />
          <div>
            <label className="block text-sm font-bold mb-2">الدور</label>
            <select 
              value={form.role} 
              onChange={e => setForm({...form, role: e.target.value})}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <option value="coordinator">منسق (Coordinator)</option>
              <option value="vendor">مسؤول (Vendor Admin)</option>
            </select>
          </div>
          
          <Input 
            label={editId ? 'تغيير كلمة المرور (اختياري)' : 'كلمة المرور'}
            type="password"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
            placeholder={editId ? 'اتركه فارغاً للإبقاء على الحالية' : ''}
          />

          {editId && (
            <div>
              <label className="block text-sm font-bold mb-2">الحالة</label>
              <select 
                value={form.isActive} 
                onChange={e => setForm({...form, isActive: e.target.value === 'true'})}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                <option value="true">نشط</option>
                <option value="false">معطل</option>
              </select>
            </div>
          )}

          <div className="pt-4 flex gap-3">
             <Button className="flex-1" onClick={handleSave} loading={saving}>حفظ</Button>
             <Button className="flex-1" variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
