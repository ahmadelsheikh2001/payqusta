import React from 'react';

export default function PortalSectionTitle({ title, subtitle, icon: Icon, action, className = '' }) {
    return (
        <div className={`flex items-center justify-between ${className}`}>
            <div>
                <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {Icon && <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary-500" />}
                    {title}
                </h2>
                {subtitle && (
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {subtitle}
                    </p>
                )}
            </div>
            {action && (
                <div>{action}</div>
            )}
        </div>
    );
}
