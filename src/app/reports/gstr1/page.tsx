'use client'

import { useState, useEffect } from 'react'
import { FileText, Download } from 'lucide-react'
import { exportToCSV } from '@/lib/export'

const fmtINR = (n: number) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)

interface B2BEntry {
  partyName: string
  gstin: string
  invoiceCount: number
  taxable: number
  cgst: number
  sgst: number
  igst: number
  total: number
}

interface B2CEntry {
  state: string
  invoiceCount: number
  taxable: number
  cgst: number
  sgst: number
  igst: number
  total: number
}

interface HSNEntry {
  hsnCode: string
  description: string
  totalQty: number
  taxable: number
  taxAmount: number
}

interface GSTR1Data {
  b2b: B2BEntry[]
  b2c: B2CEntry[]
  hsn: HSNEntry[]
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function GSTR1Page() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState<GSTR1Data | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/gstr1?month=${month}&year=${year}`)
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      setError('Failed to load GSTR-1 data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [month, year])

  const exportB2B = () => {
    if (!data) return
    exportToCSV(data.b2b, `gstr1-b2b-${year}-${String(month).padStart(2, '0')}`)
  }

  const exportB2C = () => {
    if (!data) return
    exportToCSV(data.b2c, `gstr1-b2c-${year}-${String(month).padStart(2, '0')}`)
  }

  const exportHSN = () => {
    if (!data) return
    exportToCSV(data.hsn, `gstr1-hsn-${year}-${String(month).padStart(2, '0')}`)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="text-indigo-600" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GSTR-1 Report</h1>
          <p className="text-sm text-gray-500">Monthly outward supply return</p>
        </div>
      </div>

      {/* Month/Year Filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">
          <p>{error}</p>
          <button onClick={load} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg">Retry</button>
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* B2B Section */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Section 4A — B2B (Registered) Supplies</h2>
              <button
                onClick={exportB2B}
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Party Name', 'GSTIN', 'Invoices', 'Taxable Amt', 'CGST', 'SGST', 'IGST', 'Total'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(!data.b2b || data.b2b.length === 0) ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">No B2B transactions</td>
                  </tr>
                ) : data.b2b.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{row.partyName}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{row.gstin}</td>
                    <td className="px-4 py-2.5 text-gray-600">{row.invoiceCount}</td>
                    <td className="px-4 py-2.5">{fmtINR(row.taxable)}</td>
                    <td className="px-4 py-2.5">{fmtINR(row.cgst)}</td>
                    <td className="px-4 py-2.5">{fmtINR(row.sgst)}</td>
                    <td className="px-4 py-2.5">{fmtINR(row.igst)}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{fmtINR(row.total)}</td>
                  </tr>
                ))}
              </tbody>
              {data.b2b.length > 0 && (
                <tfoot className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 text-gray-700">Total</td>
                    <td className="px-4 py-2.5">{fmtINR(data.b2b.reduce((s, r) => s + r.taxable, 0))}</td>
                    <td className="px-4 py-2.5">{fmtINR(data.b2b.reduce((s, r) => s + r.cgst, 0))}</td>
                    <td className="px-4 py-2.5">{fmtINR(data.b2b.reduce((s, r) => s + r.sgst, 0))}</td>
                    <td className="px-4 py-2.5">{fmtINR(data.b2b.reduce((s, r) => s + r.igst, 0))}</td>
                    <td className="px-4 py-2.5">{fmtINR(data.b2b.reduce((s, r) => s + r.total, 0))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* B2C Section */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Section 5 — B2C (Unregistered) Supplies</h2>
              <button
                onClick={exportB2C}
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['State', 'Invoices', 'Taxable Amt', 'CGST', 'SGST', 'IGST', 'Total'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(!data.b2c || data.b2c.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">No B2C transactions</td>
                  </tr>
                ) : data.b2c.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{row.state}</td>
                    <td className="px-4 py-2.5 text-gray-600">{row.invoiceCount}</td>
                    <td className="px-4 py-2.5">{fmtINR(row.taxable)}</td>
                    <td className="px-4 py-2.5">{fmtINR(row.cgst)}</td>
                    <td className="px-4 py-2.5">{fmtINR(row.sgst)}</td>
                    <td className="px-4 py-2.5">{fmtINR(row.igst)}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{fmtINR(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* HSN Summary */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">HSN-wise Summary</h2>
              <button
                onClick={exportHSN}
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['HSN Code', 'Description', 'Total Qty', 'Taxable Amt', 'Tax Amount'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(!data.hsn || data.hsn.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">No HSN data</td>
                  </tr>
                ) : data.hsn.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-sm text-gray-700">{row.hsnCode}</td>
                    <td className="px-4 py-2.5 text-gray-700">{row.description}</td>
                    <td className="px-4 py-2.5 text-gray-600">{Number(row.totalQty).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2.5">{fmtINR(row.taxable)}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{fmtINR(row.taxAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
