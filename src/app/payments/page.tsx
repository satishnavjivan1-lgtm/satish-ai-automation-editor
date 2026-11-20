'use client'

import { useState, useEffect } from 'react'
import { Plus, CreditCard, Trash2, Search, X } from 'lucide-react'

const fmtINR = (n: number) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

type TabType = 'ALL' | 'RECEIVED' | 'PAID'

interface Payment {
  id: number
  type: 'RECEIVED' | 'PAID'
  party: { name: string }
  mode: string
  reference?: string
  amount: number
  paymentDate: string
  invoice?: { invoiceNo: string }
  notes?: string
}

interface Party { id: number; name: string; type: string }
interface Invoice { id: number; invoiceNo: string; totalAmt: number; paidAmt: number }

const EMPTY_FORM = {
  type: 'RECEIVED',
  partyId: '',
  invoiceId: '',
  amount: '',
  paymentDate: new Date().toISOString().split('T')[0],
  mode: 'CASH',
  reference: '',
  notes: '',
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<TabType>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [parties, setParties] = useState<Party[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/payments')
      if (!res.ok) throw new Error()
      setPayments(await res.json())
    } catch {
      setError('Failed to load payments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const loadParties = async () => {
    const res = await fetch('/api/parties')
    if (res.ok) setParties(await res.json())
  }

  const loadInvoices = async (partyId: string, type: string) => {
    if (!partyId) { setInvoices([]); return }
    const res = await fetch(`/api/invoices?partyId=${partyId}&status=UNPAID`)
    if (res.ok) setInvoices(await res.json())
  }

  const openModal = async () => {
    setForm({ ...EMPTY_FORM })
    setInvoices([])
    await loadParties()
    setShowModal(true)
  }

  useEffect(() => {
    if (form.partyId) loadInvoices(form.partyId, form.type)
    else setInvoices([])
  }, [form.partyId])

  const selectedInvoice = invoices.find(i => String(i.id) === form.invoiceId)
  const pendingAmt = selectedInvoice
    ? Number(selectedInvoice.totalAmt) - Number(selectedInvoice.paidAmt)
    : null

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return
    try {
      const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      load()
    } catch {
      alert('Failed to delete payment.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          partyId: Number(form.partyId),
          invoiceId: form.invoiceId ? Number(form.invoiceId) : null,
          amount: Number(form.amount),
        }),
      })
      if (!res.ok) throw new Error()
      setShowModal(false)
      load()
    } catch {
      alert('Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const filtered = payments
    .filter(p => tab === 'ALL' || p.type === tab)
    .filter(p => {
      if (dateFrom && new Date(p.paymentDate) < new Date(dateFrom)) return false
      if (dateTo) {
        const toEnd = new Date(dateTo)
        toEnd.setHours(23, 59, 59, 999)
        if (new Date(p.paymentDate) > toEnd) return false
      }
      return true
    })
    .filter(p => {
      if (!searchTerm.trim()) return true
      const q = searchTerm.toLowerCase().trim()
      return (
        p.party.name.toLowerCase().includes(q) ||
        (p.invoice?.invoiceNo && p.invoice.invoiceNo.toLowerCase().includes(q)) ||
        (p.reference && p.reference.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        p.mode.toLowerCase().includes(q)
      )
    })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="text-green-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-sm text-gray-500">Record &amp; track payments</p>
          </div>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <Plus size={18} /> Record Payment
        </button>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex gap-2 flex-wrap items-center">
          {(['ALL', 'RECEIVED', 'PAID'] as TabType[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}

          <div className="h-5 w-px bg-gray-200 hidden sm:block mx-1" />

          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              title="From Date"
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              title="To Date"
            />
          </div>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search party, invoice #, ref..."
            className="w-full pl-9 pr-9 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
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
          <button onClick={load} className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg">Retry</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Party', 'Type', 'Mode', 'Reference', 'Amount', 'Linked Invoice', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    {searchTerm || dateFrom || dateTo || tab !== 'ALL' ? (
                      <div>
                        <p className="font-medium text-gray-600">No payments match your filter criteria</p>
                        <button
                          onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); setTab('ALL') }}
                          className="mt-2 text-sm text-green-600 hover:underline font-medium"
                        >
                          Reset filters
                        </button>
                      </div>
                    ) : (
                      'No payments found'
                    )}
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(p.paymentDate)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.party?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.type === 'RECEIVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.mode}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.reference || '—'}</td>
                  <td className={`px-4 py-3 font-semibold ${p.type === 'RECEIVED' ? 'text-green-700' : 'text-red-700'}`}>
                    {p.type === 'RECEIVED' ? '+' : '-'}{fmtINR(Number(p.amount))}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.invoice?.invoiceNo || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded"
                      title="Delete Payment"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type *</label>
                <div className="flex gap-2">
                  {['RECEIVED', 'PAID'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t, invoiceId: '' })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border ${form.type === t
                          ? t === 'RECEIVED' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      {t === 'RECEIVED' ? '↓ Received' : '↑ Paid'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Party *</label>
                <select
                  required
                  value={form.partyId}
                  onChange={e => setForm({ ...form, partyId: e.target.value, invoiceId: '' })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select party...</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                  ))}
                </select>
              </div>

              {form.partyId && invoices.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link to Invoice (optional)</label>
                  <select
                    value={form.invoiceId}
                    onChange={e => {
                      const inv = invoices.find(i => String(i.id) === e.target.value)
                      setForm({
                        ...form,
                        invoiceId: e.target.value,
                        amount: inv ? String((Number(inv.totalAmt) - Number(inv.paidAmt)).toFixed(2)) : form.amount,
                      })
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">No specific invoice</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNo} — Pending: {fmtINR(Number(inv.totalAmt) - Number(inv.paidAmt))}
                      </option>
                    ))}
                  </select>
                  {pendingAmt !== null && (
                    <p className="text-xs text-gray-500 mt-1">Pending amount: {fmtINR(pendingAmt)}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={form.paymentDate}
                  onChange={e => setForm({ ...form, paymentDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mode *</label>
                <select
                  value={form.mode}
                  onChange={e => setForm({ ...form, mode: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {['CASH', 'UPI', 'NEFT', 'RTGS', 'CHEQUE'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference / UTR Number</label>
                <input
                  value={form.reference}
                  onChange={e => setForm({ ...form, reference: e.target.value })}
                  placeholder="Transaction ID, cheque no., etc."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
