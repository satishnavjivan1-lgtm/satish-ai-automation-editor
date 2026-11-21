import Link from 'next/link';
import { FileText, Plus, Printer, MessageCircle, Eye, Edit } from 'lucide-react';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge';
import { DeleteInvoiceButton } from '@/components/invoices/DeleteInvoiceButton';
import { WhatsAppShareButton } from '@/components/invoices/WhatsAppShareButton';
import prisma from '@/lib/prisma';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceSummary {
  id: number;
  invoiceNo: string;
  type: string;
  invoiceDate: string;
  dueDate: string | null;
  party: { name: string; phone?: string };
  totalAmt: number;
  status: string;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getInvoices(params: {
  status?: string;
  from?: string;
  to?: string;
  party?: string;
}): Promise<InvoiceSummary[]> {
  try {
    const where: any = {};
    if (params.status && params.status.trim()) {
      where.status = params.status.trim();
    }
    if (params.from || params.to) {
      where.invoiceDate = {};
      if (params.from) where.invoiceDate.gte = new Date(params.from);
      if (params.to) {
        const toEnd = new Date(params.to);
        toEnd.setHours(23, 59, 59, 999);
        where.invoiceDate.lte = toEnd;
      }
    }
    if (params.party && params.party.trim()) {
      const q = params.party.trim();
      where.OR = [
        { invoiceNo: { contains: q } },
        { party: { name: { contains: q } } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { party: { select: { name: true, type: true, phone: true } } },
      orderBy: { invoiceDate: 'desc' },
    });

    return invoices.map((inv) => ({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      type: inv.type,
      invoiceDate: inv.invoiceDate.toISOString(),
      dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
      party: { name: inv.party.name, phone: inv.party.phone || undefined },
      totalAmt: Number(inv.totalAmt),
      status: inv.status,
    }));
  } catch (error) {
    console.error('Failed to get invoices directly:', error);
    return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtMoney(n: number) {
  return '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function typeLabel(t: string) {
  return t === 'TAX_INVOICE' ? 'Tax Invoice' : t === 'QUOTATION' ? 'Quotation' : 'Delivery Challan';
}
function whatsappUrl(phone: string, invoiceNo: string, total: number | string) {
  const num = Number(total) || 0;
  const msg = encodeURIComponent(
    `Dear Customer, your Invoice ${invoiceNo} of amount ₹${num.toFixed(2)} is due. Please arrange payment. - Navjivan ERP`
  );
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams?: { status?: string; from?: string; to?: string; party?: string };
}

export default async function InvoicesPage({ searchParams = {} }: PageProps) {
  let invoices: InvoiceSummary[] = [];
  try {
    invoices = await getInvoices(searchParams);
  } catch {
    invoices = [];
  }

  // Compute stats from returned invoices
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const thisMonthSales = invoices
    .filter(inv => {
      const d = new Date(inv.invoiceDate);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((s, inv) => s + Number(inv.totalAmt), 0);
  const pendingAmount = invoices
    .filter(inv => ['SENT', 'PARTIAL', 'OVERDUE', 'UNPAID'].includes(inv.status))
    .reduce((s, inv) => s + Number(inv.totalAmt), 0);
  const stats = { totalCount: invoices.length, thisMonthSales, pendingAmount };

  return (
    <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-700" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Invoices</h1>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </Link>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <SummaryCard
          label="Total Invoices"
          value={stats.totalCount.toString()}
          sub="all time"
          color="blue"
        />
        <SummaryCard
          label="This Month Sales"
          value={fmtMoney(stats.thisMonthSales)}
          sub="current month"
          color="green"
        />
        <SummaryCard
          label="Pending Amount"
          value={fmtMoney(stats.pendingAmount)}
          sub="unpaid / overdue"
          color="orange"
        />
      </div>

      {/* ── Filter Bar ── */}
      <FilterBar current={searchParams} />

      {/* ── Invoice Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="font-medium">No invoices found</p>
            <p className="text-sm">Create your first invoice to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Invoice #</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Party</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Total</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 w-28">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700">{fmtDate(inv.invoiceDate)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${inv.id}`} className="font-mono font-medium text-blue-700 hover:underline">
                        {inv.invoiceNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{inv.party.name}</td>
                    <td className="px-4 py-3 text-gray-600">{typeLabel(inv.type)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtMoney(inv.totalAmt)}</td>
                    <td className="px-4 py-3 text-center">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/invoices/${inv.id}`}
                          title="View"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/invoices/${inv.id}?print=1`}
                          title="Print"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-green-700 hover:bg-green-50 transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/invoices/${inv.id}/edit`}
                          title="Edit"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <DeleteInvoiceButton id={inv.id} invoiceNo={inv.invoiceNo} />
                        <WhatsAppShareButton
                          invoiceId={inv.id}
                          invoiceNo={inv.invoiceNo}
                          partyName={inv.party.name}
                          partyPhone={inv.party.phone || ''}
                          totalAmt={Number(inv.totalAmt)}
                          invoiceDate={inv.invoiceDate}
                          variant="icon"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: 'blue' | 'green' | 'orange';
}) {
  const colorMap = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
  };
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs opacity-60 mt-0.5">{sub}</p>
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ current }: { current: { status?: string; from?: string; to?: string; party?: string } }) {
  return (
    <form method="GET" className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
      <select
        name="status"
        defaultValue={current.status ?? ''}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <option value="">All Status</option>
        <option value="UNPAID">Unpaid</option>
        <option value="PARTIAL">Partial</option>
        <option value="PAID">Paid</option>
        <option value="DRAFT">Draft</option>
        <option value="SENT">Sent</option>
        <option value="OVERDUE">Overdue</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      <input
        type="date"
        name="from"
        defaultValue={current.from ?? ''}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="From Date"
      />
      <input
        type="date"
        name="to"
        defaultValue={current.to ?? ''}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="To Date"
      />

      <input
        type="text"
        name="party"
        defaultValue={current.party ?? ''}
        placeholder="Search invoice # or party..."
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
      />

      <button
        type="submit"
        className="px-4 py-1.5 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors cursor-pointer"
      >
        Filter
      </button>
      <a
        href="/invoices"
        className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
      >
        Clear
      </a>
    </form>
  );
}
