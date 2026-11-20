'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({ title, action, children, className, noPadding }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm border border-gray-100',
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          {title && (
            <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn(noPadding ? '' : 'p-5')}>{children}</div>
    </div>
  );
}
