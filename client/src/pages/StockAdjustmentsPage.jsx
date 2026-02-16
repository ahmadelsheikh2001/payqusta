import React, { useState, useEffect } from 'react';
import { api } from '../store';
import { toast } from 'react-hot-toast';
import { Plus, Archive, AlertTriangle, Check, Search, X } from 'lucide-react';
import { Button, Card, Input, Modal, LoadingSpinner, EmptyState, Select, Badge } from '../components/UI';
import Pagination from '../components/Pagination';

const TYPES = {
  damage: { label: 'تالف (Damage)', color: 'danger' },
  theft: { label: 'سرقة / عجز (Theft)', color: 'danger' },
  loss: { label: 'فقد (Loss)', color: 'warning' },
  internal_use: { label: 'استخدام داخلي', color: 'info' },
  correction_increase: { label: 'تسوية (زيادة)', color: 'success' },
  correction_decrease: { label: 'تسوية (نقص)', color: 'danger' },
};

export default function StockAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Form State
  const [form, setForm] = useState({ productId: '', type: 'damage', quantity: 1, reason: '' });
  const [productSearch, setProductSearch] = useState('');

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/stock-adjustments?page=${page}&limit=10`);
      setAdjustments(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?limit=1000'); // Get enough for search
      setProducts(res.data.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchAdjustments();
    fetchProducts();
  }, [page]);

  const handleSubmit = async () => {
    if (!form.productId || !form.quantity) return toast.error('اختر المنتج والكمية');
    
    try {
      await api.post('/stock-adjustments', form);
      toast.success('تم تسجيل التسوية بنجاح');
      setShowModal(false);
      fetchAdjustments();
      setForm({ productId: '', type: 'damage', quantity: 1, reason: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">تسوية المخزون</h1>
          <p className="text-gray-500 mt-1">تعديل الأرصدة (تالف، عجز، تسوية)</p>
        </div>
        <Button icon={<Plus className="w-5 h-5" />} onClick={() => setShowModal(true)}>تسوية جديدة</Button>
      </div>

      {/* Stats Cards (Placeholder for now) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-red-500">
           <p className="text-gray-500 text-xs font-bold">إجمالي التالف (شهر)</p>
           <p className="text-2xl font-black text-red-600">0 ج.م</p>
        </Card>
         <Card className="p-4 border-l-4 border-amber-500">
           <p className="text-gray-500 text-xs font-bold">إجمالي العجز (شهر)</p>
           <p className="text-2xl font-black text-amber-600">0 ج.م</p>
        </Card>
         <Card className="p-4 border-l-4 border-blue-500">
           <p className="text-gray-500 text-xs font-bold">عمليات التسوية</p>
           <p className="text-2xl font-black text-blue-600">{adjustments.length}</p>
        </Card>
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : adjustments.length === 0 ? (
        <EmptyState icon={<Archive className="w-12 h-12 text-gray-300" />} title="لا توجد تسويات" description="سجل أول عملية تسوية مخزون" />
      ) : (
        <Card className="overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 border-b border-gray-100 dark:border-gray-800">
                <tr>
                   <th className="px-6 py-4 font-bold">التاريخ</th>
                   <th className="px-6 py-4 font-bold">المنتج</th>
                   <th className="px-6 py-4 font-bold">النوع</th>
                   <th className="px-6 py-4 font-bold">الكمية</th>
                   <th className="px-6 py-4 font-bold">ملاحظات</th>
                   <th className="px-6 py-4 font-bold">بواسطة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {adjustments.map((adj) => (
                  <tr key={adj._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(adj.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200">
                      {adj.product?.name}
                      <div className="text-xs text-gray-400 font-normal">{adj.product?.sku}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={TYPES[adj.type]?.color || 'gray'}>
                        {TYPES[adj.type]?.label || adj.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-bold">
                       <span dir="ltr">{adj.quantity}</span>
                    </td>
                     <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={adj.reason}>
                      {adj.reason || '—'}
                    </td>
                     <td className="px-6 py-4 text-xs text-gray-400">
                      {adj.user?.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      
      {/* Modal */}
       <Modal open={showModal} onClose={() => setShowModal(false)} title="تسوية مخزون جديدة">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">بحث عن منتج</label>
            <div className="relative">
               <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input 
                  className="w-full pr-10 pl-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:border-primary-500 outline-none" 
                  placeholder="بحث بالاسم أو الباركود..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
               />
            </div>
            {productSearch && (
               <div className="mt-2 max-h-40 overflow-y-auto border-2 rounded-xl border-gray-100 dark:border-gray-800">
                  {filteredProducts.map(p => (
                     <div 
                        key={p._id} 
                        onClick={() => { setForm({ ...form, productId: p._id }); setProductSearch(p.name); }}
                        className={`p-2 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-500/10 flex justify-between items-center ${form.productId === p._id ? 'bg-primary-50 dark:bg-primary-500/10' : ''}`}
                     >
                        <span className="font-bold text-sm">{p.name}</span>
                        <span className="text-xs text-gray-400">متاح: {p.stock?.quantity}</span>
                     </div>
                  ))}
               </div>
            )}
          </div>

          <Select 
            label="نوع التسوية" 
            value={form.type} 
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={Object.entries(TYPES).map(([key, val]) => ({ value: key, label: val.label }))}
          />
          
          <Input 
            label="الكمية" 
            type="number" 
            min="1"
            value={form.quantity} 
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} 
          />
          
          <Input 
             label="ملاحظات / سبب التسوية"
             value={form.reason}
             onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />

          <div className="pt-4 flex gap-3">
            <Button onClick={handleSubmit} className="flex-1">حفظ التسوية</Button>
            <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
