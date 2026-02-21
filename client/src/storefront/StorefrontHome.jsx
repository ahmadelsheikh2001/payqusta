import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, TrendingUp, Star, ArrowRight } from 'lucide-react';
import { api } from '../store';
import { Card, LoadingSpinner, Badge } from '../components/UI';

export default function StorefrontHome() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, settingsRes] = await Promise.all([
        api.get('/products?limit=8&isActive=true'),
        api.get('/settings')
      ]);
      setFeaturedProducts(productsRes.data.data);
      setSettings(settingsRes.data.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-3xl p-12 text-white text-center">
        <h1 className="text-4xl md:text-5xl font-black mb-4">
          مرحباً بك في {settings?.store?.name || 'متجرنا'}
        </h1>
        <p className="text-xl opacity-90 mb-8">
          اكتشف أفضل المنتجات بأسعار مميزة
        </p>
        <Link
          to="/store/products"
          className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-shadow"
        >
          تصفح المنتجات
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 text-center">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-bold text-lg mb-2">توصيل سريع</h3>
          <p className="text-gray-500 text-sm">نوصل طلبك في أسرع وقت</p>
        </Card>
        <Card className="p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-bold text-lg mb-2">جودة عالية</h3>
          <p className="text-gray-500 text-sm">منتجات مضمونة 100%</p>
        </Card>
        <Card className="p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-bold text-lg mb-2">أسعار تنافسية</h3>
          <p className="text-gray-500 text-sm">أفضل الأسعار في السوق</p>
        </Card>
      </section>

      {/* Featured Products */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black">المنتجات المميزة</h2>
          <Link to="/store/products" className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            عرض الكل
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map(product => (
            <Link key={product._id} to={`/store/products/${product._id}`}>
              <Card className="group hover:shadow-xl transition-shadow overflow-hidden">
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
      </section>
    </div>
  );
}
