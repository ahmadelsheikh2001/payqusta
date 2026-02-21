import React from 'react';

export default function PortalInput({
    label,
    error,
    helperText,
    id,
    className = '',
    containerClassName = '',
    icon: Icon,
    ...props
}) {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    const baseInputClasses = "w-full rounded-xl border bg-white dark:bg-gray-900 transition-all focus:outline-none text-sm";
    const paddingClasses = Icon ? "px-10 py-2.5" : "px-4 py-2.5";
    const stateClasses = hasError
        ? "border-red-300 dark:border-red-800 text-red-900 dark:text-red-100 placeholder-red-300 dark:placeholder-red-700 focus:border-red-500 focus:ring-red-500"
        : "border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:ring-primary-500";

    return (
        <div className={`space-y-1.5 ${containerClassName}`}>
            {label && (
                <label htmlFor={inputId} className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Icon className={`h-5 w-5 ${hasError ? 'text-red-400' : 'text-gray-400'}`} />
                    </div>
                )}
                <input
                    id={inputId}
                    className={`${baseInputClasses} ${paddingClasses} ${stateClasses} ${className}`}
                    {...props}
                />
            </div>
            {(error || helperText) && (
                <p className={`text-xs ${hasError ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {error || helperText}
                </p>
            )}
        </div>
    );
}
