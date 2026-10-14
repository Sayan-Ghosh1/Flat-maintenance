import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading data...', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-10 space-y-4">
      <Loader2 className={`${sizeClasses[size]} text-indigo-500 animate-spin`} />
      {message && <p className="text-sm font-medium text-slate-400">{message}</p>}
    </div>
  );
};
