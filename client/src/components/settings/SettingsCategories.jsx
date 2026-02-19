import React, { useState, useEffect } from 'react';
import { Tag, Save, Plus, Trash2, Loader } from 'lucide-react'; // Removed Eye, EyeOff
import { api, productsApi } from '../../store';
import { Button, Input } from '../UI';
import { notify } from '../AnimatedNotification';

export default function SettingsCategories() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      // Fetch all categories (configured + used in products)
      const res = await productsApi.getCategories();
      setCategories(res.data.data || []);
    } catch (err) {
      notify.error('فشل في تحميل التصنيفات');
    } finally {
      setLoading(false);
    }
  };

  const saveCategories = async (updatedCategories) => {
    setSaving(true);
    try {
      await api.put('/settings/categories', { categories: updatedCategories });
      notify.success('تم حفظ التغييرات');
    } catch (err) {
      notify.error('فشل في حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) {
      return notify.warning('التصنيف موجود بالفعل');
    }
    
    const updated = [...categories, newCategory.trim()];
    setCategories(updated);
    setNewCategory('');
    saveCategories(updated);
  };

  const removeCategory = (cat) => {
    notify.custom({
      type: 'warning',
      title: 'حذف التصنيف',
      message: `هل أنت متأكد من حذف تصنيف "${cat}"؟ سيتم نقل جميع المنتجات المرتبطة به إلى تصنيف "أخرى".`,
      action: {
        label: 'حذف نهائي',
        onClick: async () => {
          setSaving(true);
          try {
            await api.delete(`/settings/categories/${encodeURIComponent(cat)}`);
            // Update local state by removing the deleted category
            setCategories(categories.filter(c => c !== cat));
            notify.success('تم حذف التصنيف بنجاح');
          } catch (err) {
            notify.error('فشل في حذف التصنيف');
          } finally {
            setSaving(false);
          }
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg">
          <Tag className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">تصنيفات المنتجات</h2>
          <p className="text-sm text-gray-400">إدارة فئات المنتجات الخاصة بمتجرك</p>
        </div>
      </div>

      {/* Add Category */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input 
            placeholder="اسم التصنيف الجديد..." 
            value={newCategory} 
            onChange={(e) => setNewCategory(e.target.value)} 
            onKeyPress={(e) => e.key === 'Enter' && addCategory()} 
            disabled={loading || saving}
          />
        </div>
        <Button 
          onClick={addCategory} 
          disabled={loading || saving || !newCategory.trim()}
          icon={saving ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        >
          {saving ? 'جاري الحفظ...' : 'إضافة'}
        </Button>
      </div>

      {/* Categories List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map((cat, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow group">
              <span className="font-medium text-gray-700 dark:text-gray-200">{cat}</span>
              <button 
                onClick={() => removeCategory(cat)} 
                disabled={saving}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-600 transition-all"
                title="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {categories.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <Tag className="w-12 h-12 mb-3 opacity-20" />
              <p>لا توجد تصنيفات مضافة بعد</p>
              <p className="text-xs opacity-70 mt-1">أضف تصنيفات لتنظيم منتجاتك</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
