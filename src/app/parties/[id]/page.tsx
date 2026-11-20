'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Download, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { exportToCSV } from '@/lib/export'

const fmtINR = (n: number) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Math.abs(n))

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

interface LedgerEntry {
  date: string
  narration: string
  ref: string
  debit: number
  credit: number
  balance: number
}

interface PartyInfo {
  id: number
  name: string
  gstin?: string
  phone: string
  state: string
  creditLimit: number
  openingBalance: number
  openingBalanceType: 'CR' | 'DR'
  type: 'CUSTOMER' | 'VENDOR'
}

export default function PartyLedgerPage() {
  const params = useParams()
  const id = params.id as string

  const [party, setParty] = useState<PartyInfo | null>(null)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [pRes, lRes] = await Promise.all([
        fetch(`/api/parties/${id}`),
        fetch(`/api/parties/${id}/ledger`),
      ])
      if (!pRes.ok || !lRes.ok) throw new Error()
      const pData = await pRes.json()
      const lData = await lRes.json()
      setParty(pData)
      setLedger(Array.isArray(lData) ? lData : (lData.transactions || []))
    } catch {
      setError('Failed to load party ledger.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const closingBalance = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0

  const handleExportCSV = () => {
    if (!party) return
    exportToCSV(
      ledger.map(e => ({
        Date: e.date,
        Narration: e.narration,
        Reference: e.ref,
        Debit_Dr: e.debit || '',
        Credit_Cr: e.credit || '',
        Balance: e.balance,
      })),
      `ledger-${party.name.replace(/\s+/g, '-')}`
    )
  }

  const handleWhatsApp = () => {
    if (!party) return
    const bal = Math.abs(closingBalance)
    const type = closingBalance > 0 ? 'receivable' : 'payable'
    const msg = encodeURIComponent(
      `Dear ${party.name},\n\nThis is a gentle reminder that your outstanding balance with us is *₹${bal.toFixed(2)}* (${type}).\n\nKindly arrange the payment at your earliest convenience.\n\nThank you,\nNavjivan ERP`
    )
    window.open(`https://wa.me/${party.phone.replace(/\D/g, '')}?text=${msg}`, '_blank')
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-32 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    )
  }

  if (error || !party) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>{error || 'Party not found'}</p>
        <button onClick={load} className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg">Retry</button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/parties" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{party.name}</h1>
            <p className="text-sm text-gray-500">Party Ledger</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 font-medium text-sm"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={handleWhatsApp}
            className="inline-flex items-center gap-2 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 font-medium text-sm"
          >
            <MessageCircle size={16} /> WhatsApp Reminder
          </button>
        </div>
      </div>

      {/* Party Info Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">GSTIN</p>
          <p className="font-medium text-gray-900">{party.gstin || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Phone</p>
          <p className="font-medium text-gray-900">{party.phone}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">State</p>
          <p className="font-medium text-gray-900">{party.state}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Credit Limit</p>
          <p className="font-medium text-gray-900">{fmtINR(Number(party.creditLimit))}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Opening Balance</p>
          <p className="font-medium text-gray-900">
            {fmtINR(Number(party.openingBalance))}{' '}
            <span className={party.openingBalanceType === 'CR' ? 'text-green-600' : 'text-red-600'}>
              {party.openingBalanceType}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Current Balance</p>
          <p className={`font-semibold text-lg ${closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {fmtINR(closingBalance)} {closingBalance >= 0 ? 'CR' : 'DR'}
          </p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Date', 'Narration', 'Invoice/Ref#', 'Debit (Dr)', 'Credit (Cr)', 'Balance'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(!ledger || ledger.length === 0) ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  No ledger transactions recorded yet.
                </td>
              </tr>
            ) : (
              ledger.map((entry, i) => {
                const isFirst = i === 0
                const isLast = i === ledger.length - 1
                const balPositive = entry.balance >= 0
                return (
                  <tr
                    key={i}
                    className={`border-b border-gray-50 ${
                      isFirst ? 'bg-blue-50' : isLast ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'
                    } transition-colors`}
                  >
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(entry.date)}</td>
                    <td className="px-4 py-3 text-gray-800">{entry.narration}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{entry.ref || '—'}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">
                      {entry.debit ? fmtINR(entry.debit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-green-600 font-medium">
                      {entry.credit ? fmtINR(entry.credit) : '—'}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${balPositive ? 'text-green-700' : 'text-red-700'}`}>
                      {fmtINR(entry.balance)} {balPositive ? 'CR' : 'DR'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
