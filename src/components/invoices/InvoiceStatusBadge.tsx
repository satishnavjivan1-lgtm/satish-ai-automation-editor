import React from 'react';

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED' | 'UNPAID';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus | string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: 'Draft',     className: 'bg-gray-100 text-gray-700 border border-gray-300' },
  SENT:      { label: 'Sent',      className: 'bg-blue-100 text-blue-700 border border-blue-300' },
  PAID:      { label: 'Paid',      className: 'bg-green-100 text-green-700 border border-green-300' },
  PARTIAL:   { label: 'Partial',   className: 'bg-yellow-100 text-yellow-700 border border-yellow-300' },
  OVERDUE:   { label: 'Overdue',   className: 'bg-red-100 text-red-700 border border-red-300' },
  UNPAID:    { label: 'Unpaid',    className: 'bg-amber-100 text-amber-800 border border-amber-300' },
  CANCELLED: { label: 'Cancelled', className: 'bg-slate-100 text-slate-500 border border-slate-300 line-through' },
};

export function InvoiceStatusBadge({ status, size = 'sm' }: InvoiceStatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 border border-gray-200' };
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
}
