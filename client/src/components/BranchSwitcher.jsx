import React, { useState, useEffect } from 'react';
import { Store, Plus, Check, ChevronDown, Building2, Loader2, Phone, MapPin } from 'lucide-react';
import { useAuthStore } from '../store';
import { notify } from './AnimatedNotification';
import { Modal, Input, Button } from './UI';

export default function BranchSwitcher() {
  const { tenant, user, switchTenant, getBranches, createBranch } = useAuthStore();
  const [branches, setBranches] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // New Branch Form
  const [newBranch, setNewBranch] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    if (isOpen) {
      loadBranches();
    }
  }, [isOpen]);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const list = await getBranches();
      setBranches(list);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (branchId) => {
    if (branchId === tenant?._id) return;
    try {
      await switchTenant(branchId);
      notify.success('تم التبديل بنجاح');
    } catch (error) {
      notify.error(error.message || 'فشل التبديل');
    }
  };

  const handleCreate = async () => {
    if (!newBranch.name) return notify.error('اسم الفرع مطلوب');
    setCreating(true);
    try {
      await createBranch(newBranch);
      notify.success('تم إنشاء الفرع بنجاح');
      setShowCreateModal(false);
      setNewBranch({ name: '', phone: '', address: '' });
      loadBranches(); // Reload list
    } catch (error) {
      notify.error(error.message || 'فشل إنشاء الفرع');
    } finally {
      setCreating(false);
    }
  };

  if (!user || (user.role !== 'vendor' && user.role !== 'admin')) return null;

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
            <Store className="w-4 h-4" />
          </div>
          <div className="text-right hidden md:block">
            <p className="text-xs text-gray-400">الفرع الحالي</p>
            <p className="text-sm font-bold flex items-center gap-1">
              {tenant?.name}
              <ChevronDown className="w-3 h-3" />
            </p>
          </div>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 p-2">
              <div className="p-2 text-xs font-bold text-gray-400 uppercase flex justify-between items-center">
                <span>فروعي</span>
                <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 text-[10px] px-1.5 py-0.5 rounded-full">{branches.length} / 5</span>
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-1 mb-2">
                {loading ? (
                  <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-primary-500" /></div>
                ) : (
                  branches.map(branch => (
                    <button
                      key={branch._id}
                      onClick={() => handleSwitch(branch._id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                        tenant?._id === branch._id 
                          ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 border border-primary-100 dark:border-primary-500/20 shadow-sm' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          tenant?._id === branch._id ? 'bg-primary-100 dark:bg-primary-500/20' : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          <Building2 className="w-4 h-4 opacity-70" />
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm block">{branch.name}</span>
                          <span className="text-[10px] text-gray-400 block truncate max-w-[120px]">{branch.businessInfo?.address || 'لا يوجد عنوان'}</span>
                        </div>
                      </div>
                      {tenant?._id === branch._id && <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>}
                    </button>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => { setIsOpen(false); setShowCreateModal(true); }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all group"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-500/20 flex items-center justify-center transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                  إضافة فرع جديد
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Branch Modal */}
      {showCreateModal && (
        <Modal
          title="إضافة فرع جديد"
          onClose={() => setShowCreateModal(false)}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">اسم الفرع *</label>
              <div className="relative">
                <Store className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  className="pr-10"
                  placeholder="مثال: فرع مدينة نصر"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">رقم الهاتف</label>
              <div className="relative">
                <Phone className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  className="pr-10"
                  placeholder="رقم هاتف الفرع"
                  value={newBranch.phone}
                  onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">العنوان</label>
              <div className="relative">
                <MapPin className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  className="pr-10"
                  placeholder="عنوان الفرع بالتفصيل"
                  value={newBranch.address}
                  onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreate} loading={creating} className="flex-1 py-3 text-base">
                <Plus className="w-5 h-5 ml-2" />
                إنشاء الفرع
              </Button>
              <Button variant="ghost" onClick={() => setShowCreateModal(false)} className="flex-1">
                إلغاء
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
