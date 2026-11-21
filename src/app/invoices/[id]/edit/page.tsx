'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { amountToWords } from '@/lib/amountInWords';
import { calculateLineItem, getItemMultiplier } from '@/lib/gst';
import { ActionLoader } from '@/components/common/ActionLoader';

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
  id: string;
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
  taxableAmt: number;
  cgstPct: number;
  cgstAmt: number;
  sgstPct: number;
  sgstAmt: number;
  igstPct: number;
  igstAmt: number;
  totalAmt: number;
}

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

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorList, setErrorList] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    party?: boolean;
    rows: Record<string, { itemId?: boolean; qty?: boolean; rate?: boolean; weightKg?: boolean }>;
  }>({ rows: {} });

  const [invoiceType, setInvoiceType] = useState<InvoiceType>('TAX_INVOICE');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [partyId, setPartyId] = useState<number | null>(null);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [rows, setRows] = useState<InvoiceItemRow[]>([]);
  const [roundOffEnabled, setRoundOffEnabled] = useState(true);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('UNPAID');

  const customerState = selectedParty?.stateCode ?? SELLER_STATE;
  const isSameState = SELLER_STATE === customerState;

  useEffect(() => {
    async function loadData() {
      try {
        const [partiesRes, itemsRes, invRes] = await Promise.all([
          fetch('/api/parties?type=CUSTOMER'),
          fetch('/api/items'),
          fetch(`/api/invoices/${id}`),
        ]);

        const [pData, iData, invData] = await Promise.all([
          partiesRes.json(),
          itemsRes.json(),
          invRes.json(),
        ]);

        setParties(Array.isArray(pData) ? pData : (Array.isArray(pData?.parties) ? pData.parties : []));
        setItems(Array.isArray(iData) ? iData : (Array.isArray(iData?.items) ? iData.items : []));

        if (invData && !invData.error) {
          setInvoiceType(invData.type || 'TAX_INVOICE');
          setInvoiceNo(invData.invoiceNo || '');
          setInvoiceDate(invData.invoiceDate ? invData.invoiceDate.split('T')[0] : '');
          setDueDate(invData.dueDate ? invData.dueDate.split('T')[0] : '');
          setPartyId(invData.partyId);
          setSelectedParty(invData.party || null);
          setNotes(invData.notes || '');
          setStatus(invData.status || 'UNPAID');

          if (invData.items && invData.items.length > 0) {
            const mappedRows: InvoiceItemRow[] = invData.items.map((it: any) => ({
              id: uid(),
              itemId: it.itemId,
              description: it.description || '',
              hsnCode: it.hsnCode || '',
              qty: Number(it.qtyPcs || 1),
              weightKg: Number(it.weightKg || 0),
              unit: it.unit || 'PCS',
              priceMode: it.priceMode || 'PER_PIECE',
              rate: Number(it.rate || 0),
              discountPct: Number(it.discountPct || 0),
              gstRate: Number(it.gstRate || 18),
              taxableAmt: Number(it.taxableAmt || 0),
              cgstPct: Number(it.cgstPct || 0),
              cgstAmt: Number(it.cgstAmt || 0),
              sgstPct: Number(it.sgstPct || 0),
              sgstAmt: Number(it.sgstAmt || 0),
              igstPct: Number(it.igstPct || 0),
              igstAmt: Number(it.igstAmt || 0),
              totalAmt: Number(it.totalAmt || 0),
            }));
            setRows(mappedRows);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handlePartyChange = (pId: number) => {
    setPartyId(pId);
    const list = Array.isArray(parties) ? parties : [];
    const p = list.find((x) => x.id === pId) || null;
    setSelectedParty(p);
    if (p) {
      setRows((prev) => prev.map((r) => calcRow(r, p.stateCode)));
    }
    setFieldErrors(prev => ({ ...prev, party: false }));
    setErrorList(prev => prev.filter(msg => !msg.includes('ગ્રાહક') && !msg.includes('Customer')));
    setError(null);
  };

  const handleRowChange = (rowId: string, patch: Partial<InvoiceItemRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r, ...patch };
        return calcRow(updated, customerState);
      })
    );

    setFieldErrors(prev => {
      if (!prev.rows[rowId]) return prev;
      const rowErrs = { ...prev.rows[rowId] };
      if (patch.qty !== undefined && Number(patch.qty) > 0) delete rowErrs.qty;
      if (patch.rate !== undefined && Number(patch.rate) > 0) delete rowErrs.rate;
      if (patch.weightKg !== undefined && Number(patch.weightKg) > 0) delete rowErrs.weightKg;
      return { ...prev, rows: { ...prev.rows, [rowId]: rowErrs } };
    });
    setError(null);
  };

  const handleItemSelect = (rowId: string, itemId: number) => {
    const list = Array.isArray(items) ? items : [];
    const item = list.find((x) => x.id === itemId);
    if (!item) return;

    handleRowChange(rowId, {
      itemId,
      description: item.name,
      hsnCode: item.hsnCode,
      unit: item.unit,
      priceMode: item.priceMode,
      rate: Number(item.saleRate),
      gstRate: Number(item.gstRate),
      weightKg: item.grossWeightKg ? Number(item.grossWeightKg) : 0,
    });

    setFieldErrors(prev => {
      const rowErrs = prev.rows[rowId] ? { ...prev.rows[rowId] } : {};
      delete rowErrs.itemId;
      if (item.saleRate && Number(item.saleRate) > 0) delete rowErrs.rate;
      return { ...prev, rows: { ...prev.rows, [rowId]: rowErrs } };
    });
    setError(null);
  };

  const addRow = () => {
    const r: InvoiceItemRow = {
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
      cgstPct: 0,
      cgstAmt: 0,
      sgstPct: 0,
      sgstAmt: 0,
      igstPct: 0,
      igstAmt: 0,
      totalAmt: 0,
    };
    setRows((prev) => [...prev, calcRow(r, customerState)]);
  };

  const removeRow = (rowId: string) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    setFieldErrors(prev => {
      const copy = { ...prev.rows };
      delete copy[rowId];
      return { ...prev, rows: copy };
    });
  };

  const subtotal = rows.reduce((s, r) => {
    const mult = getItemMultiplier(r.qty, r.weightKg, r.unit, r.priceMode);
    return s + (mult * (Number(r.rate) || 0));
  }, 0);
  const totalDiscount = rows.reduce((s, r) => {
    const mult = getItemMultiplier(r.qty, r.weightKg, r.unit, r.priceMode);
    return s + (mult * (Number(r.rate) || 0) * (Number(r.discountPct) || 0) / 100);
  }, 0);
  const totalTaxable = rows.reduce((s, r) => s + r.taxableAmt, 0);
  const totalCGST = rows.reduce((s, r) => s + r.cgstAmt, 0);
  const totalSGST = rows.reduce((s, r) => s + r.sgstAmt, 0);
  const totalIGST = rows.reduce((s, r) => s + r.igstAmt, 0);
  const totalGST = totalCGST + totalSGST + totalIGST;
  const rawTotal = totalTaxable + totalGST;
  const grandTotal = roundOffEnabled ? Math.round(rawTotal) : rawTotal;
  const roundOff = roundOffEnabled ? parseFloat((grandTotal - rawTotal).toFixed(2)) : 0;
  const words = amountToWords(grandTotal);

  function validateInvoice(): { valid: boolean; summary: string[]; errs: typeof fieldErrors } {
    const summary: string[] = [];
    const errs: typeof fieldErrors = { rows: {} };

    if (!partyId) {
      errs.party = true;
      summary.push('કૃપા કરીને ગ્રાહક (Customer) પસંદ કરો.');
    }

    if (rows.length === 0) {
      summary.push('ઓછામાં ઓછી એક આઈટમ (Item) બિલમાં હોવી જોઈએ.');
    } else {
      rows.forEach((r, idx) => {
        const rowNum = idx + 1;
        const rowErr: { itemId?: boolean; qty?: boolean; rate?: boolean; weightKg?: boolean } = {};

        if (!r.itemId) {
          rowErr.itemId = true;
          summary.push(`લાઈન #${rowNum}: આઈટમ પસંદ કરો.`);
        }
        if (Number(r.qty) <= 0) {
          rowErr.qty = true;
          summary.push(`લાઈન #${rowNum}: જથ્થો (Qty) 0 થી વધારે હોવો જોઈએ.`);
        }
        if (Number(r.rate) <= 0) {
          rowErr.rate = true;
          summary.push(`લાઈન #${rowNum}: ભાવ (Rate ₹) 0 થી વધારે દાખલ કરો.`);
        }
        if ((r.unit === 'KG' || r.unit === 'GRAM' || r.priceMode === 'WEIGHT') && Number(r.weightKg) <= 0) {
          rowErr.weightKg = true;
          summary.push(`લાઈન #${rowNum}: વજન (Weight Kg) 0 થી વધુ હોવું જોઈએ.`);
        }

        if (Object.keys(rowErr).length > 0) {
          errs.rows[r.id] = rowErr;
        }
      });
    }

    if (grandTotal <= 0) {
      summary.push('કુલ બિલ રકમ (Total Amount) ₹0 છે. ખાલી અથવા શૂન્ય રૂપિયાનું બિલ અપડેટ થઈ શકશે નહીં.');
    }

    return {
      valid: summary.length === 0,
      summary,
      errs,
    };
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    const { valid, summary, errs } = validateInvoice();
    if (!valid) {
      setFieldErrors(errs);
      setErrorList(summary);
      setError(summary[0]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setFieldErrors({ rows: {} });
    setErrorList([]);
    setError(null);
    setSaving(true);

    const payload = {
      type: invoiceType,
      partyId,
      invoiceDate,
      dueDate: dueDate || null,
      sellerState: SELLER_STATE,
      customerState,
      notes,
      status,
      items: rows.map((r) => ({
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
      // Delete old invoice and re-create with exact same invoiceNo
      const delRes = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (!delRes.ok) throw new Error('Failed to update existing invoice items');

      const createRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, invoiceNo }),
      });

      if (!createRes.ok) {
        const errJson = await createRes.json();
        throw new Error(errJson.error || 'Failed to update invoice');
      }

      const resData = await createRes.json();
      router.push(`/invoices/${resData.id}`);
    } catch (err: any) {
      setError(err.message || 'Error updating invoice');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading invoice details...
      </div>
    );
  }

  return (
    <form onSubmit={handleUpdate} className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-24">
      {/* ── Global Action Loader ── */}
      <ActionLoader
        isOpen={saving}
        title="ઇન્વોઇસ અપડેટ થઈ રહ્યું છે..."
        subtitle="કૃપા કરીને રાહ જુઓ, સ્ટોક અને રેટ્સ સેવ થઈ રહ્યા છે..."
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Invoice {invoiceNo}</h1>
            <p className="text-xs text-gray-500">Update party, items, rates, and GST calculations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/invoices"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Update Invoice'}
          </button>
        </div>
      </div>

      {/* ── Validation Alerts Banner ── */}
      {errorList.length > 0 ? (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-2 text-red-800 shadow-sm animate-pulse-once">
          <div className="flex items-center gap-2 font-bold text-sm text-red-900">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <span>ઇન્વોઇસ અપડેટ કરવા માટે નીચેની વિગતો પૂર્ણ કરવી જરૂરી છે:</span>
          </div>
          <ul className="list-disc list-inside text-xs space-y-1 pl-2 text-red-700 font-medium">
            {errorList.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      ) : null}

      {/* Invoice Details */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Type</label>
          <select
            value={invoiceType}
            onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
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
            value={invoiceNo}
            readOnly
            className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm font-mono text-gray-600 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date</label>
          <input
            type="date"
            required
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Party Selection */}
      <div className={`bg-white rounded-xl border shadow-sm p-5 space-y-4 transition-colors ${
        fieldErrors.party ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Customer Details</h2>
          {fieldErrors.party && (
            <span className="text-xs text-red-600 font-medium">* ગ્રાહક પસંદ કરવો ફરજિયાત છે</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Select Customer *</label>
            <select
              value={partyId || ''}
              onChange={(e) => handlePartyChange(Number(e.target.value))}
              required
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                fieldErrors.party
                  ? 'border-red-500 bg-red-50/20 ring-2 ring-red-200 focus:ring-red-500 font-medium'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            >
              <option value="">Select party...</option>
              {(Array.isArray(parties) ? parties : []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {fieldErrors.party && (
              <p className="mt-1 text-xs text-red-600 font-medium">* કૃપા કરીને ગ્રાહક પસંદ કરો</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">GSTIN</label>
            <input
              type="text"
              readOnly
              value={selectedParty?.gstin || 'Unregistered / None'}
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">State &amp; Code</label>
            <input
              type="text"
              readOnly
              value={`${selectedParty?.state || 'Gujarat'} (${customerState}) - ${isSameState ? 'CGST+SGST' : 'IGST'
                }`}
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Line Items &amp; Dual-Unit Gross System ({rows.length})</h2>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Item
          </button>
        </div>

        {/* ── Mobile View: Spacious Item Cards (md:hidden) ── */}
        <div className="md:hidden divide-y divide-gray-200">
          {rows.map((row, i) => (
            <div key={row.id} className="p-3.5 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                  Item #{i + 1}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    ₹{row.totalAmt.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length <= 1}
                    className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-30 rounded-lg hover:bg-red-50 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Item Dropdown */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Select Item <span className="text-red-500">*</span>
                </label>
                <select
                  value={row.itemId || ''}
                  onChange={(e) => handleItemSelect(row.id, Number(e.target.value))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white transition-colors ${
                    fieldErrors.rows[row.id]?.itemId
                      ? 'border-red-500 bg-red-50/20 ring-2 ring-red-200 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Select item...</option>
                  {(Array.isArray(items) ? items : []).map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.rows[row.id]?.itemId && (
                  <p className="mt-1 text-[11px] text-red-600 font-medium">* આઈટમ પસંદ કરવી જરૂરી છે</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input
                  type="text"
                  value={row.description}
                  onChange={(e) => handleRowChange(row.id, { description: e.target.value })}
                  placeholder="Item description"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Row 1: HSN, Qty, Unit */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">HSN</label>
                  <input
                    type="text"
                    value={row.hsnCode}
                    onChange={(e) => handleRowChange(row.id, { hsnCode: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Qty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={row.qty || ''}
                    onChange={(e) => handleRowChange(row.id, { qty: parseFloat(e.target.value) || 0 })}
                    className={`w-full border rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 ${
                      fieldErrors.rows[row.id]?.qty
                        ? 'border-red-500 bg-red-50/20 ring-2 ring-red-200 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {row.unit === 'GROSS' && row.qty > 0 && (
                    <div className="text-[10px] text-gray-500 text-center mt-0.5 font-medium">
                      ={(row.qty * 144).toFixed(0)} pcs
                    </div>
                  )}
                  {fieldErrors.rows[row.id]?.qty && (
                    <p className="mt-1 text-[10px] text-red-600 text-right">* Qty &gt; 0</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                  <select
                    value={row.unit}
                    onChange={(e) => handleRowChange(row.id, { unit: e.target.value as UnitType })}
                    className="w-full border border-gray-300 rounded-lg px-1 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="GROSS">GROSS</option>
                    <option value="PCS">PCS</option>
                    <option value="KG">KG</option>
                    <option value="GRAM">GRAM</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Weight, Rate */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Weight (Kg)</label>
                  <input
                    type="number"
                    step="any"
                    value={row.weightKg || ''}
                    onChange={(e) =>
                      handleRowChange(row.id, { weightKg: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.000"
                    className={`w-full border rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 ${
                      fieldErrors.rows[row.id]?.weightKg
                        ? 'border-red-500 bg-red-50/20 ring-2 ring-red-200 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {fieldErrors.rows[row.id]?.weightKg && (
                    <p className="mt-1 text-[10px] text-red-600 text-right">* વજન જરૂરી છે</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Rate (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={row.rate || ''}
                    onChange={(e) => handleRowChange(row.id, { rate: parseFloat(e.target.value) || 0 })}
                    className={`w-full border rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 ${
                      fieldErrors.rows[row.id]?.rate
                        ? 'border-red-500 bg-red-50/20 ring-2 ring-red-200 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {row.unit === 'GROSS' && (
                    <div className="text-[10px] text-gray-400 text-right mt-0.5">per 144 pcs</div>
                  )}
                  {fieldErrors.rows[row.id]?.rate && (
                    <p className="mt-1 text-[10px] text-red-600 text-right">* ભાવ જરૂરી છે</p>
                  )}
                </div>
              </div>

              {/* Row 3: Disc %, GST Rate */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Disc %</label>
                  <input
                    type="number"
                    value={row.discountPct || ''}
                    onChange={(e) =>
                      handleRowChange(row.id, { discountPct: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">GST Rate</label>
                  <select
                    value={row.gstRate}
                    onChange={(e) =>
                      handleRowChange(row.id, { gstRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              {/* Card Calculation Breakdown */}
              <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-700 flex items-center justify-between font-mono">
                <div>Taxable: ₹{row.taxableAmt.toFixed(2)}</div>
                <div>{isSameState ? `C+S: ₹${(row.cgstAmt + row.sgstAmt).toFixed(2)}` : `IGST: ₹${row.igstAmt.toFixed(2)}`}</div>
                <div className="font-bold text-blue-700">₹{row.totalAmt.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Desktop View: Full Spreadsheet Table (hidden md:block) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-[920px] w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
              <tr>
                <th className="px-2.5 py-2.5 text-left font-semibold min-w-[200px]">Item &amp; Description</th>
                <th className="px-2 py-2.5 text-center font-semibold w-20 min-w-[70px]">HSN</th>
                <th className="px-2 py-2.5 text-center font-semibold w-20 min-w-[70px]">Qty</th>
                <th className="px-2 py-2.5 text-center font-semibold w-20 min-w-[70px]">Wt(Kg)</th>
                <th className="px-2 py-2.5 text-center font-semibold w-20 min-w-[75px]">Unit</th>
                <th className="px-2 py-2.5 text-right font-semibold w-24 min-w-[85px]">Rate (₹)</th>
                <th className="px-2 py-2.5 text-center font-semibold w-16 min-w-[65px]">Disc %</th>
                <th className="px-2 py-2.5 text-right font-semibold w-24 min-w-[85px]">Taxable</th>
                <th className="px-2 py-2.5 text-center font-semibold w-20 min-w-[75px]">GST %</th>
                <th className="px-2.5 py-2.5 text-right font-semibold w-28 min-w-[95px]">Total (₹)</th>
                <th className="px-2 py-2.5 w-10 min-w-[40px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, i) => (
                <tr key={row.id} className="hover:bg-gray-50 border-b border-gray-100">
                  {/* 1. Item & Description */}
                  <td className="px-2.5 py-2">
                    <select
                      value={row.itemId || ''}
                      onChange={(e) => handleItemSelect(row.id, Number(e.target.value))}
                      className={`w-full border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 bg-white transition-colors ${
                        fieldErrors.rows[row.id]?.itemId
                          ? 'border-red-500 bg-red-50/20 ring-1 ring-red-400 focus:ring-red-500 font-medium'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">-- Select Item --</option>
                      {(Array.isArray(items) ? items : []).map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => handleRowChange(row.id, { description: e.target.value })}
                      placeholder="Description (optional)"
                      className="w-full mt-1 border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50"
                    />
                  </td>

                  {/* 2. HSN */}
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.hsnCode}
                      onChange={(e) => handleRowChange(row.id, { hsnCode: e.target.value })}
                      placeholder="HSN"
                      className="w-full border border-gray-300 rounded-md px-1.5 py-1 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* 3. Qty */}
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="any"
                      value={row.qty || ''}
                      onChange={(e) => handleRowChange(row.id, { qty: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-md px-1.5 py-1 text-xs text-right font-medium focus:outline-none focus:ring-1 transition-colors ${
                        fieldErrors.rows[row.id]?.qty
                          ? 'border-red-500 bg-red-50/20 ring-1 ring-red-400 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {row.unit === 'GROSS' && row.qty > 0 && (
                      <div className="text-[10px] text-gray-400 text-center mt-0.5 whitespace-nowrap">
                        ={(row.qty * 144).toFixed(0)} pcs
                      </div>
                    )}
                  </td>

                  {/* 4. Weight */}
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="any"
                      value={row.weightKg || ''}
                      onChange={(e) =>
                        handleRowChange(row.id, { weightKg: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0.000"
                      className={`w-full border rounded-md px-1.5 py-1 text-xs text-right font-mono focus:outline-none focus:ring-1 transition-colors ${
                        fieldErrors.rows[row.id]?.weightKg
                          ? 'border-red-500 bg-red-50/20 ring-1 ring-red-400 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                  </td>

                  {/* 5. Unit */}
                  <td className="px-2 py-2">
                    <select
                      value={row.unit}
                      onChange={(e) => handleRowChange(row.id, { unit: e.target.value as UnitType })}
                      className="w-full border border-gray-300 rounded-md px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="PCS">PCS</option>
                      <option value="KG">KG</option>
                      <option value="GRAM">GRAM</option>
                      <option value="GROSS">GROSS</option>
                    </select>
                  </td>

                  {/* 6. Rate */}
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="any"
                      value={row.rate || ''}
                      onChange={(e) => handleRowChange(row.id, { rate: parseFloat(e.target.value) || 0 })}
                      className={`w-full border rounded-md px-1.5 py-1 text-xs text-right font-medium focus:outline-none focus:ring-1 transition-colors ${
                        fieldErrors.rows[row.id]?.rate
                          ? 'border-red-500 bg-red-50/20 ring-1 ring-red-400 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {row.unit === 'GROSS' && (
                      <div className="text-[10px] text-gray-400 text-center mt-0.5 whitespace-nowrap">per 144</div>
                    )}
                  </td>

                  {/* 7. Discount % */}
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={row.discountPct || ''}
                      onChange={(e) =>
                        handleRowChange(row.id, { discountPct: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-md px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>

                  {/* 8. Taxable */}
                  <td className="px-2 py-2 text-right font-mono text-gray-700 text-xs whitespace-nowrap">
                    ₹{row.taxableAmt.toFixed(2)}
                  </td>

                  {/* 9. GST % */}
                  <td className="px-2 py-2">
                    <select
                      value={row.gstRate}
                      onChange={(e) =>
                        handleRowChange(row.id, { gstRate: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full border border-gray-300 rounded-md px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                    {(row.cgstAmt > 0 || row.igstAmt > 0) && (
                      <div className="text-[10px] text-gray-500 text-center font-mono mt-0.5 whitespace-nowrap">
                        +₹{(row.cgstAmt + row.sgstAmt || row.igstAmt).toFixed(1)}
                      </div>
                    )}
                  </td>

                  {/* 10. Total */}
                  <td className="px-2.5 py-2 text-right font-mono font-bold text-blue-700 text-xs whitespace-nowrap">
                    ₹{row.totalAmt.toFixed(2)}
                  </td>

                  {/* 11. Remove */}
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length <= 1}
                      className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-30 rounded hover:bg-red-50 transition-colors"
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <label className="block text-xs font-medium text-gray-600">Terms &amp; Notes</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Payment terms, delivery notes, etc."
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium">₹ {subtotal.toFixed(2)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span className="text-red-600">- ₹ {totalDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Taxable Amount</span>
            <span className="font-medium">₹ {totalTaxable.toFixed(2)}</span>
          </div>

          {isSameState ? (
            <>
              <div className="flex justify-between text-gray-600">
                <span>CGST (9%)</span>
                <span>₹ {totalCGST.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>SGST (9%)</span>
                <span>₹ {totalSGST.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-gray-600">
              <span>IGST (18%)</span>
              <span>₹ {totalIGST.toFixed(2)}</span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-gray-500">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={roundOffEnabled}
                onChange={(e) => setRoundOffEnabled(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              Round Off
            </label>
            <span>₹ {roundOff.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-3">
            <span>Grand Total</span>
            <span className="text-blue-800">₹ {grandTotal.toFixed(2)}</span>
          </div>

          <div className="text-xs text-gray-500 italic pt-1">{words}</div>
        </div>
      </div>
    </form>
  );
}
