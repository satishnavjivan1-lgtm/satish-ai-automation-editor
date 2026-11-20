'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Download } from 'lucide-react'
import { exportToCSV } from '@/lib/export'

const fmtINR = (n: number) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)

// Default: current financial year (Apr-Mar)
const currentFY = () => {
  const now = new Date()
  const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return {
    from: `${yr}-04-01`,
    to: `${yr + 1}-03-31`,
  }
}

interface PLData {
  salesRevenue: number
  salesReturns: number
  grossRevenue: number
  rawMaterialPurchases: number
  jobWorkExpenses: number
  cogs: number
  grossProfit: number
  operatingExpenses: { category: string; amount: number }[]
  totalOpEx: number
  netProfit: number
}

export default function PLPage() {
  const fy = currentFY()
  const [from, setFrom] = useState(fy.from)
  const [to, setTo] = useState(fy.to)
  const [data, setData] = useState<PLData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/pl?from=${from}&to=${to}`)
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      setError('Failed to load P&L data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [from, to])

  const handleExport = () => {
    if (!data) return
    const rows = [
      { Section: 'INCOME', Item: 'Sales Revenue', Amount: data.salesRevenue },
      { Section: 'INCOME', Item: 'Less: Sales Returns', Amount: -data.salesReturns },
      { Section: 'INCOME', Item: 'Gross Revenue', Amount: data.grossRevenue },
      { Section: 'COGS', Item: 'Raw Material Purchases', Amount: data.rawMaterialPurchases },
      { Section: 'COGS', Item: 'Job Work Expenses', Amount: data.jobWorkExpenses },
      { Section: 'COGS', Item: 'Total COGS', Amount: data.cogs },
      { Section: 'PROFIT', Item: 'Gross Profit', Amount: data.grossProfit },
      ...data.operatingExpenses.map(e => ({ Section: 'OPERATING EXPENSES', Item: e.category, Amount: e.amount })),
      { Section: 'PROFIT', Item: 'Net Profit / Loss', Amount: data.netProfit },
    ]
    exportToCSV(rows, `pl-${from}-${to}`)
  }

  const Row = ({ label, amount, bold, indent, color }: { label: string; amount: number; bold?: boolean; indent?: boolean; color?: string }) => (
    <div className={`flex items-center justify-between py-2.5 border-b border-gray-100 ${bold ? 'font-semibold' : ''}`}>
      <span className={`text-sm ${indent ? 'ml-6 text-gray-500' : 'text-gray-800'}`}>{label}</span>
      <span className={`text-sm font-mono ${color ?? (bold ? 'text-gray-900' : 'text-gray-700')}`}>
        {amount < 0 ? '(' + fmtINR(Math.abs(amount)) + ')' : fmtINR(amount)}
      </span>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-emerald-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profit &amp; Loss Statement</h1>
            <p className="text-sm text-gray-500">Income, COGS &amp; Net Profit</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={!data}
          className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 font-medium text-sm disabled:opacity-50"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={() => { const fy = currentFY(); setFrom(fy.from); setTo(fy.to) }}
          className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
        >
          Current FY
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">
          <p>{error}</p>
          <button onClick={load} className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg">Retry</button>
        </div>
      ) : data ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
          {/* Income */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Income</h2>
            <Row label="Sales Revenue" amount={data.salesRevenue} />
            <Row label="Less: Sales Returns" amount={-data.salesReturns} indent />
            <Row label="Gross Revenue" amount={data.grossRevenue} bold />
          </div>

          {/* COGS */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Cost of Goods Sold</h2>
            <Row label="Raw Material Purchases" amount={data.rawMaterialPurchases} indent />
            <Row label="Job Work Expenses" amount={data.jobWorkExpenses} indent />
            <Row label="Total COGS" amount={data.cogs} bold />
          </div>

          {/* Gross Profit */}
          <div className="bg-emerald-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800">Gross Profit</span>
              <span className={`font-bold text-lg ${data.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {fmtINR(data.grossProfit)}
              </span>
            </div>
          </div>

          {/* Operating Expenses */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Operating Expenses</h2>
            {data.operatingExpenses.map(e => (
              <Row key={e.category} label={e.category.replace(/_/g, ' ')} amount={e.amount} indent />
            ))}
            <Row label="Total Operating Expenses" amount={data.totalOpEx} bold />
          </div>

          {/* Net Profit */}
          <div className={`rounded-lg p-4 ${data.netProfit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800 text-lg">
                Net {data.netProfit >= 0 ? 'Profit' : 'Loss'}
              </span>
              <span className={`font-bold text-2xl ${data.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {data.netProfit < 0 ? '(' + fmtINR(Math.abs(data.netProfit)) + ')' : fmtINR(data.netProfit)}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
