import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, User, MapPin, Phone, Mail, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { Card, Button, Input, LoadingSpinner } from '../components/UI';
import { notify } from '../components/AnimatedNotification';

export default function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    paymentMethod: 'cash'
  });

  useEffect(() => {
    const cartData = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cartData.length === 0) {
      navigate('/store/cart');
      return;
    }
    setCart(cartData);
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.14;
  const total = subtotal + tax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.customerName || !form.phone) {
      notify.error('الرجاء إدخال الاسم ورقم الهاتف');
      return;
    }

    setLoading(true);
    try {
      // Create customer if doesn't exist
      let customerId;
      try {
        const customerRes = await axios.post('/api/v1/customers', {
          name: form.customerName,
          phone: form.phone,
          email: form.email || undefined,
          address: form.address || undefined
        });
        customerId = customerRes.data.data._id;
      } catch (err) {
        // Customer might already exist, search by phone
        const searchRes = await axios.get(`/api/v1/customers?search=${form.phone}`);
        if (searchRes.data.data.length > 0) {
          customerId = searchRes.data.data[0]._id;
        } else {
          throw err;
        }
      }

      // Create invoice
      const invoiceData = {
        customer: customerId,
        items: cart.map(item => ({
          productId: item.productId,
          variantId: item.variant?.id,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity
        })),
        paymentMethod: form.paymentMethod,
        notes: form.notes,
        source: 'online_store'
      };

      const invoiceRes = await axios.post('/api/v1/invoices', invoiceData);
      const invoice = invoiceRes.data.data;

      // Clear cart
      localStorage.setItem('cart', JSON.stringify([]));
      window.dispatchEvent(new Event('cartUpdated'));

      // If payment gateway selected, create payment link
      if (form.paymentMethod === 'online') {
        const paymentRes = await axios.post('/api/v1/payments/create-link', {
          invoiceId: invoice._id,
          amount: invoice.totalAmount,
          customerName: form.customerName,
          customerPhone: form.phone,
          customerEmail: form.email
        });
        
        // Redirect to payment gateway
        window.location.href = paymentRes.data.data.paymentUrl;
      } else {
        // Navigate to success page
        navigate(`/store/order/${invoice._id}`);
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'فشل إنشاء الطلب');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) return <LoadingSpinner />;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-black mb-6">إتمام الطلب</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                معلومات العميل
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="الاسم الكامل *"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  required
                />
                <Input
                  label="رقم الهاتف *"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
                <Input
                  label="البريد الإلكتروني"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Input
                  label="العنوان"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="mt-4">
                <Input
                  label="ملاحظات إضافية"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="أي ملاحظات خاصة بالطلب..."
                />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                طريقة الدفع
              </h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:border-primary-500 transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={form.paymentMethod === 'cash'}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-bold">الدفع عند الاستلام</div>
                    <div className="text-sm text-gray-500">ادفع نقداً عند استلام الطلب</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:border-primary-500 transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    checked={form.paymentMethod === 'online'}
                    onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-bold">الدفع الإلكتروني</div>
                    <div className="text-sm text-gray-500">ادفع الآن عبر بوابة الدفع الآمنة</div>
                  </div>
                </label>
              </div>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-20">
              <h2 className="text-xl font-bold mb-4">ملخص الطلب</h2>
              
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      {item.variant && (
                        <div className="text-xs text-gray-400">
                          {Object.values(item.variant.attributes || {}).join(', ')}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">الكمية: {item.quantity}</div>
                    </div>
                    <div className="font-bold text-left">
                      {(item.price * item.quantity).toFixed(2)} ج.م
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>المجموع الفرعي:</span>
                  <span className="font-bold">{subtotal.toFixed(2)} ج.م</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>الضريبة (14%):</span>
                  <span className="font-bold">{tax.toFixed(2)} ج.م</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-lg">
                  <span className="font-bold">الإجمالي:</span>
                  <span className="font-black text-primary-600 text-2xl">{total.toFixed(2)} ج.م</span>
                </div>
              </div>

              <Button
                type="submit"
                loading={loading}
                className="w-full mt-6"
                size="lg"
                icon={<CheckCircle className="w-5 h-5" />}
              >
                {form.paymentMethod === 'online' ? 'الدفع الآن' : 'تأكيد الطلب'}
              </Button>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
