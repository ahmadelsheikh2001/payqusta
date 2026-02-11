import { useState, useEffect, useRef } from 'react';
import { Search, X, Package, Users, FileText, Truck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, useThemeStore } from '../store';

const ICON_MAP = {
  product: Package,
  customer: Users,
  invoice: FileText,
  supplier: Truck,
};

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { dark } = useThemeStore();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search on query change (debounced)
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(res.data.data);
        setSelectedIndex(0);
      } catch (err) {
        toast.error('فشل البحث');
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (!results) return;

      const allResults = [
        ...results.products,
        ...results.customers,
        ...results.invoices,
        ...results.suppliers,
      ];

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allResults.length) % allResults.length);
      } else if (e.key === 'Enter' && allResults[selectedIndex]) {
        e.preventDefault();
        handleSelectResult(allResults[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const handleSelectResult = (result) => {
    navigate(result.link);
    onClose();
    setQuery('');
    setResults(null);
  };

  const handleClose = () => {
    onClose();
    setQuery('');
    setResults(null);
  };

  if (!isOpen) return null;

  const allResults = results
    ? [
        ...results.products,
        ...results.customers,
        ...results.invoices,
        ...results.suppliers,
      ]
    : [];

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      />

      {/* Search Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className={`fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl rounded-2xl shadow-2xl z-50 overflow-hidden ${
          dark ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        {/* Search Input */}
        <div className={`relative p-4 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
          <Search className={`absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في المنتجات، العملاء، الفواتير، الموردين..."
            className={`w-full pr-12 pl-10 py-3 text-lg border-none focus:outline-none ${
              dark ? 'bg-gray-800 text-white placeholder-gray-500' : 'bg-white text-gray-900'
            }`}
            dir="rtl"
          />
          {loading && (
            <Loader2 className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
          )}
          {!loading && query && (
            <button
              onClick={() => setQuery('')}
              className={`absolute left-6 top-1/2 -translate-y-1/2 p-1 rounded-full ${
                dark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <X className={`w-4 h-4 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query.length < 2 ? (
            <div className={`p-8 text-center ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>ابدأ بالكتابة للبحث...</p>
            </div>
          ) : loading ? (
            <div className={`p-8 text-center ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-blue-500" />
              <p>جاري البحث...</p>
            </div>
          ) : results && allResults.length === 0 ? (
            <div className={`p-8 text-center ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد نتائج لـ "{query}"</p>
            </div>
          ) : results ? (
            <div className={`divide-y ${dark ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {/* Products */}
              {results.products.length > 0 && (
                <ResultSection
                  title="المنتجات"
                  icon={Package}
                  results={results.products}
                  selectedIndex={selectedIndex}
                  offset={0}
                  onSelect={handleSelectResult}
                  dark={dark}
                />
              )}

              {/* Customers */}
              {results.customers.length > 0 && (
                <ResultSection
                  title="العملاء"
                  icon={Users}
                  results={results.customers}
                  selectedIndex={selectedIndex}
                  offset={results.products.length}
                  onSelect={handleSelectResult}
                  dark={dark}
                />
              )}

              {/* Invoices */}
              {results.invoices.length > 0 && (
                <ResultSection
                  title="الفواتير"
                  icon={FileText}
                  results={results.invoices}
                  selectedIndex={selectedIndex}
                  offset={results.products.length + results.customers.length}
                  onSelect={handleSelectResult}
                  dark={dark}
                />
              )}

              {/* Suppliers */}
              {results.suppliers.length > 0 && (
                <ResultSection
                  title="الموردين"
                  icon={Truck}
                  results={results.suppliers}
                  selectedIndex={selectedIndex}
                  offset={
                    results.products.length +
                    results.customers.length +
                    results.invoices.length
                  }
                  onSelect={handleSelectResult}
                  dark={dark}
                />
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {results && allResults.length > 0 && (
          <div className={`p-3 border-t flex items-center justify-between text-xs ${
            dark
              ? 'bg-gray-900 border-gray-700 text-gray-400'
              : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <kbd className={`px-2 py-1 border rounded ${
                  dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                }`}>↑</kbd>
                <kbd className={`px-2 py-1 border rounded ${
                  dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                }`}>↓</kbd>
                للتنقل
              </span>
              <span className="flex items-center gap-1">
                <kbd className={`px-2 py-1 border rounded ${
                  dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                }`}>Enter</kbd>
                للاختيار
              </span>
              <span className="flex items-center gap-1">
                <kbd className={`px-2 py-1 border rounded ${
                  dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                }`}>Esc</kbd>
                للإغلاق
              </span>
            </div>
            <span>{results.total} نتيجة</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function ResultSection({ title, icon: Icon, results, selectedIndex, offset, onSelect, dark }) {
  return (
    <div className="p-3">
      <div className={`flex items-center gap-2 mb-2 text-xs font-semibold uppercase ${
        dark ? 'text-gray-400' : 'text-gray-500'
      }`}>
        <Icon className="w-4 h-4" />
        {title}
      </div>
      <div className="space-y-1">
        {results.map((result, idx) => {
          const globalIndex = offset + idx;
          const isSelected = selectedIndex === globalIndex;
          const ResultIcon = ICON_MAP[result.type];

          return (
            <button
              key={result._id}
              onClick={() => onSelect(result)}
              className={`w-full text-right p-3 rounded-lg transition-colors ${
                isSelected
                  ? dark
                    ? 'bg-blue-900 border border-blue-700'
                    : 'bg-blue-50 border border-blue-200'
                  : dark
                  ? 'hover:bg-gray-700 border border-transparent'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isSelected
                      ? dark
                        ? 'bg-blue-800'
                        : 'bg-blue-100'
                      : dark
                      ? 'bg-gray-700'
                      : 'bg-gray-100'
                  }`}
                >
                  <ResultIcon
                    className={`w-4 h-4 ${
                      isSelected
                        ? dark
                          ? 'text-blue-300'
                          : 'text-blue-600'
                        : dark
                        ? 'text-gray-300'
                        : 'text-gray-600'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${
                    dark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {result.displayText}
                  </p>
                  {result.type === 'product' && result.category && (
                    <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {result.category}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
