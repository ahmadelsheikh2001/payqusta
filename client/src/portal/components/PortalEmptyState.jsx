import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function PortalEmptyState({
    icon: Icon = PackageOpen,
    title = 'لا توجد بيانات',
    message = '',
    actionText,
    onAction,
    className = ''
}) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-[2rem] border border-gray-100 dark:border-gray-700/50 min-h-[300px] shadow-sm ${className}`}>
            <div className="w-20 h-20 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-500 flex items-center justify-center mb-4 border border-primary-100 dark:border-primary-800/30 shadow-inner">
                <Icon className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
            </h3>
            {message && (
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-6 font-medium">
                    {message}
                </p>
            )}
            {actionText && onAction && (
                <button
                    onClick={onAction}
                    className="px-6 py-2.5 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20 active:scale-95"
                >
                    {actionText}
                </button>
            )}
        </div>
    );
}
