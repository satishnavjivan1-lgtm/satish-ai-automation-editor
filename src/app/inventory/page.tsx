'use client'

import { useState, useEffect } from 'react'
import { Plus, Package, AlertTriangle, CheckCircle, XCircle, Edit, Search, X } from 'lucide-react'

const fmtINR = (n: number) =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)

const fmtWt = (n: number) => n.toFixed(3) + ' Kg'

type CategoryType = 'RAW_MATERIAL' | 'WIP' | 'FINISHED_GOOD'
type PriceMode = 'PER_PIECE' | 'PER_KG' | 'PER_GRAM' | 'PER_GROSS'

interface Item {
  id: number
  name: string
  code: string
  hsnCode: string
  category: { name: string; type: CategoryType }
  unit: string
  priceMode: PriceMode
  currentQtyPcs: number
  currentWeightKg: number
  saleRate: number
  minStockQty: number
  grossWeightKg?: number
}

const CATEGORY_LABELS: Record<CategoryType, string> = {
  RAW_MATERIAL: 'Raw Material',
  WIP: 'WIP',
  FINISHED_GOOD: 'Finished Good',
}

const stockStatus = (item: Item) => {
  if (item.currentQtyPcs <= 0) return 'out'
  if (item.currentQtyPcs <= item.minStockQty) return 'low'
  return 'ok'
}

const StatusBadge = ({ item }: { item: Item }) => {
  const s = stockStatus(item)
  if (s === 'out')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium">
        <XCircle size={12} /> Below Min
      </span>
    )
  if (s === 'low')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-medium">
        <AlertTriangle size={12} /> Low
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">
      <CheckCircle size={12} /> Adequate
    </span>
  )
}

