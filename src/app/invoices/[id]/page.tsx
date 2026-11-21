import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageCircle, Edit } from 'lucide-react';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge';
import { PrintInvoice } from '@/components/invoices/PrintInvoice';
import { PrintButton } from '@/components/invoices/PrintButton';
import { WhatsAppShareButton } from '@/components/invoices/WhatsAppShareButton';
import prisma from '@/lib/prisma';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceDetail {
  id: number;
  invoiceNo: string;
  type: string;
  invoiceDate: string;
  dueDate: string | null;
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
  status: string;
  notes: string | null;
  party: {
    id: number;
    name: string;
    address: string;
    city: string;
    state: string;
    stateCode: string;
    gstin: string | null;
    phone: string;
  };
  items: Array<{
    id: number;
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
  }>;
}

interface Company {
  name: string;
  logoUrl?: string;
  address: string;
  city: string;
  state: string;
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

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getInvoice(id: string): Promise<{ invoice: InvoiceDetail; company: Company } | null> {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return null;

  try {
    const [inv, comp] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id: numId },
        include: { party: true, items: true },
      }),
      prisma.company.findFirst(),
    ]);

    if (!inv) return null;

    const company: Company = comp ? {
      name: comp.name,
      logoUrl: comp.logoUrl ?? undefined,
      address: comp.address,
      city: comp.city,
      state: comp.state,
      gstin: comp.gstin,
      phone: comp.phone,
      email: comp.email ?? undefined,
      bankName: comp.bankName ?? undefined,
      branch: comp.branch ?? undefined,
      accountNo: comp.accountNo ?? undefined,
      ifscCode: comp.ifscCode ?? undefined,
      upiId: comp.upiId ?? undefined,
      termsAndConditions: comp.termsAndConditions ?? undefined,
    } : {
      name: 'Navjivan ERP',
      address: 'Jamnagar, Gujarat',
      city: 'Jamnagar',
      state: 'Gujarat',
      gstin: '24AABCN1234N1Z5',
      phone: '',
    };

    return { invoice: inv as unknown as InvoiceDetail, company };
  } catch (error) {
    console.error('Error fetching invoice for detail page:', error);
    return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtMoney(n: number) {
  return '₹ ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function typeLabel(t: string) {
  return t === 'TAX_INVOICE' ? 'Tax Invoice' : t === 'QUOTATION' ? 'Quotation' : 'Delivery Challan';
}
function whatsappUrl(phone: string, invoiceNo: string, total: number) {
  const msg = encodeURIComponent(
    `Dear Customer, your Invoice ${invoiceNo} of amount ₹${total.toFixed(2)} is due. Please arrange payment at the earliest. - Navjivan ERP`
  );
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { id: string };
  searchParams?: { print?: string };
}

export default async function InvoiceDetailPage({ params, searchParams }: PageProps) {
  const data = await getInvoice(params.id);
  if (!data) notFound();

  const { invoice, company } = data;
  const isSameState = invoice.gstType === 'SAME_STATE';

  // Map items to PrintInvoice format
  const printItems = invoice.items.map((item, i) => ({
    srNo: i + 1,
    description: item.description,
    hsnCode: item.hsnCode,
    qtyPcs: Number(item.qtyPcs),
    weightKg: Number(item.weightKg),
    unit: item.unit,
    rate: Number(item.rate),
    discountPct: Number(item.discountPct),
    taxableAmt: Number(item.taxableAmt),
    gstRate: Number(item.gstRate),
    cgstPct: Number(item.cgstPct),
    cgstAmt: Number(item.cgstAmt),
    sgstPct: Number(item.sgstPct),
    sgstAmt: Number(item.sgstAmt),
    igstPct: Number(item.igstPct),
    igstAmt: Number(item.igstAmt),
    totalAmt: Number(item.totalAmt),
  }));

  return (
    <>
      {/* ── Action Bar (hidden on print) ── */}
      <div className="no-print bg-white border-b border-gray-200 px-3.5 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/invoices"
            className="p-1.5 sm:p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-bold text-gray-900 font-mono text-sm sm:text-base">{invoice.invoiceNo}</span>
              <InvoiceStatusBadge status={invoice.status} />
              <span className="text-xs text-gray-500 hidden sm:inline">{typeLabel(invoice.type)}</span>
            </div>
            <div className="text-xs text-gray-500">
              {fmtDate(invoice.invoiceDate)}{invoice.dueDate ? ` · Due: ${fmtDate(invoice.dueDate)}` : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href={`/invoices/${params.id}/edit`}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gray-100 text-gray-700 text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Edit className="h-4 w-4" />
            <span className="hidden xs:inline">Edit</span>
          </Link>

          <WhatsAppShareButton
            invoiceId={invoice.id}
            invoiceNo={invoice.invoiceNo}
            partyName={invoice.party.name}
            partyPhone={invoice.party.phone || ''}
            totalAmt={Number(invoice.totalAmt)}
            invoiceDate={invoice.invoiceDate}
            companyName={company.name}
            variant="button"
          />

          <PrintButton />
        </div>
      </div>

      {/* ── Summary (screen-only) ── */}
      <div className="no-print p-3.5 sm:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <InfoCard label="Party" value={invoice.party.name} />
          <InfoCard label="Total" value={fmtMoney(Number(invoice.totalAmt))} highlight />
          <InfoCard label="GST Type" value={isSameState ? 'CGST + SGST' : 'IGST'} />
          <InfoCard label="Items" value={`${invoice.items.length} line(s)`} />
        </div>

        {/* GST breakdown summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 max-w-sm ml-auto space-y-2 text-sm mb-6">
          <Row label="Subtotal" value={fmtMoney(Number(invoice.subtotal))} />
          {Number(invoice.discountAmt) > 0 && (
            <Row label="Discount" value={`- ${fmtMoney(Number(invoice.discountAmt))}`} />
          )}
          <Row label="Taxable" value={fmtMoney(Number(invoice.taxableAmt))} />
          {isSameState ? (
            <>
              <Row label="CGST" value={fmtMoney(Number(invoice.cgstAmt))} />
              <Row label="SGST" value={fmtMoney(Number(invoice.sgstAmt))} />
            </>
          ) : (
            <Row label="IGST" value={fmtMoney(Number(invoice.igstAmt))} />
          )}
          {Number(invoice.roundOff) !== 0 && (
            <Row label="Round Off" value={(Number(invoice.roundOff) >= 0 ? '+' : '') + fmtMoney(Number(invoice.roundOff))} />
          )}
          <div className="border-t pt-2 flex justify-between font-bold text-blue-700">
            <span>TOTAL</span>
            <span>{fmtMoney(Number(invoice.totalAmt))}</span>
          </div>
          <div className="text-xs text-gray-500 italic">{invoice.amountInWords}</div>
        </div>
      </div>

      {/* ── Print View (always rendered, hidden on screen via print CSS) ── */}
      <PrintInvoice
        invoice={{
          invoiceNo: invoice.invoiceNo,
          type: invoice.type,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate ?? undefined,
          gstType: invoice.gstType,
          subtotal: Number(invoice.subtotal),
          discountAmt: Number(invoice.discountAmt),
          taxableAmt: Number(invoice.taxableAmt),
          cgstAmt: Number(invoice.cgstAmt),
          sgstAmt: Number(invoice.sgstAmt),
          igstAmt: Number(invoice.igstAmt),
          roundOff: Number(invoice.roundOff),
          totalAmt: Number(invoice.totalAmt),
          amountInWords: invoice.amountInWords,
          notes: invoice.notes ?? undefined,
        }}
        company={{
          name: company.name,
          logoUrl: company.logoUrl,
          address: company.address,
          city: company.city,
          state: company.state,
          gstin: company.gstin,
          phone: company.phone,
          email: company.email,
          bankName: company.bankName,
          branch: company.branch,
          accountNo: company.accountNo,
          ifscCode: company.ifscCode,
          upiId: company.upiId,
          termsAndConditions: company.termsAndConditions,
        }}
        party={{
          name: invoice.party.name,
          address: invoice.party.address,
          city: invoice.party.city,
          state: invoice.party.state,
          stateCode: invoice.party.stateCode,
          gstin: invoice.party.gstin ?? undefined,
          phone: invoice.party.phone,
        }}
        items={printItems}
      />
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-1 ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-700">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}


