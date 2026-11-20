'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, Calendar } from 'lucide-react';

interface HeaderProps {
  title: string;
}

function formatTodayDate(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      {/* Page Title */}
      <h1 className="text-lg font-semibold text-gray-800">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Date */}
        <div className="hidden sm:flex items-center gap-1.5 text-gray-500 text-sm">
          <Calendar className="w-4 h-4" />
          <span>{formatTodayDate()}</span>
        </div>

        {/* Quick action */}
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </Link>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-blue-700 text-xs font-bold">AD</span>
        </div>
      </div>
    </header>
  );
}