const EMPTY_FORM = {
  name: '',
  code: '',
  hsnCode: '',
  categoryId: '',
  unit: 'PCS',
  priceMode: 'PER_PIECE',
  purchaseRate: '',
  saleRate: '',
  gstRate: '18',
  grossWeightKg: '',
  openingQty: '',
  openingWeightKg: '',
  minStockQty: '',
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string; type: CategoryType }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterCat, setFilterCat] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState<'ALL' | 'ADEQUATE' | 'LOW' | 'OUT'>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)

  const loadItems = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/items')
      if (!res.ok) throw new Error('Failed to load items')
      const data = await res.json()
      setItems(data)
    } catch {
      setError('Failed to load inventory. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/item-categories')
      if (res.ok) setCategories(await res.json())
    } catch {}
  }

  useEffect(() => {
    loadItems()
    loadCategories()
  }, [])

  const filtered = items
    .filter(i => filterCat === 'ALL' || i.category.type === filterCat)
    .filter(i => {
      if (stockFilter === 'ALL') return true
      const s = stockStatus(i)
      if (stockFilter === 'ADEQUATE') return s === 'ok'
      if (stockFilter === 'LOW') return s === 'low'
      if (stockFilter === 'OUT') return s === 'out'
      return true
    })
    .filter(i => {
      if (!searchTerm.trim()) return true
      const q = searchTerm.toLowerCase().trim()
      return (
        i.name.toLowerCase().includes(q) ||
        (i.code && i.code.toLowerCase().includes(q)) ||
        (i.hsnCode && i.hsnCode.toLowerCase().includes(q))
      )
    })

  const openAdd = () => {
    setEditItem(null)
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  const openEdit = (item: Item) => {
    setEditItem(item)
    setForm({
      name: item.name,
      code: item.code,
      hsnCode: item.hsnCode,
      categoryId: String((item as any).categoryId ?? ''),
      unit: item.unit,
      priceMode: item.priceMode,
      purchaseRate: String((item as any).purchaseRate ?? ''),
      saleRate: String(item.saleRate),
      gstRate: String((item as any).gstRate ?? '18'),
      grossWeightKg: item.grossWeightKg ? String(item.grossWeightKg) : '',
      openingQty: '',
      openingWeightKg: '',
      minStockQty: String(item.minStockQty),
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url = editItem ? `/api/items/${editItem.id}` : '/api/items'
      const method = editItem ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          categoryId: Number(form.categoryId),
          purchaseRate: Number(form.purchaseRate),
          saleRate: Number(form.saleRate),
          gstRate: Number(form.gstRate),
          grossWeightKg: form.grossWeightKg ? Number(form.grossWeightKg) : null,
          openingQty: form.openingQty ? Number(form.openingQty) : 0,
          openingWeightKg: form.openingWeightKg ? Number(form.openingWeightKg) : 0,
          minStockQty: Number(form.minStockQty),
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setShowModal(false)
      loadItems()
    } catch {
      alert('Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="text-blue-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
            <p className="text-sm text-gray-500">Stock list &amp; item master</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={18} /> Add Item
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex gap-2 flex-wrap items-center">
          {(['ALL', 'RAW_MATERIAL', 'WIP', 'FINISHED_GOOD'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterCat === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === 'ALL' ? 'All' : CATEGORY_LABELS[cat]}
            </button>
          ))}

          <div className="h-5 w-px bg-gray-200 hidden sm:block mx-1" />

          <select
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="ADEQUATE">Adequate Stock</option>
            <option value="LOW">Low Stock</option>
            <option value="OUT">Below Minimum</option>
          </select>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search item name, code, HSN..."
            className="w-full pl-9 pr-9 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">
          <p>{error}</p>
          <button onClick={loadItems} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg">
            Retry
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  'Code',
                  'Name',
                  'Category',
                  'HSN',
                  'Unit',
                  'Price Mode',
                  'Current Qty (Pcs)',
                  'Current Weight (Kg)',
                  'Sale Rate',
                  'Min Stock',
                  'Status',
                  '',
                ].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-gray-400">
                    {searchTerm || stockFilter !== 'ALL' || filterCat !== 'ALL' ? (
                      <div>
                        <p className="font-medium text-gray-600">No items match your filter/search criteria</p>
                        <button
                          onClick={() => { setSearchTerm(''); setStockFilter('ALL'); setFilterCat('ALL') }}
                          className="mt-2 text-sm text-blue-600 hover:underline font-medium"
                        >
                          Reset filters
                        </button>
                      </div>
                    ) : (
                      'No items found'
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const grossQty =
                    item.priceMode === 'PER_GROSS'
                      ? Math.floor(item.currentQtyPcs / 144)
                      : null
                  return (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                          {CATEGORY_LABELS[item.category.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{item.hsnCode}</td>
                      <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                      <td className="px-4 py-3 text-gray-500">{item.priceMode}</td>
                      <td className="px-4 py-3 font-medium">
                        {item.currentQtyPcs.toLocaleString('en-IN')}
                        {grossQty !== null && (
                          <span className="ml-1 text-xs text-gray-400">({grossQty} gross)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-blue-700 font-medium">
                        {fmtWt(Number(item.currentWeightKg))}
                      </td>
                      <td className="px-4 py-3">{fmtINR(Number(item.saleRate))}</td>
                      <td className="px-4 py-3 text-gray-500">{item.minStockQty}</td>
                      <td className="px-4 py-3">
                        <StatusBadge item={item} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-500"
                        >
                          <Edit size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editItem ? 'Edit Item' : 'Add New Item'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Code *</label>
                  <input
                    required
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code *</label>
                  <input
                    required
                    value={form.hsnCode}
                    onChange={e => setForm({ ...form, hsnCode: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    required
                    value={form.categoryId}
                    onChange={e => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PCS">PCS</option>
                    <option value="KG">KG</option>
                    <option value="GRAM">GRAM</option>
                    <option value="GROSS">GROSS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Mode</label>
                  <select
                    value={form.priceMode}
                    onChange={e => setForm({ ...form, priceMode: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PER_PIECE">Per Piece</option>
                    <option value="PER_KG">Per KG</option>
                    <option value="PER_GRAM">Per Gram</option>
                    <option value="PER_GROSS">Per Gross</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Rate (₹)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.purchaseRate}
                    onChange={e => setForm({ ...form, purchaseRate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sale Rate (₹)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.saleRate}
                    onChange={e => setForm({ ...form, saleRate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.gstRate}
                    onChange={e => setForm({ ...form, gstRate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {form.priceMode === 'PER_GROSS' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gross Weight Kg <span className="text-gray-400">(weight of 1 gross = 144 pcs)</span>
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={form.grossWeightKg}
                      onChange={e => setForm({ ...form, grossWeightKg: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                {!editItem && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Opening Qty (Pcs)</label>
                      <input
                        type="number"
                        value={form.openingQty}
                        onChange={e => setForm({ ...form, openingQty: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Opening Weight (Kg)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={form.openingWeightKg}
                        onChange={e => setForm({ ...form, openingWeightKg: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Qty</label>
                  <input
                    type="number"
                    value={form.minStockQty}
                    onChange={e => setForm({ ...form, minStockQty: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
