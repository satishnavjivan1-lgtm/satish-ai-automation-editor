'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'gray';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800 ring-green-600/20',
  warning: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  danger: 'bg-red-100 text-red-800 ring-red-600/20',
  info: 'bg-blue-100 text-blue-800 ring-blue-600/20',
  gray: 'bg-gray-100 text-gray-700 ring-gray-500/20',
};

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Map invoice status strings to badge variants */
export function statusVariant(
  status: string
): BadgeVariant {
  switch (status?.toUpperCase()) {
    case 'PAID':
      return 'success';
    case 'PARTIAL':
      return 'warning';
    case 'UNPAID':
    case 'OVERDUE':
      return 'danger';
    case 'DRAFT':
      return 'gray';
    default:
      return 'gray';
  }
}
