import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Filter, ShoppingBag, X } from 'lucide-react';
import { api } from '../store';
import { portalApi } from '../store/portalStore'; // Import portalApi
import { Card, Input, Select, Badge, LoadingSpinner, EmptyState } from '../components/UI';

export default function ProductCatalog() {
  const location = useLocation();
  const isPortal = location.pathname.includes('/portal');
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState('all');

  useEffect(() => {
    // Check if category query param exists
    const params = new URLSearchParams(location.search);
    const catParam = params.get('category');
    if (catParam) setSelectedCategory(catParam);
    
    console.log('[ProductCatalog] Path:', location.pathname);
    console.log('[ProductCatalog] isPortal:', isPortal);
    
    loadData();
  }, [location.search, location.pathname]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isPortal) {
        // Portal API returns standard structure with categories included
        // We fetch with large limit to support client-side filtering preference for now, 
        // OR we could rely on server filtering. Let's fetch all active for client filtering consistency.
        const res = await portalApi.get('/portal/products?limit=100');
        setProducts(res.data.data.products || []);
        // Portal API returns categories list in the same response
        setCategories(res.data.data.categories?.map(c => typeof c === 'string' ? c : c.name) || []);
      } else {
        // Storefront/Admin API
        const [productsRes, categoriesRes] = await Promise.all([
          api.get('/products?isActive=true&limit=100'),
          api.get('/products/categories')
        ]);
        setProducts(productsRes.data.data || []);
        setCategories(categoriesRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
                         product.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    
    let matchesPrice = true;
    if (priceRange === 'under100') matchesPrice = product.price < 100;
    else if (priceRange === '100-500') matchesPrice = product.price >= 100 && product.price <= 500;
    else if (priceRange === 'over500') matchesPrice = product.price > 500;

    return matchesSearch && matchesCategory && matchesPrice;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black mb-2">جميع المنتجات</h1>
        <p className="text-gray-500">تصفح مجموعتنا الكاملة من المنتجات</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث عن منتج..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-primary-500 outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            options={[
              { value: '', label: 'جميع الفئات' },
              ...categories.map(cat => ({ value: cat, label: cat }))
            ]}
          />

          {/* Price Filter */}
          <Select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            options={[
              { value: 'all', label: 'جميع الأسعار' },
              { value: 'under100', label: 'أقل من 100 ج.م' },
              { value: '100-500', label: '100 - 500 ج.م' },
              { value: 'over500', label: 'أكثر من 500 ج.م' }
            ]}
          />
        </div>

        {/* Active Filters */}
        {(search || selectedCategory || priceRange !== 'all') && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {search && (
              <Badge variant="info" className="flex items-center gap-1">
                بحث: {search}
                <button onClick={() => setSearch('')}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {selectedCategory && (
              <Badge variant="info" className="flex items-center gap-1">
                {selectedCategory}
                <button onClick={() => setSelectedCategory('')}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {priceRange !== 'all' && (
              <Badge variant="info" className="flex items-center gap-1">
                {priceRange === 'under100' ? 'أقل من 100' : priceRange === '100-500' ? '100-500' : 'أكثر من 500'}
                <button onClick={() => setPriceRange('all')}><X className="w-3 h-3" /></button>
              </Badge>
            )}
          </div>
        )}
      </Card>

      {/* Results Count */}
      <div className="text-gray-500 text-sm">
        عرض {filteredProducts.length} من {products.length} منتج
      </div>

      {/* Products Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-12 h-12" />}
          title="لا توجد منتجات"
          description="جرب تغيير معايير البحث"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <Link key={product._id} to={`${location.pathname.includes('/portal') ? '/portal' : '/store'}/products/${product._id}`}>
              <Card className="group hover:shadow-xl transition-shadow overflow-hidden h-full">
                {/* Product Image */}
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                  {product.stock?.quantity === 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="danger">نفذت الكمية</Badge>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1 line-clamp-1">{product.name}</h3>
                  {product.category && (
                    <p className="text-xs text-gray-400 mb-2">{product.category}</p>
                  )}
                  <p className="text-gray-500 text-sm mb-3 line-clamp-2">{product.description}</p>

                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-2xl font-black text-primary-600">
                        {product.price.toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-500 mr-1">ج.م</span>
                    </div>
                    {product.stock?.quantity > 0 && (
                      <span className="text-xs text-gray-400">
                        متوفر: {product.stock.quantity}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
