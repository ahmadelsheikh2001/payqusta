import React from 'react';

export default function PortalSkeleton({ count = 3, type = 'card', className = '' }) {
    const Skeletons = Array.from(new Array(count));

    return (
        <div className={`w-full ${type === 'card' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'} ${className}`}>
            {Skeletons.map((_, i) => (
                <div key={i} className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-100 dark:border-gray-700/50 rounded-[2rem] p-4 shadow-sm animate-pulse">
                    {type === 'card' && (
                        <>
                            <div className="w-full h-40 bg-gray-200 dark:bg-gray-700/50 rounded-2xl mb-4" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700/50 rounded-md w-3/4 mb-2" />
                            <div className="h-3 bg-gray-200 dark:bg-gray-700/50 rounded-md w-1/2 mb-4" />
                            <div className="flex justify-between items-end mt-4">
                                <div className="h-6 bg-gray-200 dark:bg-gray-700/50 rounded-lg w-1/3" />
                                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700/50 rounded-full" />
                            </div>
                        </>
                    )}

                    {type === 'list' && (
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700/50 rounded-full shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700/50 rounded-md w-1/2" />
                                <div className="h-3 bg-gray-200 dark:bg-gray-700/50 rounded-md w-1/3" />
                            </div>
                            <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700/50 rounded-xl" />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
