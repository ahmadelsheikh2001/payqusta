/**
 * Photo Upload Component
 * Captures and uploads receipt photos
 */

import React, { useRef, useState } from 'react';
import { Camera, Upload, X, Check, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const PhotoUpload = ({ onUpload, onClose }) => {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار صورة');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً (الحد الأقصى 5 ميجا)');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleGallery = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!preview) return;

    setUploading(true);
    try {
      // In production, upload to server or cloud storage
      // For now, return base64
      onUpload(preview);
      toast.success('تم رفع الصورة');
    } catch (error) {
      toast.error('فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setPreview(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-2xl w-full md:max-w-md p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
            تحميل صورة الإيصال
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <X size={24} />
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Preview or Upload Options */}
        {preview ? (
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
              <img
                src={preview}
                alt="Receipt preview"
                className="w-full h-64 object-contain bg-gray-50 dark:bg-gray-900"
              />
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleClear}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
              >
                اختر صورة أخرى
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-bold flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الرفع...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    تأكيد
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Camera Button */}
            <button
              onClick={handleCapture}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition"
            >
              <Camera size={24} />
              التقط صورة
            </button>

            {/* Gallery Button */}
            <button
              onClick={handleGallery}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              <ImageIcon size={24} />
              اختر من المعرض
            </button>

            {/* Info */}
            <p className="text-sm text-gray-500 text-center mt-4">
              حجم الصورة الأقصى: 5 ميجابايت
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PhotoUpload;
