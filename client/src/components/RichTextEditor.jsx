import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function RichTextEditor({ value, onChange, label, className = '' }) {
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align',
    'color', 'background'
  ];

  return (
    <div className={`rich-text-editor ${className}`}>
      {label && <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{label}</label>}
      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 focus-within:border-primary-500 transition-colors">
        <ReactQuill 
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          className="text-gray-900 dark:text-gray-100"
        />
      </div>
      <style>{`
        .ql-toolbar {
          border: none !important;
          border-bottom: 2px solid #e5e7eb !important;
          background: #f9fafb;
        }
        .dark .ql-toolbar {
          border-color: #374151 !important;
          background: #1f2937;
        }
        .ql-container {
          border: none !important;
          min-height: 150px;
          font-family: inherit !important;
          font-size: 1rem !important;
        }
        .ql-editor {
          min-height: 150px;
        }
        .dark .ql-stroke {
          stroke: #9ca3af !important;
        }
        .dark .ql-fill {
          fill: #9ca3af !important;
        }
        .dark .ql-picker {
          color: #9ca3af !important;
        }
      `}</style>
    </div>
  );
}
