'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ChevronDown, Save, Send, Printer, AlertCircle } from 'lucide-react';
import { amountToWords } from '@/lib/amountInWords';
import { calculateLineItem, getItemMultiplier } from '@/lib/gst';
import { ActionLoader } from '@/components/common/ActionLoader';

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
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('TAX_INVOICE');
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceNoLoading, setInvoiceNoLoading] = useState(true);

  // Party state
  const [parties, setParties] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState<number | null>(null);
  const [partySearch, setPartySearch] = useState('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);

  // Items catalog
  const [catalog, setCatalog] = useState<Item[]>([]);

  // Invoice rows
  const [rows, setRows] = useState<InvoiceItemRow[]>([newRow()]);

  // Options
  const [enableRoundOff, setEnableRoundOff] = useState(true);
  const [notes, setNotes] = useState('');

  // Saving state
  const [saving, setSaving] = useState<null | 'draft' | 'send' | 'print'>(null);
  const [error, setError] = useState('');
  const [errorList, setErrorList] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    party?: boolean;
    invoiceNo?: boolean;
    invoiceDate?: boolean;
    rows: Record<string, { itemId?: boolean; qty?: boolean; rate?: boolean; weightKg?: boolean }>;
  }>({ rows: {} });

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
      .then(d => {
        if (Array.isArray(d)) setParties(d);
        else if (Array.isArray(d?.parties)) setParties(d.parties);
        else setParties([]);
      })
      .catch(() => setParties([]));
  }, []);

  // ── Fetch catalog ──
  useEffect(() => {
    fetch('/api/items?active=1')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setCatalog(d);
        else if (Array.isArray(d?.items)) setCatalog(d.items);
        else setCatalog([]);
      })
      .catch(() => setCatalog([]));
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
    const list = Array.isArray(parties) ? parties : [];
    const p = list.find(x => x.id === id) ?? null;
    setPartyId(id);
    setSelectedParty(p);
    setPartySearch(p?.name ?? '');

    // Clear party error on selection
    setFieldErrors(prev => ({ ...prev, party: false }));
    setError('');
    setErrorList(prev => prev.filter(msg => !msg.includes('ગ્રાહક') && !msg.includes('Customer')));
  }

  // ── Item row handlers ──
  function handleItemSelect(rowId: string, itemId: number) {
    const cat = Array.isArray(catalog) ? catalog : [];
    const item = cat.find(i => i.id === itemId);
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

    // Clear row error
    setFieldErrors(prev => {
      const rowErrs = prev.rows[rowId] ? { ...prev.rows[rowId] } : {};
      delete rowErrs.itemId;
      if (item.saleRate && Number(item.saleRate) > 0) delete rowErrs.rate;
      return { ...prev, rows: { ...prev.rows, [rowId]: rowErrs } };
    });
    setError('');
  }

  function handleRowChange(rowId: string, field: keyof InvoiceItemRow, value: string | number) {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const updated = { ...r, [field]: value };
      return calcRow(updated, customerState);
    }));

    // Clear field error
    setFieldErrors(prev => {
      if (!prev.rows[rowId]) return prev;
      const rowErrs = { ...prev.rows[rowId] };
      if (field === 'qty' && Number(value) > 0) delete rowErrs.qty;
      if (field === 'rate' && Number(value) > 0) delete rowErrs.rate;
      if (field === 'weightKg' && Number(value) > 0) delete rowErrs.weightKg;
      return { ...prev, rows: { ...prev.rows, [rowId]: rowErrs } };
    });
    setError('');
  }

  function addRow() {
    setRows(prev => [...prev, calcRow(newRow(), customerState)]);
  }

  function removeRow(rowId: string) {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== rowId) : prev);
    setFieldErrors(prev => {
      const copy = { ...prev.rows };
      delete copy[rowId];
      return { ...prev, rows: copy };
    });
  }

  // ── Totals ──
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
  const grandTotal = totalTaxable + totalCGST + totalSGST + totalIGST;
  const roundOff = enableRoundOff ? parseFloat((Math.round(grandTotal) - grandTotal).toFixed(2)) : 0;
  const finalTotal = enableRoundOff ? Math.round(grandTotal) : grandTotal;

  // ── Comprehensive Validation Across All Sections ──
  function validateInvoice(): { valid: boolean; summary: string[]; errs: typeof fieldErrors } {
    const summary: string[] = [];
    const errs: typeof fieldErrors = { rows: {} };

    // 1. Customer Section
    if (!partyId) {
      errs.party = true;
      summary.push('કૃપા કરીને ગ્રાહક (Customer) પસંદ કરો.');
    }

    // 2. Invoice Details Section
    if (!invoiceNo.trim()) {
      errs.invoiceNo = true;
      summary.push('ઇન્વોઇસ નંબર દાખલ કરવો જરૂરી છે.');
    }
    if (!invoiceDate) {
      errs.invoiceDate = true;
      summary.push('ઇન્વોઇસ તારીખ પસંદ કરો.');
    }

    // 3. Items Section
    if (rows.length === 0) {
      summary.push('ઓછામાં ઓછી એક આઈટમ (Item) બિલમાં ઉમેરો.');
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
        if ((r.unit === 'KG' || r.unit === 'GRAM' || (r.priceMode as string) === 'PER_KG' || (r.priceMode as string) === 'WEIGHT') && Number(r.weightKg) <= 0) {
          rowErr.weightKg = true;
          summary.push(`લાઈન #${rowNum}: વજન (Weight Kg) 0 થી વધુ હોવું જોઈએ.`);
        }

        if (Object.keys(rowErr).length > 0) {
          errs.rows[r.id] = rowErr;
        }
      });
    }

    // 4. Total Amount Section
    if (finalTotal <= 0) {
      summary.push('કુલ બિલ રકમ (Total Amount) ₹0 છે. ખાલી અથવા શૂન્ય રૂપિયાનું બિલ સેવ કે પ્રિન્ટ નહીં થાય.');
    }

    return {
      valid: summary.length === 0,
      summary,
      errs,
    };
  }

  // ── Execute Save (Internal API POST) ──
  async function executeSave(status: 'DRAFT' | 'SENT') {
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
      setSaving(null);
    }
  }

  // ── Save Trigger with Validation ──
  async function handleSave(status: 'DRAFT' | 'SENT') {
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
    setError('');
    setSaving(status === 'DRAFT' ? 'draft' : 'send');
    await executeSave(status);
  }

  // ── Preview & Print Trigger with Validation ──
  async function handlePreviewPrint() {
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
    setError('');
    setSaving('print');
    await executeSave('DRAFT');
  }

  // ── Render ──
  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-36 lg:pb-24">
      {/* ── Global Action Loader ── */}
      <ActionLoader
        isOpen={!!saving}
        title={
          saving === 'draft'
            ? 'Draft ઇન્વોઇસ સેવ થઈ રહ્યું છે...'
            : saving === 'send'
            ? 'ઇન્વોઇસ સેવ થઈ રહ્યું છે...'
            : 'પ્રિન્ટ / PDF ઇન્વોઇસ તૈયાર થઈ રહ્યું છે...'
        }
        subtitle="કૃપા કરીને રાહ જુઓ, સ્ટોક અને GST ગણતરી પ્રોસેસ થઈ રહી છે..."
      />

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${isSameState ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
          {isSameState ? 'CGST + SGST (Same State)' : 'IGST (Inter-State)'}
        </span>
      </div>

      {/* ── Validation Alerts Banner ── */}
      {errorList.length > 0 ? (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-2 text-red-800 shadow-sm animate-pulse-once">
          <div className="flex items-center gap-2 font-bold text-sm text-red-900">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <span>બિલ સેવ અથવા પ્રિન્ટ કરવા માટે નીચેની વિગતો પૂર્ણ કરવી જરૂરી છે:</span>
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
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Invoice No <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={invoiceNoLoading ? 'Generating…' : invoiceNo}
            onChange={e => {
              setInvoiceNo(e.target.value);
              if (e.target.value.trim()) setFieldErrors(prev => ({ ...prev, invoiceNo: false }));
            }}
            disabled={invoiceNoLoading}
            className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 ${
              fieldErrors.invoiceNo
                ? 'border-red-500 bg-red-50/20 ring-2 ring-red-200 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {fieldErrors.invoiceNo && (
            <p className="mt-1 text-[11px] text-red-600">* ઇન્વોઇસ નંબર જરૂરી છે</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Invoice Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={invoiceDate}
            onChange={e => {
              setInvoiceDate(e.target.value);
              if (e.target.value) setFieldErrors(prev => ({ ...prev, invoiceDate: false }));
            }}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              fieldErrors.invoiceDate
                ? 'border-red-500 bg-red-50/20 ring-2 ring-red-200 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {fieldErrors.invoiceDate && (
            <p className="mt-1 text-[11px] text-red-600">* તારીખ પસંદ કરો</p>
          )}
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
      <div className={`bg-white rounded-xl border shadow-sm p-5 space-y-4 transition-colors ${
        fieldErrors.party ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Customer</h2>
          {fieldErrors.party && (
            <span className="text-xs text-red-600 font-medium">* ગ્રાહક પસંદ કરવો ફરજિયાત છે</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Select Customer <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={partyId ?? ''}
                onChange={e => handlePartySelect(Number(e.target.value))}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 appearance-none pr-8 transition-colors ${
                  fieldErrors.party
                    ? 'border-red-500 bg-red-50/20 ring-2 ring-red-200 focus:ring-red-500 font-medium'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              >
                <option value="">-- Select Customer --</option>
                {(Array.isArray(parties) ? parties : []).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {fieldErrors.party && (
              <p className="mt-1 text-xs text-red-600 font-medium">
                * કૃપા કરીને ગ્રાહક (Customer) પસંદ કરો
              </p>
            )}
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

      {/* ── Section 3: Items (Mobile Cards & Desktop Table) ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
            Items ({rows.length})
          </h2>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-blue-700 hover:text-blue-900 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>

        {/* ── Mobile View: Spacious Item Cards (md:hidden) ── */}
        <div className="md:hidden divide-y divide-gray-200">
          {rows.map((row, idx) => (
            <div key={row.id} className="p-3.5 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                  Item #{idx + 1}
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

              {/* Item Selector */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Select Item <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={row.itemId ?? ''}
                    onChange={e => handleItemSelect(row.id, Number(e.target.value))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white appearance-none pr-8 transition-colors ${
                      fieldErrors.rows[row.id]?.itemId
                        ? 'border-red-500 bg-red-50/20 ring-2 ring-red-200 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">-- Select Item --</option>
                    {(Array.isArray(catalog) ? catalog : []).map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
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
                  onChange={e => handleRowChange(row.id, 'description', e.target.value)}
                  placeholder="Item Description"
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
                    onChange={e => handleRowChange(row.id, 'hsnCode', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Qty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={row.qty || ''}
                    onChange={e => handleRowChange(row.id, 'qty', parseFloat(e.target.value) || 0)}
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
                    onChange={e => handleRowChange(row.id, 'unit', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-1 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="PCS">PCS</option>
                    <option value="KG">KG</option>
                    <option value="GRAM">GRAM</option>
                    <option value="GROSS">GROSS</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Weight (Kg), Rate (₹) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Weight (Kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={row.weightKg || ''}
                    onChange={e => handleRowChange(row.id, 'weightKg', parseFloat(e.target.value) || 0)}
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
                    min="0"
                    step="0.01"
                    value={row.rate || ''}
                    onChange={e => handleRowChange(row.id, 'rate', parseFloat(e.target.value) || 0)}
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
                    min="0"
                    max="100"
                    step="0.01"
                    value={row.discountPct || ''}
                    onChange={e => handleRowChange(row.id, 'discountPct', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">GST Rate</label>
                  <select
                    value={row.gstRate}
                    onChange={e => handleRowChange(row.id, 'gstRate', parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
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
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2.5 py-2.5 text-left font-semibold text-gray-700 min-w-[200px]">Item &amp; Description</th>
                <th className="px-2 py-2.5 text-center font-semibold text-gray-700 w-20 min-w-[70px]">HSN</th>
                <th className="px-2 py-2.5 text-center font-semibold text-gray-700 w-20 min-w-[70px]">Qty</th>
                <th className="px-2 py-2.5 text-center font-semibold text-gray-700 w-20 min-w-[70px]">Wt(Kg)</th>
                <th className="px-2 py-2.5 text-center font-semibold text-gray-700 w-20 min-w-[75px]">Unit</th>
                <th className="px-2 py-2.5 text-right font-semibold text-gray-700 w-24 min-w-[85px]">Rate (₹)</th>
                <th className="px-2 py-2.5 text-center font-semibold text-gray-700 w-16 min-w-[65px]">Disc%</th>
                <th className="px-2 py-2.5 text-right font-semibold text-gray-700 w-24 min-w-[85px]">Taxable</th>
                <th className="px-2 py-2.5 text-center font-semibold text-gray-700 w-20 min-w-[75px]">GST%</th>
                <th className="px-2.5 py-2.5 text-right font-semibold text-gray-700 w-28 min-w-[95px]">Total (₹)</th>
                <th className="px-2 py-2.5 w-10 min-w-[40px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <ItemRow
                  key={row.id}
                  row={row}
                  catalog={catalog}
                  isSameState={isSameState}
                  rowErrors={fieldErrors.rows[row.id]}
                  onItemSelect={(itemId) => handleItemSelect(row.id, itemId)}
                  onChange={(field, value) => handleRowChange(row.id, field, value)}
                  onRemove={() => removeRow(row.id)}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-gray-100">
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full max-w-sm p-4 sm:p-5 space-y-2 text-sm">
          <TotalsRow label="Subtotal" value={fmtMoney(subtotal)} />
          {totalDiscount > 0 && (
            <TotalsRow label="Total Discount" value={`- ${fmtMoney(totalDiscount)}`} />
          )}
          <TotalsRow label="Taxable Amount" value={fmtMoney(totalTaxable)} />

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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
        <label className="block text-xs font-medium text-gray-600 mb-2">Notes / Terms</label>
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Enter any notes or terms & conditions..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* ── Section 6: Action Buttons (Positioned above mobile dock) ── */}
      <div className="fixed bottom-14 lg:bottom-0 left-0 lg:left-64 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-3 sm:px-6 py-2.5 flex items-center justify-between sm:justify-end gap-2 z-20 shadow-lg">
        <button
          type="button"
          onClick={() => handleSave('DRAFT')}
          disabled={!!saving}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 bg-gray-100 text-gray-800 text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Save className="h-4 w-4" />
          <span>{saving === 'draft' ? 'Saving…' : 'Draft'}</span>
        </button>
        <button
          type="button"
          onClick={() => handleSave('SENT')}
          disabled={!!saving}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 bg-green-700 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Send className="h-4 w-4" />
          <span>{saving === 'send' ? 'Saving…' : 'Save & Send'}</span>
        </button>
        <button
          type="button"
          onClick={handlePreviewPrint}
          disabled={!!saving}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Printer className="h-4 w-4" />
          <span>{saving === 'print' ? 'Saving…' : 'Preview'}</span>
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
  rowErrors?: { itemId?: boolean; qty?: boolean; rate?: boolean; weightKg?: boolean };
  onItemSelect: (id: number) => void;
  onChange: (field: keyof InvoiceItemRow, value: string | number) => void;
  onRemove: () => void;
}

function ItemRow({ row, catalog, isSameState, rowErrors, onItemSelect, onChange, onRemove }: ItemRowProps) {
  const isGross = row.unit === 'GROSS';

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100">
      {/* 1. Item selector & Description */}
      <td className="px-2.5 py-2">
        <select
          value={row.itemId ?? ''}
          onChange={e => onItemSelect(Number(e.target.value))}
          className={`w-full border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 bg-white transition-colors ${
            rowErrors?.itemId
              ? 'border-red-500 bg-red-50/20 ring-1 ring-red-400 focus:ring-red-500 font-medium'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        >
          <option value="">-- Select Item --</option>
          {(Array.isArray(catalog) ? catalog : []).map(item => (
            <option key={item.id} value={item.id}>{item.name} ({item.code})</option>
          ))}
        </select>
        <input
          type="text"
          value={row.description}
          onChange={e => onChange('description', e.target.value)}
          placeholder="Description (optional)"
          className="w-full mt-1 border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50"
        />
      </td>

      {/* 2. HSN */}
      <td className="px-2 py-2">
        <input
          type="text"
          value={row.hsnCode}
          onChange={e => onChange('hsnCode', e.target.value)}
          placeholder="HSN"
          className="w-full border border-gray-300 rounded-md px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
        />
      </td>

      {/* 3. Qty */}
      <td className="px-2 py-2">
        <input
          type="number"
          min="0"
          step="any"
          value={row.qty || ''}
          onChange={e => onChange('qty', parseFloat(e.target.value) || 0)}
          className={`w-full border rounded-md px-1.5 py-1 text-xs text-right font-medium focus:outline-none focus:ring-1 transition-colors ${
            rowErrors?.qty
              ? 'border-red-500 bg-red-50/20 ring-1 ring-red-400 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {isGross && row.qty > 0 && (
          <div className="text-gray-400 text-[10px] text-center mt-0.5 whitespace-nowrap">
            ={(row.qty * 144).toFixed(0)} pcs
          </div>
        )}
      </td>

      {/* 4. Weight Kg */}
      <td className="px-2 py-2">
        <input
          type="number"
          min="0"
          step="0.001"
          value={row.weightKg || ''}
          onChange={e => onChange('weightKg', parseFloat(e.target.value) || 0)}
          placeholder="0.000"
          className={`w-full border rounded-md px-1.5 py-1 text-xs text-right font-mono focus:outline-none focus:ring-1 transition-colors ${
            rowErrors?.weightKg
              ? 'border-red-500 bg-red-50/20 ring-1 ring-red-400 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
      </td>

      {/* 5. Unit */}
      <td className="px-2 py-2">
        <select
          value={row.unit}
          onChange={e => onChange('unit', e.target.value)}
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
          min="0"
          step="0.01"
          value={row.rate || ''}
          onChange={e => onChange('rate', parseFloat(e.target.value) || 0)}
          className={`w-full border rounded-md px-1.5 py-1 text-xs text-right font-medium focus:outline-none focus:ring-1 transition-colors ${
            rowErrors?.rate
              ? 'border-red-500 bg-red-50/20 ring-1 ring-red-400 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {row.unit === 'GROSS' && (
          <div className="text-gray-400 text-[10px] text-center mt-0.5 whitespace-nowrap">per 144</div>
        )}
      </td>

      {/* 7. Discount % */}
      <td className="px-2 py-2">
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={row.discountPct || ''}
          onChange={e => onChange('discountPct', parseFloat(e.target.value) || 0)}
          placeholder="0"
          className="w-full border border-gray-300 rounded-md px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </td>

      {/* 8. Taxable Amount */}
      <td className="px-2 py-2 text-right font-mono text-gray-700 text-xs whitespace-nowrap">
        ₹{row.taxableAmt.toFixed(2)}
      </td>

      {/* 9. GST Rate + Tax Amt Breakdown */}
      <td className="px-2 py-2">
        <select
          value={row.gstRate}
          onChange={e => onChange('gstRate', parseFloat(e.target.value))}
          className="w-full border border-gray-300 rounded-md px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
        >
          <option value={0}>0%</option>
          <option value={5}>5%</option>
          <option value={12}>12%</option>
          <option value={18}>18%</option>
          <option value={28}>28%</option>
        </select>
        {(row.cgstAmt > 0 || row.igstAmt > 0) && (
          <div className="text-[10px] text-gray-500 text-center font-mono mt-0.5 whitespace-nowrap" title={isSameState ? `CGST: ₹${row.cgstAmt.toFixed(2)} | SGST: ₹${row.sgstAmt.toFixed(2)}` : `IGST: ₹${row.igstAmt.toFixed(2)}`}>
            +₹{(isSameState ? row.cgstAmt + row.sgstAmt : row.igstAmt).toFixed(1)}
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
          onClick={onRemove}
          className="text-gray-400 hover:text-red-600 p-1.5 rounded transition-colors hover:bg-red-50"
          title="Remove row"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
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
