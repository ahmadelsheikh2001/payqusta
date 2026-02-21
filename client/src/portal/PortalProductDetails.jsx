import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePortalStore } from '../store/portalStore';
import {
    ArrowRight, Heart, ShoppingBag, Share2, Star,
    ShieldCheck, Truck, RotateCcw, ChevronRight, Package
} from 'lucide-react';
import { LoadingSpinner } from '../components/UI';
import PortalSkeleton from './components/PortalSkeleton';

export default function PortalProductDetails() {
    const { id } = useParams(); // can be slug or ID
    const navigate = useNavigate();
    const { fetchProductDetails, addToCart, toggleWishlist, wishlistIds } = usePortalStore();

    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        loadProduct();
    }, [id]);

    const loadProduct = async () => {
        setLoading(true);
        const data = await fetchProductDetails(id);
        if (data) {
            setProduct(data);
            if (data.hasVariants && data.variants?.length > 0) {
                setSelectedVariant(data.variants[0]);
            }

            // Fetch related products
            if (data.category) {
                const { fetchProducts } = usePortalStore.getState();
                const related = await fetchProducts(1, '', data.category);
                if (related && related.products) {
                    setRelatedProducts(related.products.filter(p => p._id !== data._id).slice(0, 4));
                }
            }
        }
        setLoading(false);
    };

    const handleAddToCart = () => {
        if (!product || (product.hasVariants && !selectedVariant)) return;

        // Check stock
        const availableStock = product.hasVariants ? selectedVariant?.stock : product.stock?.quantity;
        if (availableStock < quantity) return; // Or show error toast

        addToCart(product, quantity, selectedVariant);
        // Optional: show mini cart or toast
    };

    if (loading) {
        return (
            <div className="pb-24 animate-fade-in space-y-6" dir="rtl">
                <div className="sticky top-0 z-20 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-md pt-4 pb-4 px-4 flex items-center justify-between">
                    <PortalSkeleton className="w-10 h-10 rounded-full" />
                </div>
                <div className="px-4">
                    <PortalSkeleton className="w-full aspect-square rounded-[2rem] mb-6" />
                    <PortalSkeleton className="w-3/4 h-8 mb-4 rounded-lg" />
                    <PortalSkeleton className="w-1/4 h-8 mb-6 rounded-lg" />
                    <PortalSkeleton className="w-full h-24 rounded-2xl mb-6" />
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
                <Package className="w-16 h-16 text-gray-300 dark:text-gray-700" />
                <h2 className="text-xl font-bold dark:text-white">المنتج غير موجود</h2>
                <p className="text-sm text-gray-500">عذراً، لم نتمكن من العثور على المنتج المطلوب. ربما تم حذفه أو الرابط غير صحيح.</p>
                <button
                    onClick={() => navigate('/portal/products')}
                    className="mt-4 bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700"
                >
                    العودة للتسوق
                </button>
            </div>
        );
    }

    // Calculate current display price/stock based on selected variant
    const currentPrice = product.hasVariants && selectedVariant ? selectedVariant.price : product.price;
    const oldPrice = currentPrice * 1.25; // Mock discount display
    const currentStock = product.hasVariants && selectedVariant ? selectedVariant.stock : product.stock?.quantity;
    const isOutOfStock = currentStock === 0;

    // Gather all images: primary images + variant images if any
    const allImages = [...(product.images || [])];
    if (allImages.length === 0 && product.thumbnail) allImages.push(product.thumbnail);

    return (
        <div className="pb-32 animate-fade-in" dir="rtl">
            {/* Header */}
            <div className="absolute top-0 left-0 w-full z-20 flex items-center justify-between p-4 px-6">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex items-center justify-center shadow-md text-gray-900 dark:text-white hover:bg-white transition-colors"
                >
                    <ArrowRight className="w-5 h-5" />
                </button>
                <div className="flex gap-2">
                    <button className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex items-center justify-center shadow-md text-gray-900 dark:text-white hover:bg-white transition-colors">
                        <Share2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => toggleWishlist(product._id)}
                        className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex items-center justify-center shadow-md text-gray-900 dark:text-white hover:bg-white transition-colors"
                    >
                        <Heart className={`w-5 h-5 transition-colors ${wishlistIds?.includes(product._id) ? 'text-red-500 fill-red-500' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Hero Image Gallery */}
            <div className="relative w-full bg-gray-100 dark:bg-gray-800 rounded-b-[3rem] overflow-hidden shadow-sm">
                <div className="aspect-square md:aspect-[4/3] w-full relative">
                    {allImages.length > 0 ? (
                        <img
                            src={allImages[activeImage]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-300 dark:text-gray-600">
                            <Package className="w-20 h-20" />
                        </div>
                    )}
                </div>

                {/* Thumbnails */}
                {allImages.length > 1 && (
                    <div className="absolute bottom-6 left-0 w-full flex justify-center gap-2 px-4">
                        {allImages.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveImage(idx)}
                                className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shadow-md ${activeImage === idx ? 'border-primary-500 scale-110' : 'border-white/50 opacity-70 hover:opacity-100'
                                    }`}
                            >
                                <img src={img} alt="" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="px-5 pt-6 space-y-6">
                {/* Title & Price */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold px-2 py-1 bg-black text-white dark:bg-white dark:text-black rounded-md">
                            {product.category || 'عام'}
                        </span>
                        <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold">
                            <Star className="w-3 h-3 fill-yellow-500" />
                            4.8 <span className="text-gray-400 font-normal">(124)</span>
                        </div>
                    </div>

                    <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight mb-2">
                        {product.name}
                    </h1>

                    <div className="flex items-end gap-3">
                        <h2 className="text-3xl font-black text-primary-600 dark:text-primary-400">
                            {currentPrice?.toLocaleString()} <span className="text-base text-gray-500">ج.م</span>
                        </h2>
                        <span className="text-sm text-gray-400 line-through decoration-red-400 mb-1">
                            {oldPrice?.toLocaleString()} ج.م
                        </span>
                        <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md mb-1 border border-green-100 dark:border-green-800">
                            وفر 25%
                        </span>
                    </div>
                </div>

                {/* Guarantee / Perks */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 flex justify-between border border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col items-center gap-2 flex-1 border-l border-gray-200 dark:border-gray-700">
                        <ShieldCheck className="w-5 h-5 text-green-500" />
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 text-center">ضمان الوكيل</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 flex-1 border-l border-gray-200 dark:border-gray-700">
                        <Truck className="w-5 h-5 text-blue-500" />
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 text-center">شحن سريع</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 flex-1">
                        <RotateCcw className="w-5 h-5 text-orange-500" />
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 text-center">استرجاع 14 يوم</span>
                    </div>
                </div>

                {/* Variants */}
                {product.hasVariants && product.variants?.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 dark:text-white">اختر المواصفات:</h3>
                        <div className="flex flex-wrap gap-2">
                            {product.variants.map((variant, idx) => {
                                // Determine label from attributes map
                                let label = variant.sku;
                                if (variant.attributes) {
                                    const values = Object.values(variant.attributes);
                                    if (values.length > 0) label = values.join(' - ');
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedVariant(variant)}
                                        disabled={variant.stock === 0}
                                        className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${selectedVariant?._id === variant._id
                                            ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 ring-2 ring-primary-500/20'
                                            : variant.stock === 0
                                                ? 'border-gray-200 bg-gray-50 text-gray-400 opacity-50 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800/50'
                                                : 'border-gray-200 text-gray-700 bg-white hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Description */}
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 dark:text-white">الوصف</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {product.description || 'لا يوجد وصف متاح لهذا المنتج.'}
                    </p>
                    <button className="text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center gap-1 group">
                        قراءة المزيد <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Related Products */}
                {relatedProducts.length > 0 && (
                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">منتجات قد تعجبك</h3>
                            <button
                                onClick={() => navigate(`/portal/products?category=${product.category}`)}
                                className="text-xs font-bold text-primary-600 dark:text-primary-400"
                            >
                                عرض الكل
                            </button>
                        </div>

                        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory pr-2" style={{ scrollPaddingInlineStart: '0.5rem' }}>
                            {relatedProducts.map((relProd, i) => (
                                <div
                                    key={i}
                                    className="min-w-[140px] max-w-[140px] snap-start bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-sm cursor-pointer border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
                                    onClick={() => {
                                        navigate(`/portal/products/${relProd.slug || relProd._id}`);
                                        window.scrollTo(0, 0);
                                    }}
                                >
                                    <div className="aspect-square bg-gray-50 dark:bg-gray-900 rounded-xl mb-2 overflow-hidden">
                                        {relProd.thumbnail || relProd.images?.[0] ? (
                                            <img src={relProd.thumbnail || relProd.images[0]} alt={relProd.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex justify-center items-center h-full text-gray-300"><Package className="w-6 h-6" /></div>
                                        )}
                                    </div>
                                    <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 h-8 leading-tight mb-1">{relProd.name}</h4>
                                    <p className="text-sm font-black text-primary-600">{relProd.price?.toLocaleString()} <span className="text-[10px] font-normal text-gray-500">ج.م</span></p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Action Bar (Bottom Checkout) */}
            <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 px-6 pb-safe z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex items-center gap-4">

                {/* Quantity Selector */}
                {!isOutOfStock && (
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-1 w-28 h-12">
                        <button
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-8 h-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                        >
                            -
                        </button>
                        <span className="font-bold text-gray-900 dark:text-white">{quantity}</span>
                        <button
                            onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                            className="w-8 h-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white"
                        >
                            +
                        </button>
                    </div>
                )}

                {/* Add To Cart BTN */}
                <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className={`flex-1 h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md ${isOutOfStock
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500 shadow-none'
                        : 'bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 shadow-black/20 dark:shadow-white/10'
                        }`}
                >
                    {isOutOfStock ? (
                        'نفذت الكمية'
                    ) : (
                        <>
                            <ShoppingBag className="w-5 h-5" /> أضف للسلة ({(currentPrice * quantity).toLocaleString()})
                        </>
                    )}
                </button>
            </div>

        </div>
    );
}
