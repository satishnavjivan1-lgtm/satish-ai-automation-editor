import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const now = new Date()
    const month = searchParams.get('month') || String(now.getMonth() + 1)
    const year = searchParams.get('year') || String(now.getFullYear())

    const m = parseInt(month)
    const y = parseInt(year)
    const dateFrom = new Date(y, m - 1, 1)
    const dateTo = new Date(y, m, 0, 23, 59, 59, 999)

    const invoices = await prisma.invoice.findMany({
      where: {
        invoiceDate: { gte: dateFrom, lte: dateTo },
        type: 'TAX_INVOICE',
        status: { not: 'DRAFT' },
        party: { type: 'CUSTOMER' },
      },
      include: {
        party: { select: { name: true, gstin: true, stateCode: true } },
        items: {
          select: {
            hsnCode: true,
            taxableAmt: true,
            cgstAmt: true,
            sgstAmt: true,
            igstAmt: true,
            gstRate: true,
            qtyPcs: true,
            weightKg: true,
          },
        },
      },
    })

    // B2B: parties with GSTIN
    const b2bMap: Record<string, { partyName: string; gstin: string; invoiceCount: number; taxable: number; cgst: number; sgst: number; igst: number; total: number }> = {}
    const b2cMap: Record<string, { state: string; invoiceCount: number; taxable: number; cgst: number; sgst: number; igst: number; total: number }> = {}

    for (const inv of invoices) {
      if (inv.party.gstin) {
        const k = inv.party.gstin
        if (!b2bMap[k]) {
          b2bMap[k] = {
            partyName: inv.party.name,
            gstin: inv.party.gstin,
            invoiceCount: 0,
            taxable: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            total: 0,
          }
        }
        b2bMap[k].invoiceCount += 1
        b2bMap[k].taxable += Number(inv.taxableAmt)
        b2bMap[k].cgst += Number(inv.cgstAmt)
        b2bMap[k].sgst += Number(inv.sgstAmt)
        b2bMap[k].igst += Number(inv.igstAmt)
        b2bMap[k].total += Number(inv.totalAmt)
      } else {
        const k = inv.customerState || 'Other'
        if (!b2cMap[k]) {
          b2cMap[k] = {
            state: k,
            invoiceCount: 0,
            taxable: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            total: 0,
          }
        }
        b2cMap[k].invoiceCount += 1
        b2cMap[k].taxable += Number(inv.taxableAmt)
        b2cMap[k].cgst += Number(inv.cgstAmt)
        b2cMap[k].sgst += Number(inv.sgstAmt)
        b2cMap[k].igst += Number(inv.igstAmt)
        b2cMap[k].total += Number(inv.totalAmt)
      }
    }

    const b2b = Object.values(b2bMap)
    const b2c = Object.values(b2cMap)

    // HSN Summary
    type HsnRow = {
      hsnCode: string
      description: string
      totalQty: number
      totalWeight: number
      taxableAmt: number
      cgst: number
      sgst: number
      igst: number
      gstRate: number
    }

    const hsnMap: Record<string, HsnRow> = {}
    for (const inv of invoices) {
      for (const item of inv.items) {
        const key = item.hsnCode
        if (!hsnMap[key]) {
          hsnMap[key] = {
            hsnCode: key,
            description: '',
            totalQty: 0,
            totalWeight: 0,
            taxableAmt: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            gstRate: Number(item.gstRate),
          }
        }
        hsnMap[key].totalQty += Number(item.qtyPcs)
        hsnMap[key].totalWeight += Number(item.weightKg)
        hsnMap[key].taxableAmt += Number(item.taxableAmt)
        hsnMap[key].cgst += Number(item.cgstAmt)
        hsnMap[key].sgst += Number(item.sgstAmt)
        hsnMap[key].igst += Number(item.igstAmt)
      }
    }

    const hsnSummary = Object.values(hsnMap).map((row) => ({
      hsnCode: row.hsnCode,
      description: row.description || `HSN ${row.hsnCode}`,
      totalQty: row.totalQty,
      taxable: parseFloat(row.taxableAmt.toFixed(2)),
      taxAmount: parseFloat((row.cgst + row.sgst + row.igst).toFixed(2)),
      taxableAmt: parseFloat(row.taxableAmt.toFixed(2)),
      cgst: parseFloat(row.cgst.toFixed(2)),
      sgst: parseFloat(row.sgst.toFixed(2)),
      igst: parseFloat(row.igst.toFixed(2)),
      total: parseFloat((row.taxableAmt + row.cgst + row.sgst + row.igst).toFixed(2)),
    }))

    return NextResponse.json({
      period: { month: m, year: y },
      b2b,
      b2c,
      hsn: hsnSummary,
      hsnSummary,
      summary: {
        totalInvoices: invoices.length,
        totalTaxable: parseFloat(invoices.reduce((s, i) => s + Number(i.taxableAmt), 0).toFixed(2)),
        totalCgst: parseFloat(invoices.reduce((s, i) => s + Number(i.cgstAmt), 0).toFixed(2)),
        totalSgst: parseFloat(invoices.reduce((s, i) => s + Number(i.sgstAmt), 0).toFixed(2)),
        totalIgst: parseFloat(invoices.reduce((s, i) => s + Number(i.igstAmt), 0).toFixed(2)),
        grandTotal: parseFloat(invoices.reduce((s, i) => s + Number(i.totalAmt), 0).toFixed(2)),
      },
    })
  } catch (error) {
    console.error('GSTR-1 Report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
