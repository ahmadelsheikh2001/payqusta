import React, { useState } from 'react';
import { Calculator, DollarSign, Calendar, PieChart, RefreshCw, CreditCard } from 'lucide-react';

const durationOptions = [
    { months: 3, label: '3 شهور' },
    { months: 6, label: '6 شهور' },
    { months: 9, label: '9 شهور' },
    { months: 12, label: '12 شهر' },
    { months: 18, label: '18 شهر' },
    { months: 24, label: '24 شهر' },
];

export default function PortalInstallmentCalculator() {
    const [totalAmount, setTotalAmount] = useState('');
    const [downPayment, setDownPayment] = useState('');
    const [duration, setDuration] = useState(6);
    const [interestRate, setInterestRate] = useState(0); // 0% interest by default, can be admin fee

    const calculate = () => {
        const total = parseFloat(totalAmount) || 0;
        const down = parseFloat(downPayment) || 0;

        if (total <= 0) return null;

        const remainingAmount = Math.max(0, total - down);

        // Simple admin fee/interest calculation (flat rate per year)
        // interest = remaining * rate * (months / 12)
        const adminFee = remainingAmount * (interestRate / 100);

        const finalAmount = remainingAmount + adminFee;
        const monthlyInstallment = duration > 0 ? finalAmount / duration : 0;

        return {
            total,
            down,
            remainingAmount,
            adminFee,
            finalAmount,
            monthlyInstallment,
        };
    };

    const result = calculate();

    return (
        <div className="space-y-6 pb-20" dir="rtl">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calculator className="w-6 h-6 text-primary-500" />
                    حاسبة الأقساط
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    احسب أقساطك الشهرية بسهولة بناءً على المبلغ والمقدم.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Input Form */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">إجمالي المبلغ *</label>
                        <div className="relative">
                            <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="number"
                                value={totalAmount}
                                onChange={(e) => setTotalAmount(e.target.value)}
                                placeholder="مثلاً 5000"
                                className="w-full px-10 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition font-bold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">الدفعة المقدمة (اختياري)</label>
                        <div className="relative">
                            <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="number"
                                value={downPayment}
                                onChange={(e) => setDownPayment(e.target.value)}
                                placeholder="مثلاً 1000"
                                className="w-full px-10 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none transition font-bold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">مدة التقسيط</label>
                        <div className="grid grid-cols-3 gap-2">
                            {durationOptions.map((opt) => (
                                <button
                                    key={opt.months}
                                    onClick={() => setDuration(opt.months)}
                                    className={`p-2 rounded-xl text-sm font-bold border-2 transition-all ${duration === opt.months
                                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                            : 'border-transparent bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Admin Fee / Interest Toggle (Hidden from user, but logical) */}
                    {/* 
           <div className="flex items-center gap-2">
             <input 
               type="checkbox" 
               checked={interestRate > 0} 
               onChange={(e) => setInterestRate(e.target.checked ? 5 : 0)} 
               className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
             />
             <label className="text-sm text-gray-600 dark:text-gray-400">إضافة مصاريف إدارية (5%)</label>
           </div>
           */}
                </div>

                {/* Results */}
                <div className="bg-primary-600 dark:bg-primary-900/50 rounded-2xl p-6 text-white relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                    <div>
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <PieChart className="w-5 h-5" />
                            النتيجة التقديرية
                        </h3>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-white/20 pb-2">
                                <span className="text-white/80 text-sm">مبلغ التمويل (بعد المقدم)</span>
                                <span className="font-bold">{result?.remainingAmount?.toLocaleString() || 0} ج.م</span>
                            </div>

                            {/* If we had fees */}
                            {result?.adminFee > 0 && (
                                <div className="flex justify-between items-center border-b border-white/20 pb-2">
                                    <span className="text-white/80 text-sm">مصاريف إدارية</span>
                                    <span className="font-bold">{result?.adminFee?.toLocaleString() || 0} ج.م</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center pb-2">
                                <span className="text-white/80 text-sm">مدة التقسيط</span>
                                <span className="font-bold">{duration} شهور</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                        <p className="text-sm text-white/90 mb-1">القسط الشهري المتوقع</p>
                        <p className="text-3xl font-black">{result?.monthlyInstallment?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0} <span className="text-base font-normal">ج.م</span></p>
                    </div>

                    <p className="text-[10px] text-white/60 mt-4 text-center">
                        * هذه الحسبة تقديرية وقد تختلف قليلاً عند التنفيذ الفعلي بناءً على سياسة المتجر.
                    </p>
                </div>
            </div>
        </div>
    );
}
