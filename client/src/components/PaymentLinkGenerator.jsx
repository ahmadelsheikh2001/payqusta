/**
 * Payment Link Generator Component
 * Creates payment links for invoices with gateway selection
 */

import React, { useState, useEffect } from 'react';
import { X, Copy, Send, CreditCard, Smartphone, Building2, Zap, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { api } from '../store';

const GATEWAY_ICONS = {
  paymob: CreditCard,
  fawry: Building2,
  vodafone: Smartphone,
  instapay: Zap
};

const GATEWAY_NAMES = {
  paymob: 'Paymob (Visa/Mastercard)',
  fawry: 'Fawry (الدفع في المحلات)',
  vodafone: 'Vodafone Cash',
  instapay: 'InstaPay'
};

const PaymentLinkGenerator = ({ invoice, customer, onClose }) => {
  const [gateways, setGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState('');
  const [amount, setAmount] = useState(0);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState(null);
  const [copied, setCopied] = useState(false);

  // Calculate remaining amount
  const remainingAmount = invoice.totalAmount - invoice.paidAmount;

  useEffect(() => {
    // Fetch available gateways
    const fetchGateways = async () => {
      try {
        const { data } = await api.get('/payments/gateways');
        setGateways(data.data || []);
        if (data.data?.length > 0) {
          setSelectedGateway(data.data[0].id);
        }
      } catch (error) {
        toast.error('فشل تحميل بوابات الدفع');
      }
    };
    
    fetchGateways();
    setAmount(remainingAmount);
  }, [remainingAmount]);

  // Calculate fees and discount
  const selectedGatewayData = gateways.find(g => g.id === selectedGateway);
  const fees = selectedGatewayData ? (amount * selectedGatewayData.fees) / 100 : 0;
  const discount = applyDiscount ? (amount * 3) / 100 : 0; // 3% early discount
  const finalAmount = amount - discount + fees;

  const handleGenerate = async () => {
    if (!selectedGateway) {
      toast.error('اختر بوابة الدفع');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/payments/create-link', {
        invoiceId: invoice._id,
        gateway: selectedGateway,
        amount: amount,
        applyDiscount
      });

      setPaymentLink(data.data);
      toast.success('✅ تم إنشاء رابط الدفع');
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل إنشاء رابط الدفع');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (paymentLink?.paymentLink) {
      navigator.clipboard.writeText(paymentLink.paymentLink);
      setCopied(true);
      toast.success('تم النسخ!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendWhatsApp = () => {
    if (!paymentLink?.paymentLink) return;
    
    const message = `
مرحباً ${customer.name} 👋

فاتورة رقم: *${invoice.invoiceNumber}*
المبلغ المستحق: *${amount.toFixed(2)} جنيه*
${applyDiscount ? `\n🎁 خصم خاص ${discount.toFixed(2)} جنيه عند الدفع الآن!\nالمبلغ بعد الخصم: *${(amount - discount).toFixed(2)} جنيه*\n` : ''}

ادفع بسهولة عبر الرابط:
${paymentLink.paymentLink}

✅ طرق الدفع المتاحة
💳 ${GATEWAY_NAMES[selectedGateway]}

شكراً لثقتكم 💙
`.trim();

    const whatsappUrl = `https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (!invoice || !customer) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 left-4 text-white/80 hover:text-white transition"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold mb-2">إنشاء رابط دفع</h2>
            <p className="text-blue-100 text-sm">
              العميل: {customer.name}
            </p>
            <p className="text-blue-100 text-sm">
              الفاتورة: #{invoice.invoiceNumber}
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {gateways.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto mb-3 text-yellow-500" size={48} />
                <p className="text-gray-600 dark:text-gray-400">
                  لا توجد بوابات دفع مفعلة
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  قم بتفعيل بوابة دفع من الإعدادات
                </p>
              </div>
            ) : !paymentLink ? (
              <>
                {/* Gateway Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    اختر بوابة الدفع
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {gateways.map(gateway => {
                      const Icon = GATEWAY_ICONS[gateway.id];
                      const isSelected = selectedGateway === gateway.id;
                      
                      return (
                        <button
                          key={gateway.id}
                          onClick={() => setSelectedGateway(gateway.id)}
                          className={`
                            p-4 rounded-lg border-2 transition-all
                            ${isSelected 
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                            }
                          `}
                        >
                          <Icon className={`mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} size={24} />
                          <p className={`text-sm font-medium ${isSelected ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}>
                            {gateway.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            رسوم: {gateway.fees}%
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    المبلغ المطلوب
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    max={remainingAmount}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    المتبقي: {remainingAmount.toFixed(2)} جنيه
                  </p>
                </div>

                {/* Early Discount */}
                <label className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyDiscount}
                    onChange={(e) => setApplyDiscount(e.target.checked)}
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      خصم الدفع المبكر (3%)
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {applyDiscount ? `خصم: ${discount.toFixed(2)} جنيه` : 'غير مفعل'}
                    </p>
                  </div>
                </label>

                {/* Summary */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">المبلغ الأصلي</span>
                    <span className="font-medium">{amount.toFixed(2)} ج.م</span>
                  </div>
                  {applyDiscount && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>الخصم (3%)</span>
                      <span>- {discount.toFixed(2)} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">رسوم المعاملة</span>
                    <span className="font-medium">+ {fees.toFixed(2)} ج.م</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 flex justify-between font-bold text-lg">
                    <span>المبلغ النهائي</span>
                    <span className="text-blue-600">{finalAmount.toFixed(2)} ج.م</span>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={loading || !selectedGateway}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <CreditCard size={20} />
                      إنشاء رابط الدفع
                    </>
                  )}
                </button>
              </>
            ) : (
              /* Success - Show Link */
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="text-green-600" size={32} />
                  </div>
                  <h3 className="font-bold text-lg mb-1">تم إنشاء الرابط بنجاح!</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    صالح حتى: {new Date(paymentLink.expiresAt).toLocaleDateString('ar-EG')}
                  </p>
                </div>

                {/* Payment Link */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-2">رابط الدفع</p>
                  <p className="text-sm font-mono break-all text-gray-800 dark:text-gray-200">
                    {paymentLink.paymentLink}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    {copied ? <Check size={18} /> : < Copy size={18} />}
                    {copied ? 'تم النسخ' : 'نسخ'}
                  </button>
                  <button
                    onClick={handleSendWhatsApp}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Send size={18} />
                    إرسال واتساب
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentLinkGenerator;
