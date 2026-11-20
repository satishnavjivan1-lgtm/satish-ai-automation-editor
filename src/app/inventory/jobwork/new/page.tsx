'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Party { id: number; name: string }
interface Item { id: number; name: string; code: string; priceMode: string; grossWeightKg?: number }

const PROCESS_TYPES = ['CASTING', 'MACHINING', 'ELECTROPLATING', 'POLISHING', 'OTHER']

interface JobRow {
  itemId: string
  description: string
  sentQtyPcs: string
  sentWeightKg: string
}

const emptyRow = (): JobRow => ({ itemId: '', description: '', sentQtyPcs: '', sentWeightKg: '' })

export default function NewJobWorkPage() {
  const router = useRouter()
  const [vendors, setVendors] = useState<Party[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [vendorId, setVendorId] = useState('')
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedReturn, setExpectedReturn] = useState('')
  const [processType, setProcessType] = useState('CASTING')
  const [rows, setRows] = useState<JobRow[]>([emptyRow()])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/parties?type=VENDOR').then(r => r.json()).then(setVendors).catch(() => {})
    fetch('/api/items').then(r => r.json()).then((data: Item[]) =>
      setItems(data.filter(i => i.priceMode !== 'PER_PIECE' || true))
    ).catch(() => {})
  }, [])

  const updateRow = (i: number, field: keyof JobRow, value: string) => {
    setRows(prev => {
      const updated = [...prev]
      updated[i] = { ...updated[i], [field]: value }
      // Auto-compute weight from qty for PER_GROSS items
      if (field === 'sentQtyPcs') {
        const item = items.find(it => String(it.id) === updated[i].itemId)
        if (item?.grossWeightKg && value) {
          const pcs = Number(value)
          const kgPerGross = Number(item.grossWeightKg)
          const kg = (pcs / 144) * kgPerGross
          updated[i].sentWeightKg = kg.toFixed(3)
        }
      }
      return updated
    })
  }

  const totalPcs = rows.reduce((s, r) => s + (Number(r.sentQtyPcs) || 0), 0)
  const totalWt = rows.reduce((s, r) => s + (Number(r.sentWeightKg) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendorId) { setError('Please select a vendor'); return }
    if (rows.some(r => !r.itemId || !r.sentQtyPcs)) { setError('Fill all item rows'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/jobwork/challans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: Number(vendorId),
          challanDate,
          expectedReturnDate: expectedReturn || null,
          processType,
          notes,
          items: rows.map(r => ({
            itemId: Number(r.itemId),
            description: r.description,
            sentQtyPcs: Number(r.sentQtyPcs),
            sentWeightKg: Number(r.sentWeightKg),
          })),
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      router.push(`/inventory/jobwork/${data.id}`)
    } catch {
      setError('Failed to create challan. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/inventory/jobwork" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Job Work Challan</h1>
          <p className="text-sm text-gray-500">Send items for processing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Vendor & Dates */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">Challan Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
              <select
                required
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select vendor...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Challan Date *</label>
              <input
                type="date"
                required
                value={challanDate}
                onChange={e => setChallanDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Return Date</label>
              <input
                type="date"
                value={expectedReturn}
                onChange={e => setExpectedReturn(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Process Type *</label>
              <select
                value={processType}
                onChange={e => setProcessType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {PROCESS_TYPES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Items */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Items to Send</h2>
            <button
              type="button"
              onClick={() => setRows(prev => [...prev, emptyRow()])}
              className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              <Plus size={16} /> Add Row
            </button>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-gray-600 font-medium">Item</th>
                <th className="px-3 py-2 text-left text-gray-600 font-medium">Description of Work</th>
                <th className="px-3 py-2 text-left text-gray-600 font-medium">Sent Qty (Pcs)</th>
                <th className="px-3 py-2 text-left text-gray-600 font-medium">Sent Weight (Kg)</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const selItem = items.find(it => String(it.id) === row.itemId)
                return (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-2 py-2 w-56">
                      <select
                        value={row.itemId}
                        onChange={e => updateRow(i, 'itemId', e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                      >
                        <option value="">Select item...</option>
                        {items.map(it => (
                          <option key={it.id} value={it.id}>{it.code} – {it.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.description}
                        onChange={e => updateRow(i, 'description', e.target.value)}
                        placeholder="Describe work..."
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                      />
                    </td>
                    <td className="px-2 py-2 w-32">
                      <input
                        type="number"
                        value={row.sentQtyPcs}
                        onChange={e => updateRow(i, 'sentQtyPcs', e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                      />
                    </td>
                    <td className="px-2 py-2 w-36">
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          value={row.sentWeightKg}
                          onChange={e => updateRow(i, 'sentWeightKg', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                        />
                        {selItem?.grossWeightKg && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            1 gross = {selItem.grossWeightKg} kg
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRows(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={2} className="px-3 py-2 font-semibold text-gray-700 text-sm">Running Total</td>
                <td className="px-3 py-2 font-semibold text-gray-900">{totalPcs.toLocaleString('en-IN')} Pcs</td>
                <td className="px-3 py-2 font-semibold text-blue-700">{totalWt.toFixed(3)} Kg</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <div className="flex gap-3">
          <Link
            href="/inventory/jobwork"
            className="flex-1 text-center border border-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-orange-600 text-white py-2.5 rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
          >
            {saving ? 'Creating Challan...' : 'Create Challan'}
          </button>
        </div>
      </form>
    </div>
  )
}
