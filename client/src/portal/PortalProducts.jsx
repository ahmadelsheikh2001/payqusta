import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import {
    Search, Filter, ShoppingBag, Heart, Package,
    ArrowRight, SlidersHorizontal, ChevronDown
} from 'lucide-react';
import { LoadingSpinner } from '../components/UI';
import PortalEmptyState from './components/PortalEmptyState';
import PortalSkeleton from './components/PortalSkeleton';

export default function PortalProducts() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { fetchProducts, addToCart, toggleWishlist, wishlistIds } = usePortalStore();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('category') ? '' : (searchParams.get('search') || ''));
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Mock categories (since the generic portal stats endpoint returns them, we might just hardcode a few common ones or extract from products)
    // In a real scenario, we'd fetch categories from an API
    const [categories, setCategories] = useState([
        { name: 'الكل', slug: '' },
        { name: 'إلكترونيات', slug: 'electronics' },
        { name: 'موبايلات', slug: 'mobiles' },
        { name: 'أجهزة منزلية', slug: 'home-appliances' },
        { name: 'أثاث', slug: 'furniture' },
    ]);

    useEffect(() => {
        // If URL params change, reset and fetch
        const cat = searchParams.get('category') || '';
        const q = searchParams.get('search') || '';
        setSelectedCategory(cat);
        if (!cat) setSearch(q);

        setPage(1);
        setProducts([]);
        loadProducts(1, q, cat, true);
    }, [searchParams]);

    const loadProducts = async (pageNum, query, cat, isNewSearch = false) => {
        setLoading(true);
        const res = await fetchProducts(pageNum, query, cat);
        if (res) {
            if (isNewSearch) {
                setProducts(res.products || []);
            } else {
                setProducts(prev => [...prev, ...(res.products || [])]);
            }
            setHasMore(res.page < res.totalPages);
        }
        setLoading(false);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setSearchParams(search ? { search } : {});
    };

    const handleCategoryClick = (slug) => {
        setSearchParams(slug ? { category: slug } : {});
    };

    return (
        <div className="pb-24 animate-fade-in space-y-6" dir="rtl">
            {/* Header & Search */}
            <div className="sticky top-0 z-20 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-md pt-4 pb-4 -mx-4 px-4 space-y-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-800"
                    >
                        <ArrowRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                    <h1 className="text-xl font-black text-gray-900 dark:text-white flex-1">المنتجات</h1>
                    <button className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-800 relative">
                        <SlidersHorizontal className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <div className="absolute top-2 right-2 w-2 h-2 bg-primary-500 rounded-full border border-white dark:border-gray-800"></div>
                    </button>
                </div>

                <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ابحث عن منتج، علامة تجارية..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl py-3.5 pr-12 pl-4 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all shadow-sm text-sm"
                    />
                </form>

                {/* Categories Horizontal Scroll */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {categories.map((cat, i) => (
                        <button
                            key={i}
                            onClick={() => handleCategoryClick(cat.slug)}
                            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors ${selectedCategory === cat.slug
                                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                                    : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products Grid */}
            {loading && page === 1 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => <PortalSkeleton key={i} className="h-64 rounded-3xl" />)}
                </div>
            ) : products.length === 0 ? (
                <PortalEmptyState
                    icon={Package}
                    title="لم نجد أي منتجات"
                    message={search ? `لم نعثر على نتائج مطابقة لبحثك عن "${search}"` : "لا توجد منتجات متاحة في هذا القسم حالياً"}
                    actionLabel="عرض كل المنتجات"
                    onAction={() => handleCategoryClick('')}
                />
            ) : (
                <div className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {products.map((product, i) => (
                            <div
                                key={i}
                                className="bg-white dark:bg-gray-800 rounded-3xl p-3 shadow-sm hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 group cursor-pointer border border-gray-100 dark:border-gray-700/50"
                                onClick={() => navigate(`/portal/products/${product.slug || product._id}`)}
                            >
                                {/* Image */}
                                <div className="aspect-[4/5] bg-gray-50 dark:bg-gray-900/50 rounded-2xl mb-3 relative overflow-hidden">
                                    {product.thumbnail || product.images?.[0] ? (
                                        <img
                                            src={product.thumbnail || product.images[0]}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-300 dark:text-gray-600">
                                            <Package className="w-10 h-10" />
                                        </div>
                                    )}

                                    {/* Badges */}
                                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                                        {product.stock?.quantity < product.stock?.minQuantity && product.stock?.quantity > 0 && (
                                            <span className="bg-orange-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-md">
                                                كمية محدودة
                                            </span>
                                        )}
                                        {product.stock?.quantity === 0 && (
                                            <span className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-md">
                                                نفذت الكمية
                                            </span>
                                        )}
                                    </div>

                                    {/* Add to Cart Btn */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (product.stock?.quantity > 0) addToCart(product);
                                        }}
                                        disabled={product.stock?.quantity === 0}
                                        className="absolute bottom-3 right-3 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-900 dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all md:translate-y-12 md:group-hover:translate-y-0 duration-300 z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ShoppingBag className="w-5 h-5" />
                                    </button>

                                    {/* Wishlist */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleWishlist(product._id).catch(() => { }); }}
                                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center transition-all md:opacity-0 md:group-hover:opacity-100 hover:scale-110 shadow-sm"
                                    >
                                        <Heart className={`w-4 h-4 transition-colors ${wishlistIds?.includes(product._id) ? 'text-red-500 fill-red-500' : 'text-gray-600 dark:text-gray-300'}`} />
                                    </button>
                                </div>

                                {/* Details */}
                                <div className="px-1">
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug mb-2 h-10">
                                        {product.name}
                                    </h4>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            {product.cost > 0 && product.price > product.cost && (
                                                <p className="text-[10px] text-gray-400 line-through decoration-red-400">
                                                    {(product.price * 1.2).toLocaleString()} {/* Just a mockup for old price */}
                                                </p>
                                            )}
                                            <p className="text-lg font-black text-gray-900 dark:text-white">
                                                {product.price?.toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">ج.م</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Load More */}
                    {hasMore && (
                        <div className="flex justify-center pt-4">
                            <button
                                onClick={() => {
                                    setPage(p => p + 1);
                                    loadProducts(page + 1, search, selectedCategory);
                                }}
                                disabled={loading}
                                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                            >
                                {loading ? <LoadingSpinner size="sm" /> : 'عرض المزيد'}
                                {!loading && <ChevronDown className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
