'use client'

import { useState, useEffect } from 'react'
import { Plus, Receipt, Edit2, Trash2, Search, X } from 'lucide-react'

const fmtINR = (n: number) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const CATEGORIES = [
  'ELECTRICITY', 'RAW_MATERIAL', 'JOB_WORK_LABOR', 'TRANSPORT',
  'RENT', 'SALARY', 'MISC',
]

interface Expense {
  id: number
  category: string
  description: string
  amount: number
  date: string
  mode: string
  vendor?: { name: string }
}

interface Party { id: number; name: string }

const EMPTY_FORM = {
  category: 'ELECTRICITY',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
  mode: 'CASH',
  vendorId: '',
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [vendors, setVendors] = useState<Party[]>([])
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterCat) params.set('category', filterCat)
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      if (searchTerm.trim()) params.set('search', searchTerm.trim())
      const res = await fetch(`/api/expenses?${params}`)
      if (!res.ok) throw new Error()
      setExpenses(await res.json())
    } catch {
      setError('Failed to load expenses.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterCat, dateFrom, dateTo, searchTerm])

  const openModal = async () => {
    setEditingExpense(null)
    const res = await fetch('/api/parties?type=VENDOR')
    if (res.ok) setVendors(await res.json())
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  const openEdit = async (exp: Expense) => {
    setEditingExpense(exp)
    const res = await fetch('/api/parties?type=VENDOR')
    if (res.ok) setVendors(await res.json())
    setForm({
      category: exp.category,
      amount: String(exp.amount),
      date: exp.date ? new Date(exp.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      description: exp.description || '',
      mode: exp.mode || 'CASH',
      vendorId: (exp as any).partyId ? String((exp as any).partyId) : '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      load()
    } catch {
      alert('Failed to delete expense.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses'
      const method = editingExpense ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: form.category,
          amount: Number(form.amount),
          expenseDate: form.date,
          description: form.description,
          paymentMode: form.mode,
          partyId: form.vendorId ? Number(form.vendorId) : null,
        }),
      })
      if (!res.ok) throw new Error()
      setShowModal(false)
      setEditingExpense(null)
      load()
    } catch {
      alert('Failed to save expense')
    } finally {
      setSaving(false)
    }
  }

  // Monthly summaries
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  const catColor: Record<string, string> = {
    ELECTRICITY: 'bg-yellow-100 text-yellow-700',
    RAW_MATERIAL: 'bg-blue-100 text-blue-700',
    JOB_WORK_LABOR: 'bg-orange-100 text-orange-700',
    TRANSPORT: 'bg-sky-100 text-sky-700',
    RENT: 'bg-pink-100 text-pink-700',
    SALARY: 'bg-purple-100 text-purple-700',
    MISC: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Receipt className="text-rose-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
            <p className="text-sm text-gray-500">Track business expenses</p>
          </div>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors font-medium"
        >
          <Plus size={18} /> Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Expenses</p>
          <p className="text-xl font-bold text-rose-600">{fmtINR(totalExpenses)}</p>
        </div>
        {byCategory.slice(0, 3).map(c => (
          <div key={c.cat} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{c.cat.replace(/_/g, ' ')}</p>
            <p className="text-xl font-bold text-gray-800">{fmtINR(c.total)}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
              title="From Date"
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
              title="To Date"
            />
          </div>
          {(filterCat || dateFrom || dateTo || searchTerm) && (
            <button
              onClick={() => { setFilterCat(''); setDateFrom(''); setDateTo(''); setSearchTerm('') }}
              className="text-xs text-gray-500 hover:text-gray-700 underline font-medium"
            >
              Reset
            </button>
          )}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search description, vendor, ref..."
            className="w-full pl-9 pr-9 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
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

      {/* Table */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">
          <p>{error}</p>
          <button onClick={load} className="mt-3 px-4 py-2 bg-rose-600 text-white rounded-lg">Retry</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Date', 'Category', 'Description', 'Vendor', 'Amount', 'Mode', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      {filterCat || dateFrom || dateTo || searchTerm ? (
                        <div>
                          <p className="font-medium text-gray-600">No expenses match your search/filter</p>
                          <button
                            onClick={() => { setFilterCat(''); setDateFrom(''); setDateTo(''); setSearchTerm('') }}
                            className="mt-2 text-sm text-rose-600 hover:underline font-medium"
                          >
                            Reset filters
                          </button>
                        </div>
                      ) : (
                        'No expenses found'
                      )}
                    </td>
                  </tr>
                ) : expenses.map(exp => (
                  <tr key={exp.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(exp.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${catColor[exp.category] ?? 'bg-gray-100 text-gray-600'}`}>
                        {exp.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{exp.description}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{exp.vendor?.name || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-rose-700">{fmtINR(Number(exp.amount))}</td>
                    <td className="px-4 py-3 text-gray-500">{exp.mode}</td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <button
                        onClick={() => openEdit(exp)}
                        className="p-1 text-gray-500 hover:text-rose-600 hover:bg-gray-100 rounded"
                        title="Edit Expense"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
                        title="Delete Expense"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={form.mode}
                  onChange={e => setForm({ ...form, mode: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {['CASH', 'UPI', 'CHEQUE'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor (optional)</label>
                <select
                  value={form.vendorId}
                  onChange={e => setForm({ ...form, vendorId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">No vendor</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
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
                  className="flex-1 bg-rose-600 text-white py-2 rounded-lg hover:bg-rose-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingExpense ? 'Update Expense' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
