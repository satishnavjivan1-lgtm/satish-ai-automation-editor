'use client'

import { useState, useEffect } from 'react'
import { Plus, Wrench, ExternalLink, Search, X } from 'lucide-react'
import Link from 'next/link'

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const fmtWt = (n: number) => n.toFixed(3) + ' Kg'

interface Challan {
  id: number
  challanNo: string
  challanDate: string
  vendor: { name: string }
  _count: { items: number }
  totalSentWeightKg: number
  totalReceivedWeightKg: number
  burningLossKg: number
  status: 'OPEN' | 'PARTIAL' | 'CLOSED'
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    CLOSED: 'bg-green-100 text-green-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[s] ?? 'bg-gray-100 text-gray-600'}`}>
      {s}
    </span>
  )
}

export default function JobWorkPage() {
  const [challans, setChallans] = useState<Challan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'PARTIAL' | 'CLOSED'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/jobwork/challans')
      if (!res.ok) throw new Error()
      setChallans(await res.json())
    } catch {
      setError('Failed to load job work challans.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = challans
    .filter(c => statusFilter === 'ALL' || c.status === statusFilter)
    .filter(c => {
      if (!searchTerm.trim()) return true
      const q = searchTerm.toLowerCase().trim()
      return (
        c.challanNo.toLowerCase().includes(q) ||
        (c.vendor?.name && c.vendor.name.toLowerCase().includes(q))
      )
    })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="text-orange-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Work Challans</h1>
            <p className="text-sm text-gray-500">Track outward job work &amp; burning loss</p>
          </div>
        </div>
        <Link
          href="/inventory/jobwork/new"
          className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium"
        >
          <Plus size={18} /> New Challan
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex gap-2">
          {(['ALL', 'OPEN', 'PARTIAL', 'CLOSED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {s === 'ALL' ? 'All' : s}
              <span className="ml-1.5 text-xs opacity-70">
                ({s === 'ALL' ? challans.length : challans.filter(c => c.status === s).length})
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search challan #, vendor..."
            className="w-full pl-9 pr-9 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">
          <p>{error}</p>
          <button onClick={load} className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg">
            Retry
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Challan #', 'Date', 'Vendor', 'Items', 'Sent Weight', 'Received Weight', 'Burning Loss', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    {searchTerm || statusFilter !== 'ALL' ? (
                      <div>
                        <p className="font-medium text-gray-600">No challans match your filter criteria</p>
                        <button
                          onClick={() => { setSearchTerm(''); setStatusFilter('ALL') }}
                          className="mt-2 text-sm text-orange-600 hover:underline font-medium"
                        >
                          Reset filters
                        </button>
                      </div>
                    ) : (
                      'No challans found'
                    )}
                  </td>
                </tr>
              ) : filtered.map(c => {
                const loss = Number(c.totalSentWeightKg) - Number(c.totalReceivedWeightKg)
                const lossPct = c.totalSentWeightKg > 0 ? (loss / Number(c.totalSentWeightKg)) * 100 : 0
                return (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 font-semibold">{c.challanNo}</td>
                    <td className="px-4 py-3 text-gray-600">{fmt(c.challanDate)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.vendor?.name || (c as any).party?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{c._count?.items ?? 0}</td>
                    <td className="px-4 py-3 text-gray-700">{fmtWt(Number(c.totalSentWeightKg))}</td>
                    <td className="px-4 py-3 text-gray-700">{fmtWt(Number(c.totalReceivedWeightKg))}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${lossPct > 5 ? 'text-red-600' : lossPct > 2 ? 'text-amber-600' : 'text-green-600'}`}>
                        {fmtWt(loss)} ({lossPct.toFixed(2)}%)
                      </span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(c.status)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/inventory/jobwork/${c.id}`} className="p-1 hover:bg-gray-200 rounded text-gray-500 inline-flex">
                        <ExternalLink size={15} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
