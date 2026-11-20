'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Factory,
  CreditCard,
  Receipt,
  BarChart2,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Parties', href: '/parties', icon: Users },
  { label: 'Inventory', href: '/inventory', icon: Package },
  { label: 'Job Work', href: '/inventory/jobwork', icon: Factory },
  { label: 'Payments', href: '/payments', icon: CreditCard },
  { label: 'Expenses', href: '/expenses', icon: Receipt },
  {
    label: 'Reports',
    icon: BarChart2,
    children: [
      { label: 'P&L Statement', href: '/reports/pl' },
      { label: 'GSTR-1', href: '/reports/gstr1' },
      { label: 'Stock Report', href: '/reports/stock' },
    ],
  },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function NavLink({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
        active
          ? 'bg-blue-700/30 text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-1 before:bg-blue-400 before:rounded-r'
          : 'text-blue-100 hover:bg-white/10 hover:text-white'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export function Sidebar({
  isOpen = false,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [reportsOpen, setReportsOpen] = useState(
    () => pathname.startsWith('/reports')
  );
  const [companyName, setCompanyName] = useState('Navjivan ERP');
  const [companyCity, setCompanyCity] = useState('Jamnagar, Gujarat');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/company')
      .then((r) => r.json())
      .then((d) => {
        if (d?.name) setCompanyName(d.name);
        if (d?.city) setCompanyCity(`${d.city}, ${d.state || 'Gujarat'}`);
        if (d?.logoUrl) setCompanyLogo(d.logoUrl);
      })
      .catch(() => { });
  }, []);

  const initials =
    companyName
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 3)
      .join('')
      .toUpperCase() || 'ERP';

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 w-64 flex flex-col z-50 overflow-y-auto transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
      style={{ backgroundColor: '#1e3a5f' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10 shrink-0">
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
          {companyLogo ? (
            <img src={companyLogo} alt="Logo" className="w-full h-full object-contain bg-white rounded-lg p-0.5" />
          ) : (
            <div className="w-full h-full bg-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold tracking-wide">{initials}</span>
            </div>
          )}
        </div>
        <div className="overflow-hidden flex-1">
          <p className="text-white text-sm font-semibold leading-tight truncate">{companyName}</p>
          <p className="text-blue-300 text-xs truncate">{companyCity}</p>
        </div>

        {/* Mobile Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          if (item.children) {
            const childActive = item.children.some((c) => pathname.startsWith(c.href));
            return (
              <div key={item.label}>
                <button
                  onClick={() => setReportsOpen((v) => !v)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    childActive
                      ? 'bg-blue-700/30 text-white'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {reportsOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
                {reportsOpen && (
                  <div className="ml-7 mt-0.5 space-y-0.5">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={cn(
                          'block px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                          pathname === child.href
                            ? 'bg-blue-700/30 text-white'
                            : 'text-blue-200 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.label}
              href={item.href!}
              icon={item.icon}
              label={item.label}
              onClick={onClose}
              active={
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href!)
              }
            />
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="px-3 py-2 border-t border-white/10 shrink-0">
        <button
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            } catch {
              window.location.href = '/login';
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-200 hover:bg-red-500/20 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0 text-red-400" />
          <span>લૉગ આઉટ (Log Out)</span>
        </button>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 shrink-0">
        <p className="text-blue-300/80 text-xs text-center">{companyName} ERP v1.0</p>
      </div>
    </aside>
  );
}
