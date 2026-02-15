import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Package, Phone, MapPin, Calendar } from 'lucide-react';
import axios from 'axios';
import { Card, Button, Badge, LoadingSpinner } from '../components/UI';

export default function OrderConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/invoices/${id}`);
      setOrder(res.data.data);
    } catch (err) {
      console.error('Failed to load order:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return <div className="text-center">لم يتم العثور على الطلب</div>;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Success Message */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-black mb-2">تم تأكيد طلبك!</h1>
        <p className="text-gray-500">شكراً لك، سنتواصل معك قريباً</p>
      </div>

      {/* Order Details */}
      <Card className="p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold mb-1">رقم الطلب</h2>
            <p className="text-3xl font-black text-primary-600">{order.invoiceNumber}</p>
          </div>
          <Badge variant="success">تم التأكيد</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm text-gray-500">رقم الهاتف</div>
              <div className="font-bold">{order.customer?.phone}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm text-gray-500">تاريخ الطلب</div>
              <div className="font-bold">
                {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
          {order.customer?.address && (
            <div className="flex items-start gap-3 md:col-span-2">
              <MapPin className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <div className="text-sm text-gray-500">عنوان التوصيل</div>
                <div className="font-bold">{order.customer.address}</div>
              </div>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Package className="w-5 h-5" />
            المنتجات المطلوبة
          </h3>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="font-medium">{item.product?.name || 'منتج'}</div>
                  <div className="text-sm text-gray-500">الكمية: {item.quantity}</div>
                </div>
                <div className="font-bold">{item.totalPrice.toFixed(2)} ج.م</div>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4 space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>المجموع الفرعي:</span>
            <span className="font-bold">{order.subtotal.toFixed(2)} ج.م</span>
          </div>
          {order.taxAmount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>الضريبة:</span>
              <span className="font-bold">{order.taxAmount.toFixed(2)} ج.م</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>الخصم:</span>
              <span className="font-bold">-{order.discount.toFixed(2)} ج.م</span>
            </div>
          )}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-lg">
            <span className="font-bold">الإجمالي:</span>
            <span className="font-black text-primary-600 text-2xl">{order.totalAmount.toFixed(2)} ج.م</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">طريقة الدفع:</span>
            <Badge variant={order.paymentMethod === 'cash' ? 'warning' : 'success'}>
              {order.paymentMethod === 'cash' ? 'الدفع عند الاستلام' : 'مدفوع'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={() => navigate('/store')} className="flex-1">
          العودة للرئيسية
        </Button>
        <Button onClick={() => navigate('/store/products')} variant="outline" className="flex-1">
          متابعة التسوق
        </Button>
      </div>
    </div>
  );
}
