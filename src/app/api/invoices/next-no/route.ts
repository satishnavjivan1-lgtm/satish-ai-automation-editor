import { NextResponse } from 'next/server'
import { generateInvoiceNo } from '@/lib/invoiceNo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const invoiceNo = await generateInvoiceNo()
    return NextResponse.json({ invoiceNo })
  } catch (error) {
    console.error('next-no error:', error)
    return NextResponse.json({ error: 'Failed to generate invoice number' }, { status: 500 })
  }
}
