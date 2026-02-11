import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Keyboard, ScanLine, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { Button, Input } from './UI';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

/**
 * Barcode Scanner Component
 * Supports:
 * - Camera scanning with ZXing (أقوى وأسرع)
 * - Image upload scanning
 * - Manual barcode entry
 * - USB keyboard barcode scanner input
 */
export default function BarcodeScanner({ onScan, onClose, autoFocus = true }) {
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  // Auto-focus input for keyboard scanner
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Keyboard barcode scanner buffer
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(0);

  // Listen for rapid keyboard input (barcode scanner)
  useEffect(() => {
    const handleKeyPress = (e) => {
      const now = Date.now();

      // If more than 100ms between keypresses, reset buffer
      if (now - lastKeyTime.current > 100) {
        barcodeBuffer.current = '';
      }
      lastKeyTime.current = now;

      // Handle Enter key
      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          handleBarcodeScan(barcodeBuffer.current);
          barcodeBuffer.current = '';
        }
        return;
      }

      // Add to buffer if alphanumeric
      if (e.key.length === 1 && /[a-zA-Z0-9-]/.test(e.key)) {
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);

  // Handle barcode scan
  const handleBarcodeScan = useCallback((code) => {
    setSuccess(`✅ تم مسح: ${code}`);
    setError('');

    // Stop scanner if running
    if (codeReaderRef.current && scanning) {
      try {
        codeReaderRef.current.reset();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      setScanning(false);
    }

    onScan(code);

    // Auto-close after 1 second
    setTimeout(() => {
      setSuccess('');
      onClose();
    }, 1000);
  }, [onScan, scanning, onClose]);

  // Manual entry submit
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim().length >= 3) {
      handleBarcodeScan(manualCode.trim());
      setManualCode('');
    } else {
      setError('الباركود يجب أن يكون 3 أحرف على الأقل');
    }
  };

  // Start camera scanning with ZXing
  const startCameraScanning = async () => {
    try {
      setScanning(true);
      setError('');

      console.log('🚀 Starting ZXing barcode scanner...');

      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      // Get video devices
      const videoInputDevices = await codeReader.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        throw new Error('لا توجد كاميرا متاحة');
      }

      // Use back camera if available
      const selectedDeviceId = videoInputDevices.length > 1
        ? videoInputDevices[videoInputDevices.length - 1].deviceId
        : videoInputDevices[0].deviceId;

      console.log('📸 Using camera:', selectedDeviceId);

      // Start decoding
      await codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            console.log('✅ Barcode detected:', result.getText());
            console.log('📋 Format:', result.getBarcodeFormat());
            handleBarcodeScan(result.getText());
          }

          // Ignore "not found" errors (normal during scanning)
          if (error && !(error instanceof NotFoundException)) {
            console.log('⚠️ Scan error:', error);
          }
        }
      );

      console.log('✅ ZXing scanner started successfully');
    } catch (err) {
      console.error('❌ Camera error:', err);
      setError('لا يمكن الوصول للكاميرا - تأكد من إعطاء الإذن للمتصفح');
      setScanning(false);
    }
  };

  // Stop camera
  const stopCameraScanning = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
        console.log('⏹️ Scanner stopped');
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      codeReaderRef.current = null;
    }
    setScanning(false);
  };

  // Handle image file upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      console.log('📤 Scanning uploaded image...');

      const codeReader = new BrowserMultiFormatReader();

      // Create a data URL from the file
      const imageUrl = URL.createObjectURL(file);

      // Create an image element
      const img = new Image();
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Decode from image
      const result = await codeReader.decodeFromImageElement(img);

      console.log('✅ Barcode from image:', result.getText());
      console.log('📋 Format:', result.getBarcodeFormat());

      handleBarcodeScan(result.getText());

      // Cleanup
      URL.revokeObjectURL(imageUrl);
    } catch (err) {
      console.error('❌ Image scan error:', err);
      setError('لم يتم العثور على باركود في الصورة - تأكد من وضوح الصورة');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary-500" />
            <h3 className="font-bold">مسح الباركود</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Status Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-xl text-sm">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          {/* Camera View */}
          {scanning ? (
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-32 border-2 border-primary-500 rounded-lg relative">
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary-500 animate-pulse" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Camera Button */}
              <button
                onClick={startCameraScanning}
                className="w-full p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all flex flex-col items-center gap-3"
              >
                <Camera className="w-8 h-8 text-gray-400" />
                <span className="text-gray-500">مسح بالكاميرا (ZXing)</span>
              </button>

              {/* Image Upload */}
              <label className="w-full p-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all flex flex-col items-center gap-3 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-gray-500">رفع صورة الباركود</span>
              </label>
            </div>
          )}

          {scanning && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-sm text-blue-700 dark:text-blue-300 text-center">
                📸 وجّه الكاميرا نحو الباركود - سيُقرأ تلقائياً
              </div>
              <div className="flex justify-center">
                <Button onClick={stopCameraScanning} variant="ghost">
                  <X className="w-4 h-4 ml-2" />
                  إيقاف المسح
                </Button>
              </div>
            </div>
          )}

          {/* Manual Entry */}
          <div className="relative">
            <div className="absolute inset-x-0 top-0 flex items-center justify-center">
              <span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400">أو أدخل يدوياً</span>
            </div>
            <hr className="border-gray-200 dark:border-gray-700 mt-2" />
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="flex-1">
              <Input
                ref={inputRef}
                placeholder="أدخل الباركود..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                icon={<Keyboard className="w-4 h-4" />}
              />
            </div>
            <Button type="submit">
              إضافة
            </Button>
          </form>

          {/* Instructions */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs text-gray-500 space-y-1">
            <p>💡 <strong>نصائح:</strong></p>
            <ul className="list-disc list-inside space-y-1 pr-2">
              <li>يمكنك استخدام قارئ الباركود USB مباشرة</li>
              <li>القارئ سيضيف المنتج تلقائياً عند المسح</li>
              <li>ZXing يدعم كل أنواع البراكود (EAN، UPC، CODE-128، QR، إلخ)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for barcode scanner input detection
 * Use this to detect barcode scanner input anywhere in the app
 */
export function useBarcodeScanner(onScan, enabled = true) {
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e) => {
      // Skip if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const now = Date.now();

      // If more than 50ms between keypresses, reset buffer (barcode scanners are fast)
      if (now - lastKeyTime.current > 50) {
        barcodeBuffer.current = '';
      }
      lastKeyTime.current = now;

      // Handle Enter key
      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          onScan(barcodeBuffer.current);
          barcodeBuffer.current = '';
          e.preventDefault();
        }
        return;
      }

      // Add to buffer if alphanumeric
      if (e.key.length === 1 && /[a-zA-Z0-9-]/.test(e.key)) {
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [enabled, onScan]);
}