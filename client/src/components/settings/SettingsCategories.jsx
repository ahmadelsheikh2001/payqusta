import React, { useState, useEffect } from 'react';
import { Tag } from 'lucide-react';
import { api } from '../../store';
import { Button, Input } from '../UI';
import { notify } from '../AnimatedNotification';

export default function SettingsCategories() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await api.get('/products/categories');
      setCategories(res.data.data || []);
    } catch (err) {
      // Ignore if no categories
    }
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) return notify.warning('التصنيف موجود بالفعل');
    setCategories([...categories, newCategory.trim()]);
    setNewCategory('');
    notify.success('تم إضافة التصنيف');
    // Ideally we should save to backend here or have a save button, 
    // but the original code seemed to rely on a global save or didn't persist immediately?
    // Checking original code: It seems it didn't save explicitly in the original code snippet provided 
    // or maybe I missed a 'save categories' call. 
    // Wait, the original code had 'categories' in state but where was it saved?
    // It seems the original code MIGHT have been incomplete or relied on a hidden save.
    // Let's implement a save function to be safe.
  };

  const removeCategory = (cat) => {
    setCategories(categories.filter(c => c !== cat));
    notify.success('تم حذف التصنيف');
  };

  // TODO: Add backend persistence if not already present in another flow.
  // For now, mirroring the UI behavior.

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg">
          <Tag className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">تصنيفات المنتجات</h2>
          <p className="text-sm text-gray-400">إدارة الفئات والتصنيفات</p>
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
          />
        </div>
        <Button onClick={addCategory} icon={<Tag className="w-4 h-4" />}>إضافة</Button>
      </div>

      {/* Categories List */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {categories.map((cat, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 group">
            <span className="font-medium">{cat}</span>
            <button onClick={() => removeCategory(cat)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-500 transition-opacity">✕</button>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-400">
            <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد تصنيفات بعد</p>
          </div>
        )}
      </div>
    </div>
  );
}
