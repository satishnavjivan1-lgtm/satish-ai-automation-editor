'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import {
  Menu,
  Plus,
  LayoutDashboard,
  FileText,
  Users,
  Layers,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyName, setCompanyName] = useState('Kundan ERP');

  const isAuthPage = pathname === '/login' || pathname === '/forgot-password';

  useEffect(() => {
    // Automatically close mobile menu on page transition
    setMobileMenuOpen(false);

    if (!isAuthPage) {
      fetch('/api/company')
        .then((r) => r.json())
        .then((d) => {
          if (d?.name) setCompanyName(d.name);
        })
        .catch(() => {});
    }
  }, [pathname, isAuthPage]);

  if (isAuthPage) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ─── Mobile Top Header (lg:hidden) ─── */}
      <header className="lg:hidden sticky top-0 z-30 h-14 bg-[#1e3a5f] text-white px-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="p-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-base tracking-wide truncate max-w-[190px]">
            {companyName}
          </span>
        </div>

        <Link
          href="/invoices/new"
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Bill</span>
        </Link>
      </header>

      {/* ─── Backdrop Overlay for Mobile Drawer ─── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ─── Responsive Sidebar (Desktop Fixed + Mobile Slide Drawer) ─── */}
      <div className="no-print">
        <Sidebar
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* ─── Main Content Container (Full Width on Mobile, lg:ml-64 on Desktop) ─── */}
      <div className="lg:ml-64 print:ml-0 print:p-0 flex flex-col flex-1 min-h-screen pb-16 lg:pb-0 transition-all">
        {children}
      </div>

      {/* ─── Mobile Bottom App Dock / Navigation Bar (lg:hidden) ─── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 flex items-center justify-around h-14 shadow-lg px-1"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={cn(
            'flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors',
            pathname === '/dashboard' ? 'text-blue-700 font-bold' : 'text-gray-500 hover:text-gray-900'
          )}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Dashboard</span>
        </Link>

        {/* Invoices */}
        <Link
          href="/invoices"
          className={cn(
            'flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors',
            pathname.startsWith('/invoices') && pathname !== '/invoices/new'
              ? 'text-blue-700 font-bold'
              : 'text-gray-500 hover:text-gray-900'
          )}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span>Invoices</span>
        </Link>

        {/* Floating Center Button: Quick Bill */}
        <Link
          href="/invoices/new"
          className="flex flex-col items-center justify-center -mt-5 mx-1"
        >
          <div className="w-12 h-12 rounded-full bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 active:scale-95 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-blue-700 mt-0.5">New Bill</span>
        </Link>

        {/* Parties */}
        <Link
          href="/parties"
          className={cn(
            'flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors',
            pathname.startsWith('/parties') ? 'text-blue-700 font-bold' : 'text-gray-500 hover:text-gray-900'
          )}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Parties</span>
        </Link>

        {/* Menu (Open Drawer) */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <Layers className="w-5 h-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}
