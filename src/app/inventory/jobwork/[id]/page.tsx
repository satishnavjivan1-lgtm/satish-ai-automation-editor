'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Printer, CheckCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const fmtWt = (n: number) => Number(n).toFixed(3) + ' Kg'
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

interface ChallanItem {
  id: number
  item: { id: number; name: string; code: string; hsnCode: string }
  description: string
  sentQtyPcs: number
  sentWeightKg: number
  receivedQtyPcs?: number
  receivedWeightKg?: number
}

interface Challan {
  id: number
  challanNo: string
  challanDate: string
  expectedReturnDate?: string
  processType: string
  status: 'OPEN' | 'PARTIAL' | 'CLOSED'
  notes?: string
  vendor: { name: string; address: string; gstin?: string; phone: string }
  items: ChallanItem[]
  totalSentWeightKg: number
  totalReceivedWeightKg: number
}

interface ReceiptRow {
  itemId: number
  receivedQtyPcs: string
  receivedWeightKg: string
}

export default function ChallanDetailPage() {
  const params = useParams()
  const id = params.id as string
  const printRef = useRef<HTMLDivElement>(null)

  const [challan, setChallan] = useState<Challan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [receiptRows, setReceiptRows] = useState<ReceiptRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [receiptError, setReceiptError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/jobwork/challans/${id}`)
      if (!res.ok) throw new Error()
      const data: Challan = await res.json()
      setChallan(data)
      setReceiptRows(
        data.items.map(item => ({
          itemId: item.id,
          receivedQtyPcs: '',
          receivedWeightKg: '',
        }))
      )
    } catch {
      setError('Failed to load challan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const updateReceipt = (i: number, field: keyof ReceiptRow, value: string) => {
    setReceiptRows(prev => {
      const updated = [...prev]
      updated[i] = { ...updated[i], [field]: value }
      return updated
    })
  }

  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setReceiptError('')
    setSuccessMsg('')
    try {
      const res = await fetch('/api/jobwork/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challanId: Number(id),
          items: receiptRows.map(r => ({
            challanItemId: r.itemId,
            receivedQtyPcs: Number(r.receivedQtyPcs) || 0,
            receivedWeightKg: Number(r.receivedWeightKg) || 0,
          })),
        }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Failed to save receipt')
      }
      setSuccessMsg('માલની પહોંચ (Receipt) સફળતાપૂર્વક સેવ થઈ ગઈ છે!')
      await load()
    } catch (err: any) {
      setReceiptError(err?.message || 'Failed to save receipt. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const lossBadge = (sentKg: number, rcvdKg: number) => {
    if (!rcvdKg) return null
    const loss = sentKg - rcvdKg
    const pct = sentKg > 0 ? (loss / sentKg) * 100 : 0
    const color = pct > 5 ? 'text-red-600 bg-red-50' : pct > 2 ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50'
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
        {fmtWt(loss)} ({pct.toFixed(2)}% loss)
      </span>
    )
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    )
  }

  if (error || !challan) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>{error || 'Challan not found'}</p>
        <button onClick={load} className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg">Retry</button>
      </div>
    )
  }

  const totalSent = challan.items.reduce((s, i) => s + Number(i.sentWeightKg), 0)
  const totalRcvd = challan.items.reduce((s, i) => s + Number(i.receivedWeightKg ?? 0), 0)
  const totalLoss = totalSent - totalRcvd
  const totalLossPct = totalSent > 0 ? (totalLoss / totalSent) * 100 : 0

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/inventory/jobwork" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Challan #{challan.challanNo}</h1>
            <p className="text-sm text-gray-500">{fmtDate(challan.challanDate)}</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 font-medium text-sm"
        >
          <Printer size={16} /> Print Challan
        </button>
      </div>

      {/* Printable section */}
      <div ref={printRef} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6 print:shadow-none print:border-0">
        {/* Company / Challan info */}
        <div className="grid grid-cols-2 gap-6 border-b border-gray-100 pb-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Vendor</p>
            <p className="font-semibold text-gray-900">{challan.vendor?.name || (challan as any).party?.name}</p>
            <p className="text-sm text-gray-500">{challan.vendor?.address || (challan as any).party?.address}</p>
            {(challan.vendor?.gstin || (challan as any).party?.gstin) && (
              <p className="text-sm text-gray-500">GSTIN: {challan.vendor?.gstin || (challan as any).party?.gstin}</p>
            )}
            <p className="text-sm text-gray-500">Ph: {challan.vendor?.phone || (challan as any).party?.phone}</p>
          </div>
          <div className="text-right space-y-1">
            <div className="flex justify-end gap-6">
              <div>
                <p className="text-xs text-gray-400">Process</p>
                <p className="font-medium text-gray-900">{challan.processType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${challan.status === 'CLOSED' ? 'bg-green-100 text-green-700' :
                    challan.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                  }`}>{challan.status}</span>
              </div>
            </div>
            {challan.expectedReturnDate && (
              <p className="text-sm text-gray-500">Expected Return: {fmtDate(challan.expectedReturnDate)}</p>
            )}
          </div>
        </div>

        {/* Items table */}
        <div>
          <h3 className="font-semibold text-gray-700 mb-3">Items Sent</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Item Code', 'Item Name', 'Description', 'Sent Qty (Pcs)', 'Sent Weight (Kg)', 'Received Qty', 'Received Wt', 'Burning Loss'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {challan.items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{item.item.code}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{item.item.name}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{item.description}</td>
                  <td className="px-3 py-2">{Number(item.sentQtyPcs).toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2 text-blue-700 font-medium">{fmtWt(Number(item.sentWeightKg))}</td>
                  <td className="px-3 py-2">{item.receivedQtyPcs ? item.receivedQtyPcs.toLocaleString('en-IN') : '—'}</td>
                  <td className="px-3 py-2">{item.receivedWeightKg ? fmtWt(Number(item.receivedWeightKg)) : '—'}</td>
                  <td className="px-3 py-2">
                    {item.receivedWeightKg
                      ? lossBadge(Number(item.sentWeightKg), Number(item.receivedWeightKg))
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-gray-700">Total</td>
                <td className="px-3 py-2">{challan.items.reduce((s, i) => s + Number(i.sentQtyPcs), 0).toLocaleString('en-IN')}</td>
                <td className="px-3 py-2 text-blue-700">{fmtWt(totalSent)}</td>
                <td className="px-3 py-2">{challan.items.reduce((s, i) => s + Number(i.receivedQtyPcs ?? 0), 0).toLocaleString('en-IN')}</td>
                <td className="px-3 py-2">{fmtWt(totalRcvd)}</td>
                <td className="px-3 py-2">
                  <span className={`font-medium ${totalLossPct > 5 ? 'text-red-600' : totalLossPct > 2 ? 'text-amber-600' : 'text-green-600'}`}>
                    {fmtWt(totalLoss)} ({totalLossPct.toFixed(2)}%)
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {challan.notes && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium mb-1">Notes</p>
            <p className="text-sm text-gray-700">{challan.notes}</p>
          </div>
        )}
      </div>

      {/* Record Receipt (when OPEN or PARTIAL) */}
      {(challan.status === 'OPEN' || challan.status === 'PARTIAL') && (
        <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-orange-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Record Receipt</h2>
          </div>
          <form onSubmit={handleReceiptSubmit} className="space-y-4">
            {challan.items.map((item, i) => {
              const sentKg = Number(item.sentWeightKg)
              const rcvdKg = Number(receiptRows[i]?.receivedWeightKg) || 0
              const loss = sentKg - rcvdKg
              const lossPct = sentKg > 0 && rcvdKg > 0 ? (loss / sentKg) * 100 : null
              const lossColor = lossPct == null ? '' : lossPct > 5 ? 'text-red-600' : lossPct > 2 ? 'text-amber-600' : 'text-green-600'

              return (
                <div key={item.id} className="border border-gray-100 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{item.item.name}</p>
                    <span className="text-xs text-gray-500">Sent: {fmtWt(sentKg)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Received Qty (Pcs)</label>
                      <input
                        type="number"
                        value={receiptRows[i]?.receivedQtyPcs ?? ''}
                        onChange={e => updateReceipt(i, 'receivedQtyPcs', e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Received Weight (Kg)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={receiptRows[i]?.receivedWeightKg ?? ''}
                        onChange={e => updateReceipt(i, 'receivedWeightKg', e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      {lossPct !== null && (
                        <div className={`text-sm font-medium ${lossColor}`}>
                          {lossPct > 5 && <AlertTriangle size={14} className="inline mr-1" />}
                          Loss: {fmtWt(loss)} ({lossPct.toFixed(2)}%)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {successMsg && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm font-medium">{successMsg}</div>
            )}

            {receiptError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{receiptError}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-600 text-white py-2.5 rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
            >
              {submitting ? 'Saving Receipt...' : 'Save Receipt'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
