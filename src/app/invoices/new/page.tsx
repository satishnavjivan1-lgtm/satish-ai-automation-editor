'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ChevronDown, Save, Send, Printer, AlertCircle } from 'lucide-react';
import { amountToWords } from '@/lib/amountInWords';
import { calculateLineItem, getItemMultiplier } from '@/lib/gst';

// ─── Types ───────────────────────────────────────────────────────────────────

type InvoiceType = 'TAX_INVOICE' | 'QUOTATION' | 'DELIVERY_CHALLAN';
type UnitType = 'PCS' | 'KG' | 'GRAM' | 'GROSS';
type PriceMode = 'PER_PIECE' | 'PER_KG' | 'PER_GRAM' | 'PER_GROSS';

interface Party {
  id: number;
  name: string;
  gstin?: string;
  state: string;
  stateCode: string;
  creditLimit: number;
  phone?: string;
}

interface Item {
  id: number;
  name: string;
  code: string;
  hsnCode: string;
  unit: UnitType;
  priceMode: PriceMode;
  saleRate: number;
  gstRate: number;
  grossWeightKg?: number;
}

interface InvoiceItemRow {
  id: string; // local key
  itemId: number | null;
  description: string;
  hsnCode: string;
  qty: number;
  weightKg: number;
  unit: UnitType;
  priceMode: PriceMode;
  rate: number;
  discountPct: number;
  gstRate: number;
  // calculated
  taxableAmt: number;
  cgstPct: number;
  cgstAmt: number;
  sgstPct: number;
  sgstAmt: number;
  igstPct: number;
  igstAmt: number;
  totalAmt: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SELLER_STATE = '24'; // Gujarat

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function calcRow(row: InvoiceItemRow, customerState: string): InvoiceItemRow {
  const calc = calculateLineItem({
    qty: Number(row.qty) || 0,
    weightKg: Number(row.weightKg) || 0,
    unit: row.unit,
    priceMode: row.priceMode,
    rate: Number(row.rate) || 0,
    discountPct: Number(row.discountPct) || 0,
    gstRate: Number(row.gstRate) || 18,
    sellerState: SELLER_STATE,
    customerState: customerState || SELLER_STATE,
  });

  return {
    ...row,
    taxableAmt: calc.taxableAmt,
    cgstPct: calc.cgstPct,
    cgstAmt: calc.cgstAmt,
    sgstPct: calc.sgstPct,
    sgstAmt: calc.sgstAmt,
    igstPct: calc.igstPct,
    igstAmt: calc.igstAmt,
    totalAmt: calc.totalAmt,
  };
}

function newRow(): InvoiceItemRow {
  return {
    id: uid(),
    itemId: null,
    description: '',
    hsnCode: '',
    qty: 1,
    weightKg: 0,
    unit: 'PCS',
    priceMode: 'PER_PIECE',
    rate: 0,
    discountPct: 0,
    gstRate: 18,
    taxableAmt: 0,
    cgstPct: 9,
    cgstAmt: 0,
    sgstPct: 9,
    sgstAmt: 0,
    igstPct: 0,
    igstAmt: 0,
    totalAmt: 0,
  };
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function fmtMoney(n: number) {
  return '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NewInvoicePage() {
  const router = useRouter();

  // Header state
  const [invoiceType, setInvoiceType]     = useState<InvoiceType>('TAX_INVOICE');
  const [invoiceDate, setInvoiceDate]     = useState(todayStr());
  const [dueDate, setDueDate]             = useState('');
  const [invoiceNo, setInvoiceNo]         = useState('');
  const [invoiceNoLoading, setInvoiceNoLoading] = useState(true);

  // Party state
  const [parties, setParties]             = useState<Party[]>([]);
  const [partyId, setPartyId]             = useState<number | null>(null);
  const [partySearch, setPartySearch]     = useState('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);

  // Items catalog
  const [catalog, setCatalog]             = useState<Item[]>([]);

  // Invoice rows
  const [rows, setRows]                   = useState<InvoiceItemRow[]>([newRow()]);

  // Options
  const [enableRoundOff, setEnableRoundOff] = useState(true);
  const [notes, setNotes]                   = useState('');

  // Saving state
  const [saving, setSaving]               = useState<null | 'draft' | 'send' | 'print'>(null);
  const [error, setError]                 = useState('');

  // ── Fetch auto invoice number ──
  useEffect(() => {
    setInvoiceNoLoading(true);
    fetch('/api/invoices/next-no')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.invoiceNo) setInvoiceNo(d.invoiceNo); })
      .finally(() => setInvoiceNoLoading(false));
  }, []);

