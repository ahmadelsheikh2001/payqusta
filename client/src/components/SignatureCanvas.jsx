/**
 * Signature Canvas Component
 * Digital signature capture for field collectors
 */

import React, { useRef, useState } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const SignatureCanvas = ({ onSave, onClose }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    ctx.beginPath();
    ctx.moveTo(
      e.clientX - rect.left || e.touches[0].clientX - rect.left,
      e.clientY - rect.top || e.touches[0].clientY - rect.top
    );
    
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    ctx.lineTo(
      e.clientX - rect.left || e.touches[0].clientX - rect.left,
      e.clientY - rect.top || e.touches[0].clientY - rect.top
    );
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const save = () => {
    if (isEmpty) return;
    
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png');
    onSave(dataURL);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white dark:bg-gray-800 rounded-t-3xl md:rounded-2xl w-full md:max-w-lg p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
            التوقيع الرقمي
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <X size={24} />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          وقع بإصبعك أو القلم في المربع أدناه
        </p>

        {/* Canvas */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg mb-4 bg-white">
          <canvas
            ref={canvasRef}
            width={500}
            height={250}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full cursor-crosshair touch-none"
            style={{ touchAction: 'none' }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={clear}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            <RotateCcw size={18} />
            مسح
          </button>
          
          <button
            onClick={save}
            disabled={isEmpty}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-bold transition"
          >
            <Check size={18} />
            حفظ التوقيع
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SignatureCanvas;
