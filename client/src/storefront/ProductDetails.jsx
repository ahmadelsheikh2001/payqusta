import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, ArrowRight, Package } from 'lucide-react';
import axios from 'axios';
import { Card, Button, Badge, LoadingSpinner, Select } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/products/${id}`);
      setProduct(res.data.data);
      
      // Select first variant if product has variants
      if (res.data.data.hasVariants && res.data.data.variants?.length > 0) {
        setSelectedVariant(res.data.data.variants[0]);
      }
    } catch (err) {
      notify.error('فشل تحميل المنتج');
      navigate('/store/products');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    const cartItem = {
      productId: product._id,
      name: product.name,
      price: selectedVariant?.price || product.price,
      quantity,
      image: product.image,
      variant: selectedVariant ? {
        id: selectedVariant._id,
        attributes: selectedVariant.attributes
      } : null
    };

    // Check if item already exists
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

  if (loading) return <LoadingSpinner />;
  if (!product) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/store/products')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowRight className="w-4 h-4" />
        العودة للمنتجات
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Image */}
        <div>
          <Card className="overflow-hidden">
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-gray-300" />
                </div>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Badge variant="danger" className="text-lg px-6 py-2">نفذت الكمية</Badge>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            {product.category && (
              <p className="text-sm text-gray-500 mb-2">{product.category}</p>
            )}
            <h1 className="text-3xl font-black mb-3">{product.name}</h1>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Price */}
          <div className="border-y border-gray-200 dark:border-gray-700 py-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-primary-600">
                {currentPrice.toFixed(2)}
              </span>
              <span className="text-xl text-gray-500">ج.م</span>
            </div>
            {product.taxable && (
              <p className="text-sm text-gray-400 mt-1">
                {product.priceIncludesTax ? 'شامل الضريبة' : `+ ${product.taxRate}% ضريبة`}
              </p>
            )}
          </div>

          {/* Variants */}
          {product.hasVariants && product.variants?.length > 0 && (
            <div className="space-y-3">
              <label className="block font-bold">اختر المواصفات:</label>
              <div className="grid grid-cols-2 gap-3">
                {product.variants.map(variant => (
                  <button
                    key={variant._id}
                    onClick={() => setSelectedVariant(variant)}
                    disabled={variant.stock === 0}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      selectedVariant?._id === variant._id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                    } ${variant.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-sm font-medium">
                      {Object.entries(variant.attributes || {}).map(([key, value]) => (
                        <span key={key}>{value} </span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {variant.stock > 0 ? `متوفر: ${variant.stock}` : 'نفذت الكمية'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock Info */}
          {!isOutOfStock && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="success">متوفر</Badge>
              <span className="text-gray-500">الكمية المتاحة: {currentStock}</span>
            </div>
          )}

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="space-y-3">
              <label className="block font-bold">الكمية:</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                  className="w-10 h-10 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Add to Cart Button */}
          <Button
            onClick={addToCart}
            disabled={isOutOfStock}
            className="w-full"
            size="lg"
            icon={<ShoppingCart className="w-5 h-5" />}
          >
            {isOutOfStock ? 'نفذت الكمية' : 'أضف للسلة'}
          </Button>

          {/* Product Details */}
          <Card className="p-4 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-bold mb-3">تفاصيل المنتج</h3>
            <div className="space-y-2 text-sm">
              {product.sku && (
                <div className="flex justify-between">
                  <span className="text-gray-500">رقم المنتج:</span>
                  <span className="font-mono">{product.sku}</span>
                </div>
              )}
              {product.barcode && (
                <div className="flex justify-between">
                  <span className="text-gray-500">الباركود:</span>
                  <span className="font-mono">{product.barcode}</span>
                </div>
              )}
              {product.category && (
                <div className="flex justify-between">
                  <span className="text-gray-500">الفئة:</span>
                  <span>{product.category}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
