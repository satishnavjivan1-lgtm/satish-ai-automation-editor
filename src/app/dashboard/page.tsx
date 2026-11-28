'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  AlertCircle,
  ArrowUpCircle,
  BarChart2,
  Plus,
  Eye,
  MessageCircle,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge, statusVariant } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DashboardData {
  totalSales: number;
  totalReceivables: number;
  totalPayables: number;
  netProfit: number;
  recentTransactions: {
    id: number;
    date: string;
    invoiceNo: string;
    party: string;
    amount: number;
    status: string;
  }[];
  overduePayments: {
    id: number;
    party: string;
    phone: string;
    invoiceNo: string;
    daysOverdue: number;
    amount: number;
  }[];
}

async function getDashboardData(): Promise<DashboardData> {
  try {
    const res = await fetch('/api/dashboard', {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  } catch {
    // Return empty placeholder data when API unavailable during build
    return {
      totalSales: 0,
      totalReceivables: 0,
      totalPayables: 0,
      netProfit: 0,
      recentTransactions: [],
      overduePayments: [],
    };
  }
}

interface KpiCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}

function KpiCard({ title, value, icon: Icon, colorClass, bgClass }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgClass}`}>
        <Icon className={`w-6 h-6 ${colorClass}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium mb-0.5">{title}</p>
        <p className={`text-xl font-bold ${colorClass}`}>
          {formatCurrency(value)}
        </p>
      </div>
    </div>
  );
}

const quickActions = [
  { label: '+ New Invoice', href: '/invoices/new', color: 'bg-blue-700 hover:bg-blue-800 text-white' },
  { label: '+ Job Work Challan', href: '/inventory/jobwork/new', color: 'bg-amber-500 hover:bg-amber-600 text-white' },
  { label: '+ Record Payment', href: '/payments/new', color: 'bg-green-600 hover:bg-green-700 text-white' },
  { label: '+ Add Expense', href: '/expenses/new', color: 'bg-red-600 hover:bg-red-700 text-white' },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    totalSales: 0,
    totalReceivables: 0,
    totalPayables: 0,
    netProfit: 0,
    recentTransactions: [],
    overduePayments: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard', { cache: 'no-store' })
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dashboard:', err);
        setLoading(false);
      });
  }, []);

  const kpiCards: KpiCardProps[] = [
    {
      title: 'Total Sales This Month',
      value: data.totalSales,
      icon: TrendingUp,
      colorClass: 'text-blue-700',
      bgClass: 'bg-blue-50',
    },
    {
      title: 'Total Receivables',
      value: data.totalReceivables,
      icon: AlertCircle,
      colorClass: 'text-amber-600',
      bgClass: 'bg-amber-50',
    },
    {
      title: 'Total Payables',
      value: data.totalPayables,
      icon: ArrowUpCircle,
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50',
    },
    {
      title: 'Net Profit',
      value: data.netProfit,
      icon: BarChart2,
      colorClass: data.netProfit >= 0 ? 'text-green-600' : 'text-red-600',
      bgClass: data.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
  ];

  return (
    <div className="flex flex-col flex-1">
      <Header title="Dashboard" />

      <main className="flex-1 p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => (
            <KpiCard key={kpi.title} {...kpi} />
          ))}
        </div>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${action.color}`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card title="Recent Transactions" noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Invoice #</th>
                  <th className="px-4 py-3 font-semibold">Party</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(!data.recentTransactions || data.recentTransactions.length === 0) ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-10 text-gray-400"
                    >
                      No recent transactions
                    </td>
                  </tr>
                ) : (
                  data.recentTransactions.map((tx, idx) => (
                    <tr
                      key={tx.id}
                      className={`hover:bg-blue-50 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-4 py-3 font-mono text-blue-700 font-medium">
                        {tx.invoiceNo}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{tx.party}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(tx.status)}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/invoices/${tx.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Overdue Payments */}
        <Card title="Overdue Payments" noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-semibold">Party</th>
                  <th className="px-4 py-3 font-semibold">Invoice #</th>
                  <th className="px-4 py-3 font-semibold">Days Overdue</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold">WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(!data.overduePayments || data.overduePayments.length === 0) ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-10 text-gray-400"
                    >
                      No overdue payments 🎉
                    </td>
                  </tr>
                ) : (
                  data.overduePayments.map((op, idx) => (
                    <tr
                      key={op.id}
                      className={`hover:bg-blue-50 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {op.party}
                      </td>
                      <td className="px-4 py-3 font-mono text-blue-700 font-medium">
                        {op.invoiceNo}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-red-600 font-semibold">
                          {op.daysOverdue} days
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-700">
                        {formatCurrency(op.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://wa.me/91${op.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
