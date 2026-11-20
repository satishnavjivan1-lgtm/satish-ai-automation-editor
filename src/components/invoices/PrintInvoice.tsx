'use client';

import React from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Company {
  name: string;
  logoUrl?: string;
  address: string;
  city: string;
  state: string;
  stateCode?: string;
  gstin: string;
  phone: string;
  email?: string;
  bankName?: string;
  accountNo?: string;
  ifscCode?: string;
  branch?: string;
  upiId?: string;
  termsAndConditions?: string;
}

interface Party {
  name: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  gstin?: string;
  phone?: string;
}

interface InvoiceItemRow {
  srNo: number;
  description: string;
  hsnCode: string;
  qtyPcs: number;
  weightKg: number;
  unit: string;
  rate: number;
  discountPct: number;
  taxableAmt: number;
  gstRate: number;
  cgstPct: number;
  cgstAmt: number;
  sgstPct: number;
  sgstAmt: number;
  igstPct: number;
  igstAmt: number;
  totalAmt: number;
}

interface GSTBreakdownRow {
  rate: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface PrintInvoiceProps {
  invoice: {
    invoiceNo: string;
    type: string;
    invoiceDate: string;
    dueDate?: string;
    gstType: 'SAME_STATE' | 'DIFF_STATE';
    subtotal: number;
    discountAmt: number;
    taxableAmt: number;
    cgstAmt: number;
    sgstAmt: number;
    igstAmt: number;
    roundOff: number;
    totalAmt: number;
    amountInWords: string;
    notes?: string;
  };
  company: Company;
  party: Party;
  items: InvoiceItemRow[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function invoiceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    TAX_INVOICE: 'TAX INVOICE',
    QUOTATION: 'QUOTATION',
    DELIVERY_CHALLAN: 'DELIVERY CHALLAN',
  };
  return map[type] ?? type;
}

function buildGSTBreakdown(items: InvoiceItemRow[]): GSTBreakdownRow[] {
  const map = new Map<number, GSTBreakdownRow>();
  for (const item of items) {
    const r = item.gstRate;
    if (!map.has(r)) map.set(r, { rate: r, taxable: 0, cgst: 0, sgst: 0, igst: 0 });
    const row = map.get(r)!;
    row.taxable += item.taxableAmt;
    row.cgst += item.cgstAmt;
    row.sgst += item.sgstAmt;
    row.igst += item.igstAmt;
  }
  return Array.from(map.values()).sort((a, b) => a.rate - b.rate);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PrintInvoice({ invoice, company, party, items }: PrintInvoiceProps) {
  const isSameState = invoice.gstType === 'SAME_STATE';
  const breakdown = buildGSTBreakdown(items);
  const totalQty = items.reduce((s, it) => s + (Number(it.qtyPcs) || 0), 0);
  const totalWeight = items.reduce((s, it) => s + (Number(it.weightKg) || 0), 0);
  const totalItemAmt = items.reduce((s, it) => s + (Number(it.totalAmt) || 0), 0);

  return (
    <>
      {/* ── Strict 1-Page Print Styles ── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
            color: #000000 !important;
          }
          .no-print, aside, header, nav {
            display: none !important;
          }
          .ml-64 {
            margin-left: 0 !important;
          }
          .invoice-box {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            box-shadow: none !important;
            border: 2px solid #000000 !important;
            border-radius: 6px !important;
            padding: 8px 12px !important;
            margin: 0 auto !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ── Outer Invoice Container (Matches Live Bill Preview Sample) ── */}
      <div
        className="invoice-box"
        style={{
          width: '100%',
          maxWidth: '195mm',
          margin: '12px auto',
          padding: '14px 18px',
          border: '2px solid #000',
          borderRadius: '8px',
          backgroundColor: '#fff',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '8.5pt',
          color: '#000',
          boxSizing: 'border-box',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* ── Header: Logo on Left + Company Center ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: company.logoUrl ? 'space-between' : 'center',
            borderBottom: '2px solid #000',
            paddingBottom: '6px',
            marginBottom: '6px',
            gap: '8px',
          }}
        >
          {/* Logo on Left (Exact match to red-boxed spot in user sample) */}
          {company.logoUrl ? (
            <div style={{ width: '75px', height: '65px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={company.logoUrl}
                alt="Logo"
                style={{ maxWidth: '75px', maxHeight: '65px', objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div style={{ width: '75px', height: '65px', flexShrink: 0 }} />
          )}

          {/* Company Details (Centered) */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h1 style={{ fontSize: '15pt', fontWeight: 'bold', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {company.name}
            </h1>
            <p style={{ fontSize: '8pt', margin: '1px 0', color: '#222' }}>
              {company.address}, {company.city}, {company.state}
            </p>
            <p style={{ fontSize: '8pt', margin: '1px 0', color: '#222' }}>
              Ph: {company.phone}{company.email ? ` | Email: ${company.email}` : ''}
            </p>
            <p style={{ fontSize: '8pt', fontWeight: 'bold', margin: '2px 0 0 0' }}>
              GSTIN: <span style={{ fontFamily: 'monospace' }}>{company.gstin}</span> | State Code: {company.stateCode || '24'}
            </p>
          </div>

          {/* Right Spacer to ensure company name stays centered */}
          <div style={{ width: '75px', height: '65px', flexShrink: 0 }} />
        </div>

        {/* ── Subheading: TAX INVOICE Box ── */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '10.5pt',
            fontWeight: 'bold',
            letterSpacing: '1.5px',
            border: '1px solid #000',
            backgroundColor: '#f3f4f6',
            padding: '2px 0',
            marginBottom: '6px',
            textTransform: 'uppercase',
          }}
        >
          {invoiceTypeLabel(invoice.type)}
        </div>

        {/* ── 2-Column Details: Invoice Details (Left) + Buyer Bill To (Right) ── */}
        <div
          style={{
            display: 'flex',
            border: '1px solid #000',
            marginBottom: '6px',
            fontSize: '8pt',
          }}
        >
          {/* Left: Invoice Details */}
          <div style={{ flex: 1, padding: '5px 8px', borderRight: '1px solid #000' }}>
            <p style={{ fontWeight: 'bold', color: '#4b5563', marginBottom: '3px', textTransform: 'uppercase', fontSize: '7.5pt' }}>
              Invoice Details
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
              <tbody>
                <tr>
                  <td style={{ width: '40%', padding: '1px 0' }}>Invoice No:</td>
                  <td style={{ fontWeight: 'bold', padding: '1px 0' }}>{invoice.invoiceNo}</td>
                </tr>
                <tr>
                  <td style={{ padding: '1px 0' }}>Date:</td>
                  <td style={{ padding: '1px 0' }}>{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</td>
                </tr>
                {invoice.dueDate && (
                  <tr>
                    <td style={{ padding: '1px 0' }}>Due Date:</td>
                    <td style={{ padding: '1px 0' }}>{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ padding: '1px 0' }}>Place of Supply:</td>
                  <td style={{ padding: '1px 0' }}>{party.state} (Code: {party.stateCode})</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right: Buyer (Bill To) */}
          <div style={{ flex: 1, padding: '5px 8px' }}>
            <p style={{ fontWeight: 'bold', color: '#4b5563', marginBottom: '3px', textTransform: 'uppercase', fontSize: '7.5pt' }}>
              Buyer (Bill To)
            </p>
            <p style={{ fontWeight: 'bold', fontSize: '9pt', margin: '0 0 2px 0' }}>{party.name}</p>
            <p style={{ margin: '1px 0', color: '#222' }}>{party.address}, {party.city}</p>
            <p style={{ margin: '1px 0', color: '#222' }}>{party.state} - Code: {party.stateCode}</p>
            {party.gstin && (
              <p style={{ margin: '1px 0', fontWeight: 'bold' }}>
                GSTIN: <span style={{ fontFamily: 'monospace' }}>{party.gstin}</span>
              </p>
            )}
            {party.phone && <p style={{ margin: '1px 0' }}>Ph: {party.phone}</p>}
          </div>
        </div>

        {/* ── Line Items Table ── */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '8pt',
            border: '1px solid #000',
            marginBottom: '6px',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ border: '1px solid #000', padding: '3px 4px', width: '24px', textAlign: 'center' }}>Sr#</th>
              <th style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'left' }}>Description</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', width: '50px', textAlign: 'center' }}>HSN</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', width: '40px', textAlign: 'right' }}>Qty</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', width: '48px', textAlign: 'right' }}>Wt(Kg)</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', width: '35px', textAlign: 'center' }}>Unit</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', width: '52px', textAlign: 'right' }}>Rate</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', width: '60px', textAlign: 'right' }}>Taxable</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', width: '45px', textAlign: 'center' }}>GST%</th>
              <th style={{ border: '1px solid #000', padding: '3px 6px', width: '68px', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.srNo}>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>{item.srNo}</td>
                <td style={{ border: '1px solid #000', padding: '2px 6px', fontWeight: '500' }}>{item.description}</td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center', fontFamily: 'monospace', fontSize: '7.5pt' }}>
                  {item.hsnCode}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>{item.qtyPcs}</td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>
                  {item.weightKg > 0 ? item.weightKg.toFixed(3) : '-'}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>{item.unit}</td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>{fmt(item.rate)}</td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>{fmt(item.taxableAmt)}</td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center', fontSize: '7.5pt' }}>
                  {item.gstRate}%
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 6px', textAlign: 'right', fontWeight: 'bold' }}>
                  {fmt(item.totalAmt)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f9fafb', fontWeight: 'bold' }}>
              <td colSpan={3} style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>Total:</td>
              <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>{totalQty}</td>
              <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>
                {totalWeight > 0 ? totalWeight.toFixed(3) : '-'}
              </td>
              <td style={{ border: '1px solid #000', padding: '2px 4px' }}></td>
              <td style={{ border: '1px solid #000', padding: '2px 4px' }}></td>
              <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>{fmt(invoice.taxableAmt)}</td>
              <td style={{ border: '1px solid #000', padding: '2px 4px' }}></td>
              <td style={{ border: '1px solid #000', padding: '2px 6px', textAlign: 'right' }}>{fmt(totalItemAmt)}</td>
            </tr>
          </tfoot>
        </table>

        {/* ── Weight & Totals Summary ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', gap: '8px' }}>
          {/* Left: Weight Summary (Jamnagar Brass Accounting Standard) */}
          <div style={{ flex: 1, fontSize: '7.5pt' }}>
            {totalWeight > 0 && (
              <div style={{ display: 'inline-block', border: '1px solid #ccc', borderRadius: '4px', padding: '3px 8px', backgroundColor: '#f9fafb' }}>
                <div>NET WT KGS: <strong>{totalWeight.toFixed(3)}</strong></div>
                <div>GROSS WT KGS: <strong>{totalWeight.toFixed(3)}</strong></div>
              </div>
            )}
          </div>

          {/* Right: Totals Box */}
          <div style={{ width: '240px', border: '1px solid #000', padding: '4px 8px', fontSize: '8pt', backgroundColor: '#fff', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
              <span>Subtotal:</span>
              <span>₹ {fmt(invoice.subtotal)}</span>
            </div>
            {invoice.discountAmt > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: '#c00' }}>
                <span>Discount:</span>
                <span>- ₹ {fmt(invoice.discountAmt)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', borderTop: '1px dashed #ccc', marginTop: '1px' }}>
              <span>Taxable Amount:</span>
              <span style={{ fontWeight: '600' }}>₹ {fmt(invoice.taxableAmt)}</span>
            </div>

            {/* GST breakdown */}
            {isSameState ? (
              <>
                {breakdown.map((row) => (
                  <React.Fragment key={`gst-${row.rate}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                      <span>CGST @ {row.rate / 2}%:</span>
                      <span>₹ {fmt(row.cgst)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                      <span>SGST @ {row.rate / 2}%:</span>
                      <span>₹ {fmt(row.sgst)}</span>
                    </div>
                  </React.Fragment>
                ))}
              </>
            ) : (
              <>
                {breakdown.map((row) => (
                  <div key={`igst-${row.rate}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                    <span>IGST @ {row.rate}%:</span>
                    <span>₹ {fmt(row.igst)}</span>
                  </div>
                ))}
              </>
            )}

            {invoice.roundOff !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                <span>Round Off:</span>
                <span>{invoice.roundOff > 0 ? '+' : ''}₹ {fmt(invoice.roundOff)}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '3px 4px',
                fontSize: '9.5pt',
                fontWeight: 'bold',
                borderTop: '2px solid #000',
                backgroundColor: '#f3f4f6',
                marginTop: '2px',
              }}
            >
              <span>GRAND TOTAL:</span>
              <span>₹ {fmt(invoice.totalAmt)}</span>
            </div>
          </div>
        </div>

        {/* ── Amount in Words ── */}
        <div
          style={{
            border: '1px solid #000',
            padding: '3px 6px',
            fontSize: '8pt',
            marginBottom: '6px',
            backgroundColor: '#fafafa',
          }}
        >
          <strong>Amount in Words: </strong>
          <span style={{ fontStyle: 'italic' }}>{invoice.amountInWords}</span>
        </div>

        {/* ── Bottom Section: Bank Details & Terms (Left) + Signatory (Right) ── */}
        <div
          style={{
            display: 'flex',
            border: '1px solid #000',
            fontSize: '7.5pt',
          }}
        >
          {/* Left: Bank details + Terms */}
          <div style={{ flex: 1.8, padding: '5px 8px', borderRight: '1px solid #000' }}>
            <p style={{ fontWeight: 'bold', color: '#111', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
              Bank Details:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1px 8px' }}>
              {company.bankName && <div>Bank: <strong>{company.bankName}</strong></div>}
              {company.branch && <div>Branch: {company.branch}</div>}
              {company.accountNo && (
                <div>A/c No: <strong style={{ fontFamily: 'monospace' }}>{company.accountNo}</strong></div>
              )}
              {company.ifscCode && (
                <div>IFSC: <strong style={{ fontFamily: 'monospace' }}>{company.ifscCode}</strong></div>
              )}
              {company.upiId && (
                <div style={{ gridColumn: 'span 2' }}>
                  UPI ID: <strong style={{ fontFamily: 'monospace', color: '#4f46e5' }}>{company.upiId}</strong>
                </div>
              )}
            </div>

            {invoice.notes && (
              <div style={{ marginTop: '3px', paddingTop: '2px', borderTop: '1px dashed #ddd' }}>
                <strong>Notes: </strong>{invoice.notes}
              </div>
            )}

            <div style={{ marginTop: '3px', paddingTop: '3px', borderTop: '1px solid #ccc' }}>
              <p style={{ fontWeight: 'bold', color: '#111', margin: '0 0 1px 0', textTransform: 'uppercase' }}>
                Terms &amp; Conditions:
              </p>
              <div style={{ whiteSpace: 'pre-line', color: '#333', lineHeight: '1.25' }}>
                {company.termsAndConditions ||
                  '(1) Subject to Jamnagar Jurisdiction.\n(2) Goods once sold will not be taken back.\n(3) Interest @ 18% p.a. will be charged on all bills remaining pending after due date.'}
              </div>
            </div>
          </div>

          {/* Right: Signature Box */}
          <div
            style={{
              flex: 1.2,
              padding: '6px 8px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textAlign: 'center',
            }}
          >
            <p style={{ fontWeight: 'bold', fontSize: '8pt', margin: 0 }}>
              For, {company.name}
            </p>
            <div style={{ height: '36px' }} />
            <div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '2px', fontWeight: 'bold', fontSize: '7.5pt' }}>
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <p style={{ textAlign: 'center', fontSize: '7pt', color: '#666', margin: '4px 0 0 0' }}>
          This is a computer-generated invoice. No signature required.
        </p>
      </div>
    </>
  );
}
