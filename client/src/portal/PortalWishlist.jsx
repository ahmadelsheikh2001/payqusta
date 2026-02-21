import React, { useEffect, useState } from 'react';
import { usePortalStore } from '../store/portalStore';
import { Heart, ShoppingBag, Package, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notify } from '../components/AnimatedNotification';
import PortalEmptyState from './components/PortalEmptyState';
import PortalSkeleton from './components/PortalSkeleton';

export default function PortalWishlist() {
    const { fetchWishlist, toggleWishlist, addToCart } = usePortalStore();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [removingId, setRemovingId] = useState(null);

    useEffect(() => {
        loadWishlist();
    }, []);

    const loadWishlist = async () => {
        setLoading(true);
        const items = await fetchWishlist();
        setProducts(items || []);
        setLoading(false);
    };

    const handleRemove = async (productId) => {
        setRemovingId(productId);
        const res = await toggleWishlist(productId);
        if (res.success) {
            setProducts(prev => prev.filter(p => p._id !== productId));
            notify.success('تمت الإزالة من المفضلة');
        }
        setRemovingId(null);
    };

    const handleAddToCart = (product) => {
        addToCart(product, 1);
        notify.success('تمت الإضافة للسلة');
    };

    return (
        <div className="space-y-4 pb-20" dir="rtl">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                    المفضلة
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">{products.length} منتج</span>
            </div>

            {loading ? (
                <PortalSkeleton count={4} type="card" className="mt-4" />
            ) : products.length === 0 ? (
                <PortalEmptyState
                    icon={Heart}
                    title="قائمة المفضلة فارغة"
                    message="احفظ المنتجات التي تعجبك هنا"
                    actionText="تصفح المنتجات"
                    onAction={() => navigate('/portal/products')}
                    className="my-8"
                />
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {products.map(product => (
                        <div
                            key={product._id}
                            className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm group"
                        >
                            {/* Image */}
                            <div
                                className="aspect-[4/3] bg-gray-100 dark:bg-gray-700 relative cursor-pointer"
                                onClick={() => navigate(`/portal/products/${product._id}`)}
                            >
                                {product.images?.[0] || product.thumbnail ? (
                                    <img
                                        src={product.images?.[0] || product.thumbnail}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-8 h-8 text-gray-300" />
                                    </div>
                                )}
                                {product.stock?.quantity === 0 && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-bold">نفذت الكمية</span>
                                    </div>
                                )}
                                {/* Remove Button */}
                                <button
                                    onClick={e => { e.stopPropagation(); handleRemove(product._id); }}
                                    disabled={removingId === product._id}
                                    className="absolute top-2 right-2 w-8 h-8 bg-white dark:bg-gray-900 rounded-full shadow flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition"
                                >
                                    {removingId === product._id
                                        ? <span className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                                        : <Trash2 className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Details */}
                            <div className="p-3">
                                <h4
                                    className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1 cursor-pointer hover:text-primary-600 mb-1"
                                    onClick={() => navigate(`/portal/products/${product._id}`)}
                                >
                                    {product.name}
                                </h4>
                                <p className="text-base font-black text-primary-600 mb-3">{product.price?.toLocaleString()} <span className="text-xs text-gray-400 font-normal">ج.م</span></p>
                                <button
                                    onClick={() => handleAddToCart(product)}
                                    disabled={product.stock?.quantity === 0}
                                    className="w-full py-2 rounded-xl bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ShoppingBag className="w-3.5 h-3.5" />
                                    أضف للسلة
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
