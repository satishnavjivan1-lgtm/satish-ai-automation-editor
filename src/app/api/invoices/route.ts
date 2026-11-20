import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { calculateGST, calculateLineItem } from '@/lib/gst'
import { amountToWords } from '@/lib/amountInWords'
import { generateInvoiceNo } from '@/lib/invoiceNo'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const partyId = searchParams.get('partyId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const type = searchParams.get('type')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (partyId) where.partyId = parseInt(partyId)
    if (type) where.type = type
    if (dateFrom || dateTo) {
      where.invoiceDate = {}
      if (dateFrom) (where.invoiceDate as Record<string, Date>).gte = new Date(dateFrom)
      if (dateTo) {
        const toEnd = new Date(dateTo)
        toEnd.setHours(23, 59, 59, 999);
        (where.invoiceDate as Record<string, Date>).lte = toEnd
      }
    }

    if (search && search.trim()) {
      const q = search.trim()
      where.OR = [
        { invoiceNo: { contains: q } },
        { party: { name: { contains: q } } },
      ]
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { party: { select: { name: true, type: true, phone: true } }, items: true },
      orderBy: { invoiceDate: 'desc' },
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Invoices GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      type = 'TAX_INVOICE',
      partyId,
      invoiceDate,
      dueDate,
      sellerState = '24',
      items: lineItems,
      notes,
      status = 'UNPAID',
    } = body

    if (!partyId || !invoiceDate || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: partyId, invoiceDate, items[]' },
        { status: 400 }
      )
    }

    const party = await prisma.party.findUnique({ where: { id: parseInt(partyId) } })
    if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 })

    const customerState = party.stateCode

    // Process each line item
    let grossSubtotal = 0
    let totalDiscount = 0
    let totalTaxable = 0
    let totalCgst = 0
    let totalSgst = 0
    let totalIgst = 0

    type ProcessedItem = {
      itemId: number
      description: string
      hsnCode: string
      qtyPcs: number
      weightKg: number
      unit: string
      priceMode: string
      rate: number
      discountPct: number
      taxableAmt: number
      gstRate: number
      cgstPct: number
      sgstPct: number
      igstPct: number
      cgstAmt: number
      sgstAmt: number
      igstAmt: number
      totalAmt: number
    }

    const processedItems: ProcessedItem[] = []

    for (const li of lineItems) {
      const { itemId, qtyPcs = 0, weightKg = 0, rate, discountPct = 0, unit, priceMode } = li

      const dbItem = await prisma.item.findUnique({ where: { id: parseInt(itemId) } })
      if (!dbItem) return NextResponse.json({ error: `Item ${itemId} not found` }, { status: 404 })

      const itemUnit = unit || dbItem.unit
      const itemPriceMode = priceMode || dbItem.priceMode
      const qty = parseFloat(qtyPcs) || 0
      const wt = parseFloat(weightKg) || 0
      const itemRate = parseFloat(rate) || 0
      const disc = parseFloat(discountPct) || 0
      const gstRate = Number(dbItem.gstRate) || 18

      const calc = calculateLineItem({
        qty,
        weightKg: wt,
        unit: itemUnit,
        priceMode: itemPriceMode,
        rate: itemRate,
        discountPct: disc,
        gstRate,
        sellerState,
        customerState,
      })

      grossSubtotal += calc.baseAmt
      totalDiscount += calc.discountAmt
      totalTaxable += calc.taxableAmt
      totalCgst += calc.cgstAmt
      totalSgst += calc.sgstAmt
      totalIgst += calc.igstAmt

      processedItems.push({
        itemId: parseInt(itemId),
        description: li.description || dbItem.name,
        hsnCode: dbItem.hsnCode,
        qtyPcs: qty,
        weightKg: wt,
        unit: itemUnit,
        priceMode: itemPriceMode,
        rate: itemRate,
        discountPct: disc,
        taxableAmt: calc.taxableAmt,
        gstRate,
        cgstPct: calc.cgstPct,
        sgstPct: calc.sgstPct,
        igstPct: calc.igstPct,
        cgstAmt: calc.cgstAmt,
        sgstAmt: calc.sgstAmt,
        igstAmt: calc.igstAmt,
        totalAmt: calc.totalAmt,
      })
    }

    const rawTotal = totalTaxable + totalCgst + totalSgst + totalIgst
    const roundOff = parseFloat((Math.round(rawTotal) - rawTotal).toFixed(2))
    const totalAmt = parseFloat((rawTotal + roundOff).toFixed(2))
    const gstType = sellerState === customerState ? 'SAME_STATE' : 'DIFF_STATE'
    const invoiceNo = (body.invoiceNo && String(body.invoiceNo).trim()) ? String(body.invoiceNo).trim() : await generateInvoiceNo()
    const words = amountToWords(totalAmt)

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoiceNo,
          type,
          partyId: parseInt(partyId),
          invoiceDate: new Date(invoiceDate),
          dueDate: dueDate ? new Date(dueDate) : null,
          sellerState,
          customerState,
          gstType,
          subtotal: parseFloat(grossSubtotal.toFixed(2)),
          discountAmt: parseFloat(totalDiscount.toFixed(2)),
          taxableAmt: parseFloat(totalTaxable.toFixed(2)),
          cgstAmt: parseFloat(totalCgst.toFixed(2)),
          sgstAmt: parseFloat(totalSgst.toFixed(2)),
          igstAmt: parseFloat(totalIgst.toFixed(2)),
          roundOff,
          totalAmt,
          amountInWords: words,
          status,
          notes: notes || null,
          items: {
            create: processedItems,
          },
        },
        include: { items: true, party: true },
      })

      // For TAX_INVOICE: deduct stock
      if (type === 'TAX_INVOICE') {
        for (const pi of processedItems) {
          await tx.stockLedger.create({
            data: {
              itemId: pi.itemId,
              type: 'OUT',
              refType: 'INVOICE',
              refId: created.id,
              qtyPcs: pi.qtyPcs,
              weightKg: pi.weightKg,
              rate: pi.rate,
              notes: `Invoice ${invoiceNo}`,
              entryDate: new Date(invoiceDate),
            },
          })

          await tx.item.update({
            where: { id: pi.itemId },
            data: {
              currentQtyPcs: { decrement: Math.round(pi.qtyPcs) },
              currentWeightKg: { decrement: pi.weightKg },
            },
          })
        }
      }

      return created
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Invoice POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
