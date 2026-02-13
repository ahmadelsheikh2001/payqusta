import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, AlertTriangle, Send, RefreshCw, MessageCircle, Check,
  ShoppingCart, Loader2, Phone, Building2, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productsApi, suppliersApi } from '../store';
import { Button, Card, Badge, LoadingSpinner, EmptyState } from '../components/UI';

export default function LowStockPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingOrders, setSendingOrders] = useState({});
  const [sendingBulk, setSendingBulk] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.getLowStock();
      setProducts(res.data.data || []);
    } catch (err) {
      toast.error('خطأ في تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Send order request for single product
  const handleRequestRestock = async (product) => {
    if (!product.supplier) {
      toast.error('هذا المنتج ليس له مورد محدد');
      return;
    }

    setSendingOrders(prev => ({ ...prev, [product._id]: true }));
    
    try {
      const needed = Math.max(10, (product.stock?.minQuantity || 5) * 2 - (product.stock?.quantity || 0));
      const res = await productsApi.requestRestock(product._id, needed);
      
      if (res.data.data?.success) {
        toast.success(`تم إرسال طلب ${needed} قطعة من "${product.name}" للمورد ✅`);
      } else {
        toast.success(`تم حفظ الطلب (WhatsApp غير متصل)`);
      }
    } catch (err) {
      toast.error('فشل إرسال الطلب');
    } finally {
      setSendingOrders(prev => ({ ...prev, [product._id]: false }));
    }
  };

  // Send bulk order to all suppliers
  const handleBulkRestock = async () => {
    const productsWithSuppliers = products.filter(p => p.supplier);
    if (productsWithSuppliers.length === 0) {
      toast.error('لا توجد منتجات بها موردين');
      return;
    }

    setSendingBulk(true);
    
    try {
      const res = await productsApi.requestRestockBulk();
      const data = res.data.data;
      
      if (data?.results) {
        const successful = data.results.filter(r => r.success).length;
        toast.success(`تم إرسال ${data.totalProducts} طلب لـ ${successful}/${data.totalSuppliers} مورد ✅`);
      }
    } catch (err) {
      toast.error('فشل إرسال الطلبات');
    } finally {
      setSendingBulk(false);
    }
  };

  // Toggle product selection
  const toggleSelect = (productId) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) newSet.delete(productId);
      else newSet.add(productId);
      return newSet;
    });
  };

  // Select all
  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p._id)));
    }
  };

  // Group products by supplier
  const groupedBySupplier = products.reduce((acc, product) => {
    const supplierId = product.supplier?._id || 'no-supplier';
    const supplierName = product.supplier?.name || 'بدون مورد';
    if (!acc[supplierId]) {
      acc[supplierId] = { supplier: product.supplier, name: supplierName, products: [] };
    }
    acc[supplierId].products.push(product);
    return acc;
  }, {});

  const fmt = (n) => (n || 0).toLocaleString('ar-EG');

  // Compute stock status from actual quantities (not cached field)
  const getStockStatus = (product) => {
    const qty = product.stock?.quantity || 0;
    const minQty = product.stock?.minQuantity || 5;
    if (qty <= 0) return 'out_of_stock';
    if (qty <= minQty) return 'low_stock';
    return 'in_stock';
  };

  const stockBadge = (product) => {
    const status = getStockStatus(product);
    if (status === 'out_of_stock') return <Badge variant="danger">نفذ</Badge>;
    if (status === 'low_stock') return <Badge variant="warning">منخفض</Badge>;
    return <Badge variant="success">متوفر</Badge>;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">المنتجات منخفضة المخزون</h2>
            <p className="text-sm text-gray-500">{products.length} منتج يحتاج إعادة تخزين</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} icon={<RefreshCw className="w-4 h-4" />}>
            تحديث
          </Button>
          <Button 
            variant="whatsapp" 
            onClick={handleBulkRestock} 
            loading={sendingBulk}
            disabled={products.filter(p => p.supplier).length === 0}
            icon={<Send className="w-4 h-4" />}
          >
            إرسال طلبات لكل الموردين
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? <LoadingSpinner /> : products.length === 0 ? (
        <EmptyState 
          icon={<Package className="w-8 h-8" />} 
          title="لا توجد منتجات منخفضة المخزون" 
          description="جميع المنتجات متوفرة بكميات كافية ✅" 
        />
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 border-2 border-red-100 dark:border-red-500/20">
              <p className="text-xs text-gray-400">نفذ من المخزون</p>
              <p className="text-2xl font-black text-red-600">
                {products.filter(p => getStockStatus(p) === 'out_of_stock').length}
              </p>
            </Card>
            <Card className="p-4 border-2 border-amber-100 dark:border-amber-500/20">
              <p className="text-xs text-gray-400">مخزون منخفض</p>
              <p className="text-2xl font-black text-amber-600">
                {products.filter(p => getStockStatus(p) === 'low_stock').length}
              </p>
            </Card>
            <Card className="p-4 border-2 border-primary-100 dark:border-primary-500/20">
              <p className="text-xs text-gray-400">عدد الموردين</p>
              <p className="text-2xl font-black text-primary-600">
                {Object.keys(groupedBySupplier).filter(k => k !== 'no-supplier').length}
              </p>
            </Card>
            <Card className="p-4 border-2 border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400">بدون مورد</p>
              <p className="text-2xl font-black text-gray-600">
                {groupedBySupplier['no-supplier']?.products.length || 0}
              </p>
            </Card>
          </div>

          {/* Grouped by Supplier */}
          {Object.entries(groupedBySupplier).map(([supplierId, group]) => (
            <Card key={supplierId} className="overflow-hidden">
              {/* Supplier Header */}
              <div className={`px-5 py-4 flex items-center justify-between ${supplierId === 'no-supplier' ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-primary-50 dark:bg-primary-500/10'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${supplierId === 'no-supplier' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-primary-100 dark:bg-primary-500/20'}`}>
                    <Building2 className={`w-5 h-5 ${supplierId === 'no-supplier' ? 'text-gray-500' : 'text-primary-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold">{group.name}</h3>
                    <p className="text-xs text-gray-500">{group.products.length} منتج</p>
                  </div>
                </div>
                {supplierId !== 'no-supplier' && group.supplier?.phone && (
                  <div className="flex items-center gap-2">
                    <a 
                      href={`tel:${group.supplier.phone}`}
                      className="p-2 rounded-lg bg-white dark:bg-gray-900 text-gray-500 hover:text-primary-500 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <a 
                      href={`https://wa.me/${group.supplier.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-500 hover:bg-green-100 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>

              {/* Products Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-400">المنتج</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-400">SKU</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-400">الحالي</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-400">الحد الأدنى</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-400">المطلوب</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-400">الحالة</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-400">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.products.map((product) => {
                      const needed = Math.max(10, (product.stock?.minQuantity || 5) * 2 - (product.stock?.quantity || 0));
                      return (
                        <tr key={product._id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStockStatus(product) === 'out_of_stock' ? 'bg-red-100 dark:bg-red-500/20 text-red-500' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-500'}`}>
                                <Package className="w-4 h-4" />
                              </div>
                              <span className="font-semibold">{product.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">{product.sku || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${product.stock?.quantity === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                              {product.stock?.quantity || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{product.stock?.minQuantity || 5}</td>
                          <td className="px-4 py-3 font-bold text-primary-600">{needed}</td>
                          <td className="px-4 py-3">{stockBadge(product)}</td>
                          <td className="px-4 py-3">
                            {supplierId !== 'no-supplier' ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleRequestRestock(product)}
                                loading={sendingOrders[product._id]}
                                icon={<Send className="w-3 h-3" />}
                              >
                                طلب
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400">أضف مورد أولاً</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