  // ── Fetch parties ──
  useEffect(() => {
    fetch('/api/parties?type=CUSTOMER')
      .then(r => r.json())
      .then(d => setParties(d.parties ?? d ?? []));
  }, []);

  // ── Fetch catalog ──
  useEffect(() => {
    fetch('/api/items?active=1')
      .then(r => r.json())
      .then(d => setCatalog(d.items ?? d ?? []));
  }, []);

  // ── Recalculate all rows when customer state changes ──
  const customerState = selectedParty?.stateCode ?? SELLER_STATE;
  const isSameState = SELLER_STATE === customerState;

  const recalcRows = useCallback((currentRows: InvoiceItemRow[], state: string) => {
    return currentRows.map(r => calcRow(r, state));
  }, []);

  useEffect(() => {
    setRows(prev => recalcRows(prev, customerState));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerState]);

  // ── Party select ──
  function handlePartySelect(id: number) {
    const p = parties.find(x => x.id === id) ?? null;
    setPartyId(id);
    setSelectedParty(p);
    setPartySearch(p?.name ?? '');
  }

  // ── Item row handlers ──
  function handleItemSelect(rowId: string, itemId: number) {
    const item = catalog.find(i => i.id === itemId);
    if (!item) return;
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const gw = item.grossWeightKg ? parseFloat(String(item.grossWeightKg)) : 0;
      const initialWeight = gw > 0 ? (item.unit === 'GROSS' ? (r.qty || 1) * gw : ((r.qty || 1) / 144) * gw) : r.weightKg;
      const updated: InvoiceItemRow = {
        ...r,
        itemId: item.id,
        description: item.name,
        hsnCode: item.hsnCode,
        unit: item.unit,
        priceMode: item.priceMode,
        rate: parseFloat(String(item.saleRate)),
        gstRate: parseFloat(String(item.gstRate)),
        weightKg: initialWeight > 0 ? parseFloat(initialWeight.toFixed(3)) : r.weightKg,
      };
      return calcRow(updated, customerState);
    }));
  }

  function handleRowChange(rowId: string, field: keyof InvoiceItemRow, value: string | number) {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const updated = { ...r, [field]: value };
      return calcRow(updated, customerState);
    }));
  }

  function addRow() {
    setRows(prev => [...prev, calcRow(newRow(), customerState)]);
  }

  function removeRow(rowId: string) {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== rowId) : prev);
  }

  // ── Totals ──
  const subtotal      = rows.reduce((s, r) => {
    const mult = getItemMultiplier(r.qty, r.weightKg, r.unit, r.priceMode);
    return s + (mult * (Number(r.rate) || 0));
  }, 0);
  const totalDiscount = rows.reduce((s, r) => {
    const mult = getItemMultiplier(r.qty, r.weightKg, r.unit, r.priceMode);
    return s + (mult * (Number(r.rate) || 0) * (Number(r.discountPct) || 0) / 100);
  }, 0);
  const totalTaxable  = rows.reduce((s, r) => s + r.taxableAmt, 0);
  const totalCGST     = rows.reduce((s, r) => s + r.cgstAmt, 0);
  const totalSGST     = rows.reduce((s, r) => s + r.sgstAmt, 0);
  const totalIGST     = rows.reduce((s, r) => s + r.igstAmt, 0);
  const grandTotal    = totalTaxable + totalCGST + totalSGST + totalIGST;
  const roundOff      = enableRoundOff ? parseFloat((Math.round(grandTotal) - grandTotal).toFixed(2)) : 0;
  const finalTotal    = enableRoundOff ? Math.round(grandTotal) : grandTotal;

  // ── Save ──
  async function handleSave(status: 'DRAFT' | 'SENT') {
    if (!partyId) { setError('Please select a party.'); return; }
    if (rows.some(r => !r.itemId)) { setError('Please select an item for each row.'); return; }
    if (!invoiceNo.trim()) { setError('Invoice number is required.'); return; }
    setError('');
    setSaving(status === 'DRAFT' ? 'draft' : 'send');

    const payload = {
      invoiceNo,
      type: invoiceType,
      partyId,
      invoiceDate,
      dueDate: dueDate || null,
      sellerState: SELLER_STATE,
      customerState,
      gstType: isSameState ? 'SAME_STATE' : 'DIFF_STATE',
      subtotal: parseFloat(subtotal.toFixed(2)),
      discountAmt: parseFloat(totalDiscount.toFixed(2)),
      taxableAmt: parseFloat(totalTaxable.toFixed(2)),
      cgstAmt: parseFloat(totalCGST.toFixed(2)),
      sgstAmt: parseFloat(totalSGST.toFixed(2)),
      igstAmt: parseFloat(totalIGST.toFixed(2)),
      roundOff: parseFloat(roundOff.toFixed(2)),
      totalAmt: parseFloat(finalTotal.toFixed(2)),
      amountInWords: amountToWords(finalTotal),
      status,
      notes,
      items: rows.map(r => ({
        itemId: r.itemId,
        description: r.description,
        hsnCode: r.hsnCode,
        qtyPcs: r.qty,
        weightKg: r.weightKg,
        unit: r.unit,
        priceMode: r.priceMode,
        rate: r.rate,
        discountPct: r.discountPct,
        taxableAmt: r.taxableAmt,
        gstRate: r.gstRate,
        cgstPct: r.cgstPct,
        sgstPct: r.sgstPct,
        igstPct: r.igstPct,
        cgstAmt: r.cgstAmt,
        sgstAmt: r.sgstAmt,
        igstAmt: r.igstAmt,
        totalAmt: r.totalAmt,
      })),
    };

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? 'Failed to save invoice');
      }
      const { id } = await res.json();
      router.push(`/invoices/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(null);
    }
  }

  async function handlePreviewPrint() {
    setSaving('print');
    await handleSave('DRAFT');
    // The redirect to /invoices/[id] happens after save; user can print from there
  }

  // ── Render ──
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          isSameState ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        }`}>
          {isSameState ? 'CGST + SGST (Same State)' : 'IGST (Inter-State)'}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Section 1: Invoice Header ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Type</label>
          <select
            value={invoiceType}
            onChange={e => setInvoiceType(e.target.value as InvoiceType)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TAX_INVOICE">Tax Invoice</option>
            <option value="QUOTATION">Quotation</option>
            <option value="DELIVERY_CHALLAN">Delivery Challan</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Invoice No</label>
          <input
            type="text"
            value={invoiceNoLoading ? 'Generating…' : invoiceNo}
            onChange={e => setInvoiceNo(e.target.value)}
            disabled={invoiceNoLoading}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date</label>
          <input
            type="date"
            value={invoiceDate}
            onChange={e => setInvoiceDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ── Section 2: Party Selection ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Customer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">Select Customer *</label>
            <div className="relative">
              <select
                value={partyId ?? ''}
                onChange={e => handlePartySelect(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8"
              >
                <option value="">-- Select Customer --</option>
                {parties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {selectedParty && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 text-sm space-y-1">
              {selectedParty.gstin && (
                <div><span className="text-gray-500 text-xs">GSTIN:</span> <strong className="font-mono">{selectedParty.gstin}</strong></div>
              )}
              <div>
                <span className="text-gray-500 text-xs">State:</span>{' '}
                <strong>{selectedParty.state}</strong>{' '}
                <span className="text-xs text-gray-500">({selectedParty.stateCode})</span>
                {!isSameState && (
                  <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Inter-State → IGST</span>
                )}
              </div>
              <div><span className="text-gray-500 text-xs">Credit Limit:</span> <strong>{fmtMoney(selectedParty.creditLimit)}</strong></div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: Items Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 min-w-[160px]">Item</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 min-w-[140px]">Description</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 w-20">HSN</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 w-20">Qty</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 w-20">Wt(Kg)</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 w-16">Unit</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600 w-24">Rate</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 w-16">Disc%</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600 w-24">Taxable</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-600 w-16">GST%</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600 w-24">
                  {isSameState ? 'CGST / SGST' : 'IGST'}
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600 w-24">Total</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <ItemRow
                  key={row.id}
                  row={row}
                  catalog={catalog}
                  isSameState={isSameState}
                  onItemSelect={(itemId) => handleItemSelect(row.id, itemId)}
                  onChange={(field, value) => handleRowChange(row.id, field, value)}
                  onRemove={() => removeRow(row.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900 font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* ── Section 4: Totals ── */}
      <div className="flex justify-end">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full max-w-sm p-5 space-y-2 text-sm">
          <TotalsRow label="Subtotal"        value={fmtMoney(subtotal)} />
          {totalDiscount > 0 && (
            <TotalsRow label="Total Discount" value={`- ${fmtMoney(totalDiscount)}`} />
          )}
          <TotalsRow label="Taxable Amount"  value={fmtMoney(totalTaxable)} />

          {isSameState ? (
            <>
              <TotalsRow label="CGST" value={fmtMoney(totalCGST)} />
              <TotalsRow label="SGST" value={fmtMoney(totalSGST)} />
            </>
          ) : (
            <TotalsRow label="IGST" value={fmtMoney(totalIGST)} />
          )}

          {/* Round Off toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableRoundOff}
                onChange={e => setEnableRoundOff(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              Round Off
            </label>
            {enableRoundOff && (
              <span className="text-gray-600 font-mono">
                {roundOff >= 0 ? '+' : ''}{roundOff.toFixed(2)}
              </span>
            )}
          </div>

          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-gray-900">TOTAL</span>
              <span className="text-lg font-bold text-blue-700">{fmtMoney(finalTotal)}</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-800 leading-relaxed">
            <strong>Amount in Words:</strong><br />
            {amountToWords(finalTotal)}
          </div>
        </div>
      </div>

      {/* ── Section 5: Notes ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <label className="block text-xs font-medium text-gray-600 mb-2">Notes / Terms</label>
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Enter any notes or terms & conditions..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* ── Section 6: Action Buttons ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-end gap-3 z-10">
        <button
          type="button"
          onClick={() => handleSave('DRAFT')}
          disabled={!!saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving === 'draft' ? 'Saving…' : 'Save as Draft'}
        </button>
        <button
          type="button"
          onClick={() => handleSave('SENT')}
          disabled={!!saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" />
          {saving === 'send' ? 'Saving…' : 'Save & Send'}
        </button>
        <button
          type="button"
          onClick={handlePreviewPrint}
          disabled={!!saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          <Printer className="h-4 w-4" />
          {saving === 'print' ? 'Saving…' : 'Preview & Print'}
        </button>
      </div>
    </div>
  );
}

// ─── Item Row Sub-Component ───────────────────────────────────────────────────

interface ItemRowProps {
  row: InvoiceItemRow;
  catalog: Item[];
  isSameState: boolean;
  onItemSelect: (id: number) => void;
  onChange: (field: keyof InvoiceItemRow, value: string | number) => void;
  onRemove: () => void;
}

function ItemRow({ row, catalog, isSameState, onItemSelect, onChange, onRemove }: ItemRowProps) {
  const isGross = row.unit === 'GROSS';

  return (
    <tr className="hover:bg-gray-50">
      {/* Item selector */}
      <td className="px-3 py-2">
        <select
          value={row.itemId ?? ''}
          onChange={e => onItemSelect(Number(e.target.value))}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">-- Select --</option>
          {catalog.map(item => (
            <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
          ))}
        </select>
      </td>

      {/* Description */}
      <td className="px-3 py-2">
        <input
          type="text"
          value={row.description}
          onChange={e => onChange('description', e.target.value)}
          placeholder="Description"
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </td>

      {/* HSN */}
      <td className="px-3 py-2">
        <input
          type="text"
          value={row.hsnCode}
          onChange={e => onChange('hsnCode', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </td>

      {/* Qty */}
      <td className="px-3 py-2">
        <input
          type="number"
          min="0"
          step="any"
          value={row.qty}
          onChange={e => onChange('qty', parseFloat(e.target.value) || 0)}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {isGross && row.qty > 0 && (
          <div className="text-gray-400 text-[10px] text-center mt-0.5">
            = {(row.qty * 144).toFixed(0)} pcs
          </div>
        )}
      </td>

      {/* Weight Kg */}
      <td className="px-3 py-2">
        <input
          type="number"
          min="0"
          step="0.001"
          value={row.weightKg || ''}
          onChange={e => onChange('weightKg', parseFloat(e.target.value) || 0)}
          placeholder="0.000"
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </td>

      {/* Unit */}
      <td className="px-3 py-2">
        <select
          value={row.unit}
          onChange={e => onChange('unit', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-1 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="PCS">PCS</option>
          <option value="KG">KG</option>
          <option value="GRAM">GRAM</option>
          <option value="GROSS">GROSS</option>
        </select>
      </td>

      {/* Rate */}
      <td className="px-3 py-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={row.rate}
          onChange={e => onChange('rate', parseFloat(e.target.value) || 0)}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {row.unit === 'GROSS' && (
          <div className="text-gray-400 text-[10px] text-center mt-0.5">per 144 pcs</div>
        )}
      </td>

      {/* Discount % */}
      <td className="px-3 py-2">
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={row.discountPct}
          onChange={e => onChange('discountPct', parseFloat(e.target.value) || 0)}
          className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </td>

      {/* Taxable Amount */}
      <td className="px-3 py-2 text-right font-mono text-gray-700">
        {row.taxableAmt.toFixed(2)}
      </td>

      {/* GST Rate */}
      <td className="px-3 py-2">
        <select
          value={row.gstRate}
          onChange={e => onChange('gstRate', parseFloat(e.target.value))}
          className="w-full border border-gray-300 rounded-md px-1 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value={0}>0%</option>
          <option value={5}>5%</option>
          <option value={12}>12%</option>
          <option value={18}>18%</option>
          <option value={28}>28%</option>
        </select>
      </td>

      {/* CGST/SGST or IGST */}
      <td className="px-3 py-2 text-right font-mono text-gray-700 text-[11px] leading-relaxed">
        {isSameState ? (
          <>
            <div>C: {row.cgstAmt.toFixed(2)}</div>
            <div>S: {row.sgstAmt.toFixed(2)}</div>
          </>
        ) : (
          <div>{row.igstAmt.toFixed(2)}</div>
        )}
      </td>

      {/* Total */}
      <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
        {row.totalAmt.toFixed(2)}
      </td>

      {/* Remove */}
      <td className="px-3 py-2 text-center">
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
          title="Remove row"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── Totals Row Helper ────────────────────────────────────────────────────────

function TotalsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-700">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
