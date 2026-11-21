'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ActionLoaderProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
}

export function ActionLoader({
  isOpen,
  title = 'પ્રોસેસિંગ ચાલુ છે...',
  subtitle = 'કૃપા કરીને રાહ જુઓ, ડેટા સેવ થઈ રહ્યો છે...',
}: ActionLoaderProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 sm:p-8 max-w-sm w-full mx-auto flex flex-col items-center text-center space-y-4">
        {/* Animated Icon Ring */}
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-3 h-3 bg-blue-600 rounded-full animate-ping" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    </div>
  );
}
