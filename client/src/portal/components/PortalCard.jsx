import React from 'react';

export default function PortalCard({
    children,
    className = '',
    onClick,
    hover = false,
    padding = 'p-4',
    ...props
}) {
    const baseClasses = "bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all";
    const hoverClasses = hover ? "hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md cursor-pointer" : "";

    return (
        <div
            className={`${baseClasses} ${hoverClasses} ${padding} ${className}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </div>
    );
}
