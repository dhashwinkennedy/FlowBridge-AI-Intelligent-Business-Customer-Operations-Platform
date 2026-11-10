import React from 'react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; message?: string }> = ({ size = 'md', message }) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-7 h-7 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div className={`${sizeMap[size]} border-slate-700 border-t-brand-500 rounded-full animate-spin`} />
      {message && <p className="text-xs text-slate-400 font-mono tracking-wide">{message}</p>}
    </div>
  );
};
