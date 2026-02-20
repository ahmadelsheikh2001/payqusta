import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, X, Heart, Package, Star, Tag, SlidersHorizontal, ShoppingCart } from 'lucide-react';
import { api } from '../store';
import { portalApi, usePortalStore } from '../store/portalStore';
import { notify } from '../components/AnimatedNotification';

const priceRanges = [
  { value: 'all', label: 'جميع الأسعار' },
  { value: 'under100', label: 'أقل من 100 ج.م' },
  { value: '100-500', label: '100 – 500 ج.م' },
  { value: 'over500', label: 'أكثر من 500 ج.م' },
];

export default function ProductCatalog() {
  const location = useLocation();
  const navigate = useNavigate();
  const isPortal = location.pathname.includes('/portal');

  // Portal store (only used when isPortal)
  const { addToCart, toggleWishlist, wishlistIds } = usePortalStore();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState('all');
  const [addingId, setAddingId] = useState(null);
  const [wishlistLoading, setWishlistLoading] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const catParam = params.get('category');
    if (catParam) setSelectedCategory(catParam);
    loadData();
  }, [location.search, location.pathname]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isPortal) {
        const res = await portalApi.get('/portal/products?limit=100');
        setProducts(res.data.data.products || []);
        setCategories(res.data.data.categories?.map(c => typeof c === 'string' ? c : c.name) || []);
      } else {
        const [productsRes, categoriesRes] = await Promise.all([
          api.get('/products?isActive=true&limit=100'),
          api.get('/products/categories'),
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

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isPortal) return;
    if (product.stock?.quantity === 0) { notify.error('المنتج غير متوفر حالياً'); return; }
    setAddingId(product._id);
    addToCart(product, 1);
    notify.success(`تمت إضافة "${product.name}" للسلة 🛒`);
    setTimeout(() => setAddingId(null), 600);
  };

  const handleWishlist = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isPortal) return;
    setWishlistLoading(prev => ({ ...prev, [product._id]: true }));
    const res = await toggleWishlist(product._id);
    if (res.success) {
      notify.success(res.wishlisted ? 'تمت الإضافة للمفضلة ❤️' : 'تمت الإزالة من المفضلة');
    }
    setWishlistLoading(prev => ({ ...prev, [product._id]: false }));
  };

  const detailPath = (product) =>
    isPortal ? `/portal/products/${product._id}` : `/store/products/${product._id}`;

  return (
    <div className={`space-y-4 pb-20 ${isPortal ? '' : ''}`} dir={isPortal ? 'rtl' : undefined}>

      {/* ═══ PORTAL HEADER ═══ */}
      {isPortal ? (
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">🛍️ المنتجات</h2>
          <p className="text-sm text-gray-400">
            {filteredProducts.length} منتج متاح • {categories.length} قسم
          </p>
        </div>
      ) : (
        <div>
          <h1 className="text-3xl font-black mb-2">جميع المنتجات</h1>
          <p className="text-gray-500">تصفح مجموعتنا الكاملة من المنتجات</p>
        </div>
      )}

      {/* ═══ SEARCH BAR ═══ */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث عن منتج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-11 pl-10 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:border-primary-500 focus:outline-none transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 flex items-center gap-2 text-sm font-bold transition-all ${showFilters ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {isPortal ? '' : 'فلتر'}
        </button>
      </div>

      {/* ═══ CATEGORIES SCROLL ═══ */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${!selectedCategory ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}
        >
          الكل
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${selectedCategory === cat ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ═══ PRICE FILTER (collapsible) ═══ */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 animate-fade-in">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">نطاق السعر</p>
          <div className="flex flex-wrap gap-2">
            {priceRanges.map(r => (
              <button
                key={r.value}
                onClick={() => setPriceRange(r.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${priceRange === r.value ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-primary-50 hover:text-primary-600'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ RESULTS COUNT ═══ */}
      <p className="text-xs text-gray-400">
        عرض <span className="font-bold text-gray-700 dark:text-gray-300">{filteredProducts.length}</span> من {products.length} منتج
      </p>

      {/* ═══ PRODUCTS GRID ═══ */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-500 dark:text-gray-400">لا توجد منتجات</p>
          <p className="text-sm text-gray-400 mt-1">جرب تغيير معايير البحث</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => {
            const inWishlist = wishlistIds?.includes(product._id);
            const isAdding = addingId === product._id;
            const loadingHeart = wishlistLoading[product._id];
            const outOfStock = product.stock?.quantity === 0;

            return (
              <div
                key={product._id}
                className="bg-white dark:bg-gray-800/90 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300 group cursor-pointer"
                onClick={() => navigate(detailPath(product))}
              >
                {/* Image */}
                <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                  {(product.thumbnail || product.images?.[0]) ? (
                    <img
                      src={product.thumbnail || product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-300" />
                    </div>
                  )}

                  {/* Out of stock overlay */}
                  {outOfStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-bold">نفذت الكمية</span>
                    </div>
                  )}

                  {/* Category badge */}
                  {product.category && (
                    <span className="absolute top-2 left-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm text-gray-600 dark:text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {product.category}
                    </span>
                  )}

                  {/* ❤ Wishlist (portal only) */}
                  {isPortal && (
                    <button
                      onClick={(e) => handleWishlist(e, product)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    >
                      {loadingHeart ? (
                        <span className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <Heart className={`w-4 h-4 transition-colors ${inWishlist ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
                      )}
                    </button>
                  )}

                  {/* 🛒 Add to cart floating button */}
                  {isPortal && !outOfStock && (
                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-primary-500 text-white shadow-lg shadow-primary-500/30 flex items-center justify-center transition-all hover:bg-primary-600 hover:scale-110 active:scale-95 translate-y-10 group-hover:translate-y-0 duration-300"
                    >
                      {isAdding ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <ShoppingCart className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug mb-1">
                    {product.name}
                  </h3>

                  {/* Price row */}
                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <p className="text-lg font-black text-primary-600 leading-none">
                        {product.price.toLocaleString()}
                        <span className="text-xs text-gray-400 font-normal mr-0.5">ج.م</span>
                      </p>
                      {product.stock?.quantity > 0 && product.stock?.quantity <= 5 && (
                        <p className="text-[10px] text-orange-500 font-bold mt-0.5">آخر {product.stock.quantity} قطعة!</p>
                      )}
                    </div>
                    {product.stock?.quantity > 5 && (
                      <span className="text-[10px] text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">متوفر</span>
                    )}
                  </div>

                  {/* Add to cart row (always visible button below price) */}
                  {isPortal && (
                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      disabled={outOfStock}
                      className="w-full mt-2.5 py-2 rounded-xl bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      {outOfStock ? (
                        'نفذت الكمية'
                      ) : isAdding ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><ShoppingCart className="w-3.5 h-3.5" />أضف للسلة</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
