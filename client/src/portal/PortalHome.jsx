import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePortalStore } from '../store/portalStore';
import { useThemeStore } from '../store';
import {
  CreditCard, Calendar, ArrowLeft, ShoppingBag, Receipt, FileText,
  User, Star, Search, ShoppingCart, Heart, Bell,
  ChevronRight, ArrowRight, Tag, Zap, ShieldCheck, Package, MessageCircle, X
} from 'lucide-react';
import { LoadingSpinner } from '../components/UI';

export default function PortalHome() {
  const { fetchDashboard, loading, customer, addToCart, toggleWishlist, wishlistIds } = usePortalStore();
  const { dark } = useThemeStore();
  const [data, setData] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const res = await fetchDashboard();
    if (res) setData(res);
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">جاري تجهيز المتجر...</p>
      </div>
    );
  }

  const { wallet, upcomingInstallments, categories, products, store } = data;
  const currencyLabel = wallet?.currency === 'EGP' ? 'ج.م' : wallet?.currency;

  // Dynamic colors
  const primaryColor = store?.primaryColor || '#6366f1';
  const secondaryColor = store?.secondaryColor || '#10b981';

  return (
    <div className="pb-24 animate-fade-in space-y-6" dir="rtl">

      {/* ═══════════════ SEARCH & HERO ═══════════════ */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative cursor-text" onClick={() => setIsSearchOpen(true)}>
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <div className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl py-4 pr-12 pl-4 shadow-sm text-sm text-gray-400 text-right">
            عن ماذا تبحث اليوم؟
          </div>
        </div>

        {/* Hero Banner */}
        <div className="relative rounded-[2rem] overflow-hidden shadow-xl h-56 md:h-80 group">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
            style={{
              backgroundImage: `url(${store?.coverImage || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80'})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />

          <div className="absolute inset-0 p-8 flex flex-col justify-center items-start text-white max-w-lg">
            <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full mb-4 border border-white/10">
              عروض حصرية
            </span>
            <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
              موسم <br />
              <span style={{ color: secondaryColor }}>التخفيضات</span> الكبرى
            </h1>
            <p className="text-white/80 mb-6 text-sm font-medium line-clamp-2 max-w-xs hidden md:block">
              استخدم رصيدك المتاح وتمتع بتقسيط مريح على جميع المنتجات الجديدة.
            </p>
            <button
              onClick={() => navigate('/portal/products')}
              className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors shadow-lg shadow-white/10 flex items-center gap-2"
            >
              تسوق الآن <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════ CATEGORIES ═══════════════ */}
      <div>
        <div className="flex items-center justify-between px-2 mb-4">
          <h3 className="font-bold text-lg dark:text-white">تصفح الأقسام</h3>
          <Link to="/portal/products" className="text-xs font-bold text-primary-600">عرض الكل</Link>
        </div>
        {/* Added pr-2 and snap scroll, adjusted width to show half-cards */}
        <div className="flex gap-4 overflow-x-auto px-2 pb-4 no-scrollbar snap-x snap-mandatory pr-2" style={{ scrollPaddingInlineStart: '0.5rem' }}>
          {categories?.length > 0 ? categories.map((cat, i) => (
            <Link key={i} to={`/portal/products?category=${cat.slug}`} className="flex flex-col items-center gap-2 group min-w-[85px] max-w-[85px] snap-start">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-gray-800 p-1 group-hover:bg-primary-50 transition-colors border border-gray-100 dark:border-gray-700 group-hover:border-primary-200 shadow-sm flex items-center justify-center">
                {/* Since we don't have real category images yet, use a nice icon/placeholder */}
                <div className="w-full h-full rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center text-primary-500 overflow-hidden">
                  {/* If we had images: <img ... /> */}
                  <Tag className="w-8 h-8 opacity-70 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary-600 text-center line-clamp-1 w-full px-1">{cat.name}</span>
            </Link>
          )) : (
            <div className="w-full text-center py-4 text-gray-400 text-xs">لا توجد أقسام متاحة</div>
          )}
        </div>
      </div>

      {/* ═══════════════ FEATURED PRODUCTS GRID ═══════════════ */}
      <div className="bg-gray-50 dark:bg-gray-800/50 -mx-4 px-4 py-8 rounded-t-[2.5rem]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-xl dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            منتجات مختارة لك
          </h3>
          <Link to="/portal/products" className="text-xs font-bold text-primary-600 dark:text-primary-400">عرض الكل</Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => navigate('/portal/orders')} className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-1.5 hover:border-primary-300 transition group">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">طلباتي</span>
          </button>
          <button onClick={() => navigate('/portal/wishlist')} className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-1.5 hover:border-red-300 transition group">
            <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">المفضلة</span>
          </button>
          <button onClick={() => navigate('/portal/statement')} className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-1.5 hover:border-blue-300 transition group">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5 text-indigo-500" />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">كشف الحساب</span>
          </button>
          <button onClick={() => navigate('/portal/support')} className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-1.5 hover:border-green-300 transition group">
            <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageCircle className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">تواصل معنا</span>
          </button>
        </div>

        {!products?.length ? (
          <div className="text-center py-10 opacity-60">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium">لا توجد منتجات متاحة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((product, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl p-3 shadow-sm hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 group">
                {/* Image */}
                <div className="aspect-[4/5] bg-gray-100 dark:bg-gray-700 rounded-2xl mb-3 relative overflow-hidden cursor-pointer" onClick={() => navigate(`/portal/products/${product.slug}`)}>
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-300">
                      <Package className="w-10 h-10" />
                    </div>
                  )}

                  {/* Floating Add Btn */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
                    className="absolute bottom-3 right-3 w-10 h-10 bg-white dark:bg-gray-900 rounded-full shadow-lg flex items-center justify-center text-gray-900 dark:text-white hover:bg-primary-600 hover:text-white transition-all md:translate-y-12 md:group-hover:translate-y-0 duration-300 z-10"
                  >
                    <ShoppingBag className="w-5 h-5" />
                  </button>

                  {/* Wishlist */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleWishlist(product._id).catch(() => { }); }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center transition-all md:opacity-0 md:group-hover:opacity-100 hover:scale-110"
                  >
                    <Heart className={`w-4 h-4 transition-colors ${wishlistIds?.includes(product._id) ? 'text-red-500 fill-red-500' : 'text-gray-600 dark:text-gray-300'}`} />
                  </button>
                </div>

                {/* Details */}
                <div className="px-1">
                  <div className="flex justify-between items-start mb-1 h-10">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug cursor-pointer" onClick={() => navigate(`/portal/products/${product.slug}`)}>{product.name}</h4>
                  </div>
                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <p className="text-[10px] text-gray-400 line-through decoration-red-400">{(product.price * 1.2).toLocaleString()}</p>
                      <p className="text-lg font-black text-gray-900 dark:text-white">{product.price.toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">{currencyLabel}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/portal/products" className="inline-flex items-center gap-2 text-sm font-bold text-white bg-black dark:bg-gray-700 px-8 py-4 rounded-2xl hover:bg-gray-800 transition-colors">
            عرض كل المنتجات <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ═══════════════ UPCOMING PAYMENTS (Mini) ═══════════════ */}
      {upcomingInstallments?.length > 0 && (
        <div className="px-1">
          {(() => {
            const hasOverdue = upcomingInstallments.some(inst => new Date(inst.dueDate) < new Date());
            const bgColor = hasOverdue ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30' : 'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/30';
            const iconBg = hasOverdue ? 'bg-red-100 dark:bg-red-800/20 text-red-600' : 'bg-orange-100 dark:bg-orange-800/20 text-orange-600';

            return (
              <div className={`rounded-3xl p-6 border ${bgColor}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-bold ${hasOverdue ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {hasOverdue ? 'أقساط متأخرة الدفع!' : 'تذكير بالدفع'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {hasOverdue ? 'يرجى سداد الأقساط المتأخرة لتجنب غرامات التأخير' : 'لديك أقساط مستحقة قريباً'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {upcomingInstallments.slice(0, 2).map((inst, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg text-gray-900 dark:text-white">{new Date(inst.dueDate).getDate()}</span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">قسط مستحق</span>
                          <span className="text-[10px] text-gray-500">{new Date(inst.dueDate).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>
                      <span className="font-black text-orange-600">{inst.amount.toLocaleString()} {currencyLabel}</span>
                    </div>
                  ))}

                  <Link to="/portal/invoices" className="block text-center text-xs font-bold text-orange-600 mt-2 hover:underline">
                    عرض كل الأقساط
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════════ SEARCH MODAL ═══════════════ */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-gray-950 animate-fade-in pb-safe">
          {/* Header */}
          <div className="bg-white dark:bg-gray-900 px-4 py-3 shadow-sm flex items-center gap-3">
            <button
              onClick={() => setIsSearchOpen(false)}
              className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن منتجات، أقسام..."
                className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-primary-500/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    navigate(`/portal/products?q=${encodeURIComponent(searchQuery)}`);
                    setIsSearchOpen(false);
                  }
                }}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Quick Suggestions */}
          <div className="flex-1 overflow-y-auto p-4">
            {!searchQuery ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 mb-3 px-1">عمليات بحث شائعة</h4>
                  <div className="flex flex-wrap gap-2">
                    {['عروض', 'جديد', ...categories?.slice(0, 3).map(c => c.name) || []].map((term, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          navigate(`/portal/products?q=${encodeURIComponent(term)}`);
                          setIsSearchOpen(false);
                        }}
                        className="px-4 py-2 bg-white dark:bg-gray-800 rounded-xl text-sm font-medium border border-gray-100 dark:border-gray-700 shadow-sm"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Category Suggestions */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 mb-3 px-1">تصفح حسب القسم</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {categories?.slice(0, 4).map((cat, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          navigate(`/portal/products?category=${cat.slug}`);
                          setIsSearchOpen(false);
                        }}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
                      >
                        <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 text-primary-500 rounded-lg flex items-center justify-center">
                          <Tag className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-right flex-1 line-clamp-1">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 opacity-60">
                <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium">اضغط Enter للبحث عن "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
