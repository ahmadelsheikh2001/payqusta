import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { Card, Button, EmptyState } from '../components/UI';

export default function ShoppingCart() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPortal = location.pathname.includes('/portal');
  const [cart, setCart] = useState([]);

  useEffect(() => {
    loadCart();
    
    const handleCartUpdate = () => loadCart();
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  const loadCart = () => {
    const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(cartData);
  };

  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    const updatedCart = [...cart];
    updatedCart[index].quantity = newQuantity;
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    setCart(updatedCart);
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const removeItem = (index) => {
    const updatedCart = cart.filter((_, i) => i !== index);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    setCart(updatedCart);
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const clearCart = () => {
    if (window.confirm('هل تريد إفراغ السلة؟')) {
      localStorage.setItem('cart', JSON.stringify([]));
      setCart([]);
      window.dispatchEvent(new Event('cartUpdated'));
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.14; // 14% VAT
  const total = subtotal + tax;

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          icon={<ShoppingBag className="w-16 h-16" />}
          title="سلة التسوق فارغة"
          description="لم تقم بإضافة أي منتجات بعد"
        />
        <div className="text-center mt-6">
          <Button onClick={() => navigate(isPortal ? '/portal/products' : '/store/products')}>
            تصفح المنتجات
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black">سلة التسوق</h1>
        <button
          onClick={clearCart}
          className="text-red-500 hover:text-red-600 text-sm font-medium"
        >
          إفراغ السلة
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="flex gap-4">
                {/* Product Image */}
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                  {item.variant && (
                    <p className="text-sm text-gray-500 mb-2">
                      {Object.entries(item.variant.attributes || {}).map(([key, value]) => (
                        <span key={key} className="mr-2">{value}</span>
                      ))}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-lg font-bold w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-left">
                      <div className="text-xl font-black text-primary-600">
                        {(item.price * item.quantity).toFixed(2)} ج.م
                      </div>
                      <div className="text-xs text-gray-400">
                        {item.price.toFixed(2)} ج.م × {item.quantity}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeItem(index)}
                  className="text-red-500 hover:text-red-600 p-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-20">
            <h2 className="text-xl font-bold mb-4">ملخص الطلب</h2>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي:</span>
                <span className="font-bold">{subtotal.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>الضريبة (14%):</span>
                <span className="font-bold">{tax.toFixed(2)} ج.م</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between text-lg">
                <span className="font-bold">الإجمالي:</span>
                <span className="font-black text-primary-600 text-2xl">{total.toFixed(2)} ج.م</span>
              </div>
            </div>

            <Button
              onClick={() => navigate(isPortal ? '/portal/checkout' : '/store/checkout')}
              className="w-full"
              size="lg"
              icon={<ArrowRight className="w-5 h-5" />}
            >
              إتمام الطلب
            </Button>

            <button
              onClick={() => navigate(isPortal ? '/portal/products' : '/store/products')}
              className="w-full mt-3 text-center text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              متابعة التسوق
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
