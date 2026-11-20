'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, ExternalLink, Edit2, Trash2, Search, X } from 'lucide-react'
import Link from 'next/link'

const fmtINR = (n: number | string | undefined | null) => {
  const num = typeof n === 'number' ? n : parseFloat(String(n || 0))
  if (isNaN(num)) return '₹0.00'
  return '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(num))
}

type TabType = 'ALL' | 'CUSTOMER' | 'VENDOR'

interface Party {
  id: number
  name: string
  gstin?: string
  state: string
  phone: string
  creditLimit: number
  currentBalance: number
  balanceType: 'CR' | 'DR'
  type: 'CUSTOMER' | 'VENDOR'
}

const EMPTY_FORM = {
  type: 'CUSTOMER',
  name: '',
  gstin: '',
  pan: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: 'Gujarat',
  stateCode: '24',
  creditLimit: '',
  openingBalance: '',
  openingBalanceType: 'CR',
}

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<TabType>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingParty, setEditingParty] = useState<Party | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/parties')
      if (!res.ok) throw new Error()
      setParties(await res.json())
    } catch {
      setError('Failed to load parties.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = parties
    .filter(p => tab === 'ALL' || p.type === tab)
    .filter(p => {
      if (!searchTerm.trim()) return true
      const q = searchTerm.toLowerCase().trim()
      return (
        p.name.toLowerCase().includes(q) ||
        (p.gstin && p.gstin.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.state && p.state.toLowerCase().includes(q)) ||
        ((p as any).city && (p as any).city.toLowerCase().includes(q))
      )
    })

  const handleOpenAdd = () => {
    setEditingParty(null)
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  const handleOpenEdit = (p: Party) => {
    setEditingParty(p)
    setForm({
      type: p.type,
      name: p.name,
      gstin: p.gstin || '',
      pan: (p as any).pan || '',
      phone: p.phone,
      email: (p as any).email || '',
      address: (p as any).address || '',
      city: (p as any).city || '',
      state: p.state || 'Gujarat',
      stateCode: (p as any).stateCode || '24',
      creditLimit: String(p.creditLimit ?? 0),
      openingBalance: String((p as any).openingBalance ?? 0),
      openingBalanceType: (p as any).openingBalanceType || 'CR',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return
    try {
      const res = await fetch(`/api/parties/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      load()
    } catch {
      alert('Failed to delete party.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editingParty ? `/api/parties/${editingParty.id}` : '/api/parties'
      const method = editingParty ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          creditLimit: Number(form.creditLimit) || 0,
          openingBalance: Number(form.openingBalance) || 0,
        }),
      })
      if (!res.ok) throw new Error()
      setShowModal(false)
      setEditingParty(null)
      setForm({ ...EMPTY_FORM })
      load()
    } catch {
      alert('Failed to save party')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="text-purple-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parties</h1>
            <p className="text-sm text-gray-500">Customers &amp; vendors ledger</p>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          <Plus size={18} /> Add Party
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          {(['ALL', 'CUSTOMER', 'VENDOR'] as TabType[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {t === 'ALL' ? 'All' : t === 'CUSTOMER' ? 'Customers' : 'Vendors'}
              <span className="ml-2 text-xs opacity-70">
                ({t === 'ALL' ? parties.length : parties.filter(p => p.type === t).length})
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[280px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search party name, GSTIN, phone..."
            className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
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
          <button onClick={load} className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg">Retry</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'GSTIN', 'State', 'Phone', 'Credit Limit', 'Current Balance', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    {searchTerm ? (
                      <div>
                        <p className="font-medium text-gray-600">No parties match "{searchTerm}"</p>
                        <button onClick={() => setSearchTerm('')} className="mt-2 text-sm text-purple-600 hover:underline font-medium">
                          Clear search
                        </button>
                      </div>
                    ) : (
                      'No parties found'
                    )}
                  </td>
                </tr>
              ) : filtered.map(p => {
                const isCR = p.balanceType === 'CR'
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.type}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.gstin || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{p.state}</td>
                    <td className="px-4 py-3 text-gray-500">{p.phone}</td>
                    <td className="px-4 py-3">{fmtINR(Number(p.creditLimit))}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${isCR ? 'text-green-600' : 'text-red-600'}`}>
                        {fmtINR(Number(p.currentBalance))} {isCR ? 'CR' : 'DR'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <Link
                        href={`/parties/${p.id}`}
                        className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium bg-purple-50 px-2 py-1 rounded"
                      >
                        Ledger <ExternalLink size={12} />
                      </Link>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded"
                        title="Edit Party"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
                        title="Delete Party"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Party Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingParty ? 'Edit Party' : 'Add New Party'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="VENDOR">Vendor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input
                    value={form.gstin}
                    onChange={e => setForm({ ...form, gstin: e.target.value })}
                    placeholder="22AAAAA0000A1Z5"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                  <input
                    value={form.pan}
                    onChange={e => setForm({ ...form, pan: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    required
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <input
                    required
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    value={form.state}
                    onChange={e => setForm({ ...form, state: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={form.creditLimit}
                    onChange={e => setForm({ ...form, creditLimit: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    value={form.openingBalance}
                    onChange={e => setForm({ ...form, openingBalance: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance Type</label>
                  <select
                    value={form.openingBalanceType}
                    onChange={e => setForm({ ...form, openingBalanceType: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="CR">CR (They owe us)</option>
                    <option value="DR">DR (We owe them)</option>
                  </select>
                </div>
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
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingParty ? 'Update Party' : 'Add Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
