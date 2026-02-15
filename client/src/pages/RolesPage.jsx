import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { api } from '../store';
import { Button, Card, Input, Modal, Badge, LoadingSpinner, EmptyState } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

const RESOURCES = [
  { id: 'products', label: 'المنتجات' },
  { id: 'customers', label: 'العملاء' },
  { id: 'suppliers', label: 'الموردين' },
  { id: 'invoices', label: 'الفواتير' },
  { id: 'expenses', label: 'المصروفات' },
  { id: 'reports', label: 'التقارير' },
  { id: 'settings', label: 'الإعدادات' },
  { id: 'users', label: 'المستخدمين' },
  { id: 'stock_adjustments', label: 'تعديلات المخزون' },
  { id: 'cash_shifts', label: 'إدارة الخزينة' },
];

const ACTIONS = [
  { id: 'create', label: 'إنشاء', color: 'success' },
  { id: 'read', label: 'عرض', color: 'info' },
  { id: 'update', label: 'تعديل', color: 'warning' },
  { id: 'delete', label: 'حذف', color: 'danger' },
];

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    permissions: [],
  });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/roles');
      setRoles(res.data.data);
    } catch (err) {
      notify.error('فشل تحميل الأدوار');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setForm({ name: '', description: '', permissions: [] });
    setShowModal(true);
  };

  const handleOpenEdit = (role) => {
    setEditId(role._id);
    setForm({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) return notify.warning('اسم الدور مطلوب');
    if (form.permissions.length === 0) return notify.warning('يجب تحديد صلاحية واحدة على الأقل');

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/roles/${editId}`, form);
        notify.success('تم تحديث الدور');
      } else {
        await api.post('/roles', form);
        notify.success('تم إنشاء الدور');
      }
      setShowModal(false);
      loadRoles();
    } catch (err) {
      notify.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الدور؟')) return;
    try {
      await api.delete(`/roles/${id}`);
      notify.success('تم حذف الدور');
      loadRoles();
    } catch (err) {
      notify.error(err.response?.data?.message || 'فشل الحذف');
    }
  };

  const togglePermission = (resource, action) => {
    const permissions = [...form.permissions];
    const permIndex = permissions.findIndex(p => p.resource === resource);
    
    if (permIndex === -1) {
      permissions.push({ resource, actions: [action] });
    } else {
      const actions = permissions[permIndex].actions;
      if (actions.includes(action)) {
        permissions[permIndex].actions = actions.filter(a => a !== action);
        if (permissions[permIndex].actions.length === 0) {
          permissions.splice(permIndex, 1);
        }
      } else {
        permissions[permIndex].actions.push(action);
      }
    }
    
    setForm({ ...form, permissions });
  };

  const hasPermission = (resource, action) => {
    const perm = form.permissions.find(p => p.resource === resource);
    return perm && perm.actions.includes(action);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary-500" />
            إدارة الأدوار والصلاحيات
          </h1>
          <p className="text-gray-500 text-sm mt-1">تخصيص صلاحيات المستخدمين حسب الدور</p>
        </div>
        <Button onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>دور جديد</Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : roles.length === 0 ? (
        <EmptyState 
          icon={<Shield className="w-12 h-12" />} 
          title="لا توجد أدوار مخصصة" 
          description="قم بإنشاء أدوار مخصصة لتحديد صلاحيات دقيقة للمستخدمين" 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <Card key={role._id} className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg">{role.name}</h3>
                  {role.description && <p className="text-xs text-gray-400 mt-1">{role.description}</p>}
                  {role.isSystem && <Badge variant="info" className="mt-2">افتراضي</Badge>}
                </div>
                {!role.isSystem && (
                  <div className="flex gap-1">
                    <button onClick={() => handleOpenEdit(role)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-blue-500">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(role._id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-gray-500">الصلاحيات:</p>
                {role.permissions.slice(0, 3).map(perm => (
                  <div key={perm.resource} className="flex gap-1 flex-wrap">
                    <span className="font-medium">{RESOURCES.find(r => r.id === perm.resource)?.label}:</span>
                    {perm.actions.map(action => (
                      <Badge key={action} variant="gray" className="text-xs">{ACTIONS.find(a => a.id === action)?.label}</Badge>
                    ))}
                  </div>
                ))}
                {role.permissions.length > 3 && (
                  <p className="text-gray-400">+{role.permissions.length - 3} أخرى...</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        title={editId ? 'تعديل الدور' : 'إنشاء دور جديد'}
        size="lg"
      >
        <div className="space-y-4">
          <Input 
            label="اسم الدور" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})} 
            placeholder="مثال: مدير المخزون"
          />
          <Input 
            label="الوصف (اختياري)" 
            value={form.description} 
            onChange={e => setForm({...form, description: e.target.value})} 
            placeholder="وصف مختصر للدور"
          />
          
          <div>
            <label className="block text-sm font-bold mb-3">الصلاحيات</label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="p-3 text-right font-semibold">المورد</th>
                    {ACTIONS.map(action => (
                      <th key={action.id} className="p-3 text-center font-semibold">{action.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {RESOURCES.map(resource => (
                    <tr key={resource.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-3 font-medium">{resource.label}</td>
                      {ACTIONS.map(action => (
                        <td key={action.id} className="p-3 text-center">
                          <input 
                            type="checkbox"
                            checked={hasPermission(resource.id, action.id)}
                            onChange={() => togglePermission(resource.id, action.id)}
                            className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button className="flex-1" onClick={handleSave} loading={saving} icon={<Save className="w-4 h-4" />}>
              {editId ? 'حفظ التعديلات' : 'إنشاء الدور'}
            </Button>
            <Button className="flex-1" variant="ghost" onClick={() => setShowModal(false)} icon={<X className="w-4 h-4" />}>
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
