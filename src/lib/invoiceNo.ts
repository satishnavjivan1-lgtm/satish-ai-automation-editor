import prisma from '@/lib/prisma'

function getFinancialYear(): string {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const year = now.getFullYear()

  // Financial year starts April (month 4)
  if (month >= 4) {
    // e.g. April 2024 → FY 2024-25 → "2425"
    return String(year).slice(2) + String(year + 1).slice(2)
  } else {
    // e.g. Jan 2025 → FY 2024-25 → "2425"
    return String(year - 1).slice(2) + String(year).slice(2)
  }
}

export async function generateInvoiceNo(): Promise<string> {
  const company = await prisma.company.findFirst({ select: { invoicePrefix: true } })
  const pfx = (company?.invoicePrefix || 'NVJ').trim()
  const fy = getFinancialYear()
  const prefix = `${pfx}/${fy}/`

  // Find last invoice number for this FY
  const last = await prisma.invoice.findFirst({
    where: { invoiceNo: { startsWith: prefix } },
    orderBy: { invoiceNo: 'desc' },
    select: { invoiceNo: true },
  })

  let nextSeq = 1
  if (last?.invoiceNo) {
    const parts = last.invoiceNo.split('/')
    const lastSeq = parseInt(parts[2] || '0', 10)
    nextSeq = lastSeq + 1
  }

  return `${prefix}${String(nextSeq).padStart(3, '0')}`
}
