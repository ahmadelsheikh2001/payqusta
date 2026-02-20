import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, ArrowRight, Package } from 'lucide-react';
import { api } from '../store';
import { portalApi, usePortalStore } from '../store/portalStore'; // Import portal store
import { Card, Button, Badge, LoadingSpinner, Select } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isPortal = location.pathname.includes('/portal');
  
  const { addToCart: addToPortalCart } = usePortalStore(); // Portal Cart Action

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    loadProduct();
  }, [id]);

  useEffect(() => {
    if (product) {
      const initialImage = product.thumbnail || product.images?.[0] || null;
      setActiveImage(initialImage);
    }
  }, [product]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const apiClient = isPortal ? portalApi : api;
      const endpoint = isPortal ? `/portal/products/${id}` : `/products/${id}`;
      const res = await apiClient.get(endpoint);
      
      setProduct(res.data.data);
      
      if (res.data.data.hasVariants && res.data.data.variants?.length > 0) {
        setSelectedVariant(res.data.data.variants[0]);
      }
    } catch (err) {
      notify.error('فشل تحميل المنتج');
      navigate(isPortal ? '/portal/products' : '/store/products');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    if (isPortal) {
      addToPortalCart(product, quantity, selectedVariant);
      notify.success('تم إضافة المنتج للسلة');
      return;
    }

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartItem = {
      productId: product._id,
      name: product.name,
      price: selectedVariant?.price || product.price,
      quantity,
      image: activeImage || product.image, // Use active image
      variant: selectedVariant ? {
        id: selectedVariant._id,
        attributes: selectedVariant.attributes
      } : null
    };

    const existingIndex = cart.findIndex(item => 
      item.productId === cartItem.productId && 
      JSON.stringify(item.variant) === JSON.stringify(cartItem.variant)
    );

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push(cartItem);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    notify.success('تم إضافة المنتج للسلة');
  };

  const currentPrice = selectedVariant?.price || product?.price || 0;
  const currentStock = selectedVariant?.stock || product?.stock?.quantity || 0;
  const isOutOfStock = currentStock === 0;

  // Collect all unique images
  const allImages = [
    ...(product?.thumbnail ? [product.thumbnail] : []),
    ...(product?.images || [])
  ].filter((img, index, self) => self.indexOf(img) === index); // Deduplicate

  /* Zoom Logic */
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.target.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMousePos({ x, y });
    setIsZoomed(true);
  };

  const handleMouseLeave = () => {
    setIsZoomed(false);
  };

  if (loading) return <LoadingSpinner />;
  if (!product) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 animate-fade-in">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <button onClick={() => navigate(isPortal ? '/portal/products' : '/store/products')} className="hover:text-primary-600 transition-colors">
          المنتجات
        </button>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-200 font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Product Gallery (Left Column on LTR, Right on RTL) - Span 7 */}
        <div className="lg:col-span-7 space-y-6">
          <div className="aspect-square bg-gray-50 dark:bg-gray-800 rounded-3xl overflow-hidden relative group cursor-zoom-in border-2 border-transparent hover:border-primary-100 dark:hover:border-gray-700 transition-all">
            <div 
              className="w-full h-full"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal p-8 transition-transform duration-200"
                  style={{
                    transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                    transform: isZoomed ? 'scale(2)' : 'scale(1)',
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-32 h-32 text-gray-200 dark:text-gray-700" />
                </div>
              )}
            </div>
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                <div className="bg-red-500 text-white px-6 py-2 rounded-full font-bold text-lg shadow-lg transform -rotate-12">
                  نفذت الكمية
                </div>
              </div>
            )}
             {/* Zoom Hint */}
             <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                حرك الماوس للتكبير
              </div>
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    activeImage === img
                      ? 'border-primary-500 ring-2 ring-primary-500/20'
                      : 'border-transparent bg-gray-50 dark:bg-gray-800 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          
          {/* Description Section (Desktop) */}
          <div className="hidden lg:block mt-10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-primary-500 rounded-full"></span>
                وصف المنتج
            </h3>
            <div 
              className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/30 p-6 rounded-2xl"
              dangerouslySetInnerHTML={{ __html: product.description || '<p>لا يوجد وصف متاح لهذا المنتج.</p>' }}
            />
          </div>
        </div>

        {/* Product Info & Actions (Right Column) - Span 5 */}
        <div className="lg:col-span-5 space-y-8">
            {/* Header Info */}
            <div>
                {product.category && (
                    <Badge variant="neutral" className="mb-3 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {product.category}
                    </Badge>
                )}
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white leading-tight mb-4">
                    {product.name}
                </h1>
                
                {/* SKU & Barcode Inline */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-mono bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg w-fit">
                     {product.sku && <span>SKU: <span className="text-gray-700 dark:text-gray-300 select-all">{product.sku}</span></span>}
                     {product.sku && product.barcode && <span className="w-px h-3 bg-gray-300"></span>}
                     {product.barcode && <span>BARCODE: <span className="text-gray-700 dark:text-gray-300 select-all">{product.barcode}</span></span>}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-3xl border-2 border-gray-100 dark:border-gray-800 p-6 shadow-xl shadow-gray-100/50 dark:shadow-none sticky top-24">
                {/* Price */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-sm text-gray-500 mb-1">السعر</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-black text-primary-600 tracking-tight">
                                {currentPrice.toLocaleString('en-US')}
                            </span>
                            <span className="text-xl font-bold text-gray-400">ج.م</span>
                        </div>
                         {product.taxable && (
                            <p className="text-xs text-gray-400 mt-1">
                                {product.priceIncludesTax ? '(شامل الضريبة)' : `(+ ${product.taxRate}% ضريبة)`}
                            </p>
                        )}
                    </div>
                     {!isOutOfStock ? (
                        <div className="text-center bg-green-50 dark:bg-green-900/10 px-4 py-2 rounded-2xl">
                             <span className="block text-2xl font-bold text-green-600 dark:text-green-400">{currentStock}</span>
                             <span className="text-xs font-semibold text-green-600/70 dark:text-green-400/70">متوفر</span>
                        </div>
                     ) : (
                        <div className="text-center bg-red-50 dark:bg-red-900/10 px-4 py-2 rounded-2xl">
                             <span className="block text-2xl font-bold text-red-600 dark:text-red-400">0</span>
                             <span className="text-xs font-semibold text-red-600/70 dark:text-red-400/70">نفذ</span>
                        </div>
                     )}
                </div>

                {/* Variants Selection */}
                {product.hasVariants && product.variants?.length > 0 && (
                    <div className="mb-6 space-y-3">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">خيارات المنتج:</label>
                        <div className="grid grid-cols-2 gap-2">
                        {product.variants.map(variant => (
                            <button
                            key={variant._id}
                            onClick={() => setSelectedVariant(variant)}
                            disabled={variant.stock === 0}
                            className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex justify-between items-center ${
                                selectedVariant?._id === variant._id
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm'
                                : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 hover:border-gray-300'
                            } ${variant.stock === 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                            >
                                <span className="truncate">{Object.values(variant.attributes || {}).join(' / ')}</span>
                                {variant.stock > 0 && selectedVariant?._id !== variant._id && (
                                    <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500">
                                        {variant.price > product.price ? `+${(variant.price - product.price).toFixed(0)}` : ''}
                                    </span>
                                )}
                            </button>
                        ))}
                        </div>
                    </div>
                )}

                {/* Quantity & Add to Cart */}
                {!isOutOfStock ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <span className="text-sm font-bold text-gray-500 px-2">الكمية:</span>
                            <div className="flex-1 flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl shadow-sm p-1">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition">
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="font-bold text-lg w-8 text-center">{quantity}</span>
                                <button onClick={() => setQuantity(Math.min(currentStock, quantity + 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <Button 
                            onClick={addToCart} 
                            disabled={isOutOfStock} 
                            className="w-full h-14 text-lg rounded-2xl shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40 hover:-translate-y-0.5 transition-all"
                            icon={<ShoppingCart className="w-6 h-6" />}
                        >
                            أضف إلى السلة
                        </Button>
                    </div>
                ) : (
                    <button disabled className="w-full py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 font-bold cursor-not-allowed">
                        غير متوفر حالياً
                    </button>
                )}
            
                 {/* Expiry Warning */}
                 {product.expiryDate && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span>ينتهي الصلاحية في: <span className="font-bold font-mono text-base">{new Date(product.expiryDate).toLocaleDateString('en-GB')}</span></span>
                    </div>
                )}
            </div>

            {/* Description (Mobile Only) */}
            <div className="block lg:hidden pt-8 border-t border-gray-200 dark:border-gray-800">
                 <h3 className="text-xl font-bold mb-4">وصف المنتج</h3>
                 <div 
                    className="prose dark:prose-invert max-w-none text-gray-600 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: product.description || '<p>لا يوجد وصف متاح لهذا المنتج.</p>' }}
                 />
            </div>
        </div>
      </div>
    </div>
  );
}
