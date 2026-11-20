'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Download } from 'lucide-react'
import { exportToCSV } from '@/lib/export'

const fmtWt = (n: number) => Number(n).toFixed(3) + ' Kg'

interface StockRow {
  itemName: string
  itemCode: string
  hsnCode: string
  category: string
  openingQty: number
  openingWtKg: number
  inQty: number
  inWtKg: number
  outQty: number
  outWtKg: number
  closingQty: number
  closingWtKg: number
}

export default function StockReportPage() {
  const now = new Date()
  const [from, setFrom] = useState(`${now.getFullYear()}-04-01`)
  const [to, setTo] = useState(now.toISOString().split('T')[0])
  const [data, setData] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/stock?from=${from}&to=${to}`)
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      setError('Failed to load stock report.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [from, to])

  const handleExport = () => {
    if (!data.length) return
    exportToCSV(
      data.map(r => ({
        Item: r.itemName,
        Code: r.itemCode,
        HSN: r.hsnCode,
        Category: r.category,
        'Opening Qty': r.openingQty,
        'Opening Wt (Kg)': r.openingWtKg,
        'IN Qty': r.inQty,
        'IN Wt (Kg)': r.inWtKg,
        'OUT Qty': r.outQty,
        'OUT Wt (Kg)': r.outWtKg,
        'Closing Qty': r.closingQty,
        'Closing Wt (Kg)': r.closingWtKg,
      })),
      `stock-report-${from}-${to}`
    )
  }

  // Totals
  const totals = data.reduce(
    (acc, r) => ({
      openingQty: acc.openingQty + r.openingQty,
      openingWtKg: acc.openingWtKg + Number(r.openingWtKg),
      inQty: acc.inQty + r.inQty,
      inWtKg: acc.inWtKg + Number(r.inWtKg),
      outQty: acc.outQty + r.outQty,
      outWtKg: acc.outWtKg + Number(r.outWtKg),
      closingQty: acc.closingQty + r.closingQty,
      closingWtKg: acc.closingWtKg + Number(r.closingWtKg),
    }),
    { openingQty: 0, openingWtKg: 0, inQty: 0, inWtKg: 0, outQty: 0, outWtKg: 0, closingQty: 0, closingWtKg: 0 }
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-teal-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Weight Summary</h1>
            <p className="text-sm text-gray-500">Item-wise opening, movement &amp; closing stock</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={!data.length}
          className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 font-medium text-sm disabled:opacity-50"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Date Range */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">
          <p>{error}</p>
          <button onClick={load} className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-lg">Retry</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Item</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">HSN</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Op. Qty</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Op. Wt (Kg)</th>
                <th className="px-4 py-3 text-right font-semibold text-green-700">IN Qty</th>
                <th className="px-4 py-3 text-right font-semibold text-green-700">IN Wt (Kg)</th>
                <th className="px-4 py-3 text-right font-semibold text-red-600">OUT Qty</th>
                <th className="px-4 py-3 text-right font-semibold text-red-600">OUT Wt (Kg)</th>
                <th className="px-4 py-3 text-right font-semibold text-blue-700">Cl. Qty</th>
                <th className="px-4 py-3 text-right font-semibold text-blue-700">Cl. Wt (Kg)</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">No stock data for this period</td>
                </tr>
              ) : (
                data.map((row, i) => {
                  const isRaw = row.category === 'RAW_MATERIAL'
                  return (
                    <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isRaw ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <div className={`font-medium ${isRaw ? 'text-amber-900' : 'text-gray-900'}`}>{row.itemName}</div>
                        <div className="text-xs text-gray-400">{row.itemCode}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.hsnCode}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{row.openingQty.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmtWt(Number(row.openingWtKg))}</td>
                      <td className="px-4 py-3 text-right text-green-700">{row.inQty.toLocaleString('en-IN')}</td>
                      <td className={`px-4 py-3 text-right font-medium ${isRaw ? 'text-amber-700' : 'text-green-700'}`}>
                        {fmtWt(Number(row.inWtKg))}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">{row.outQty.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right text-red-600">{fmtWt(Number(row.outWtKg))}</td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-700">{row.closingQty.toLocaleString('en-IN')}</td>
                      <td className={`px-4 py-3 text-right font-bold ${isRaw ? 'text-blue-800' : 'text-blue-700'}`}>
                        {fmtWt(Number(row.closingWtKg))}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {data.length > 0 && (
              <tfoot className="border-t-2 border-gray-300 bg-gray-100 font-bold text-gray-900">
                <tr>
                  <td colSpan={2} className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{totals.openingQty.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right">{fmtWt(totals.openingWtKg)}</td>
                  <td className="px-4 py-3 text-right text-green-800">{totals.inQty.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right text-green-800">{fmtWt(totals.inWtKg)}</td>
                  <td className="px-4 py-3 text-right text-red-700">{totals.outQty.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right text-red-700">{fmtWt(totals.outWtKg)}</td>
                  <td className="px-4 py-3 text-right text-blue-800">{totals.closingQty.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right text-blue-800">{fmtWt(totals.closingWtKg)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
