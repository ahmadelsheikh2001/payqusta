import React from 'react';

export default function PortalStat({
    label,
    value,
    subtitle,
    icon: Icon,
    color = "primary",
    className = ''
}) {
    const colorClasses = {
        primary: "bg-primary-50 dark:bg-primary-900/20 text-primary-500",
        green: "bg-green-50 dark:bg-green-900/20 text-green-500",
        red: "bg-red-50 dark:bg-red-900/20 text-red-500",
        blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-500",
        yellow: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-500",
        purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-500"
    };

    const iconColorClass = colorClasses[color] || colorClasses.primary;

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4 ${className}`}>
            {Icon && (
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColorClass}`}>
                    <Icon className="w-6 h-6" />
                </div>
            )}
            <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                <h4 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">{value}</h4>
                {subtitle && (
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
