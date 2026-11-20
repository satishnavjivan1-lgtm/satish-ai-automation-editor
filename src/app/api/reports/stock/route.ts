import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')
    const itemId = searchParams.get('itemId')

    const stockWhere: Record<string, unknown> = {}
    if (dateFrom || dateTo) {
      stockWhere.date = {}
      if (dateFrom) (stockWhere.date as Record<string, Date>).gte = new Date(dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999);
        (stockWhere.date as Record<string, Date>).lte = end
      }
    }
    if (itemId) stockWhere.itemId = parseInt(itemId)

    const items = await prisma.item.findMany({
      where: itemId ? { id: parseInt(itemId) } : {},
      select: {
        id: true,
        name: true,
        code: true,
        hsnCode: true,
        unit: true,
        currentQtyPcs: true,
        currentWeightKg: true,
        stockLedger: {
          where: stockWhere,
          select: { type: true, qtyPcs: true, weightKg: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    const IN_TYPES = ['IN', 'JOB_WORK_IN', 'STOCK_IN']
    const OUT_TYPES = ['OUT', 'JOB_WORK_OUT', 'STOCK_OUT', 'INVOICE_OUT']

    const result = items.map((item) => {
      let inQty = 0
      let inWeight = 0
      let outQty = 0
      let outWeight = 0

      for (const entry of item.stockLedger) {
        if (IN_TYPES.includes(entry.type)) {
          inQty += Number(entry.qtyPcs)
          inWeight += Number(entry.weightKg)
        } else if (OUT_TYPES.includes(entry.type)) {
          outQty += Number(entry.qtyPcs)
          outWeight += Number(entry.weightKg)
        }
      }

      const closingQty = Number(item.currentQtyPcs)
      const closingWeight = Number(item.currentWeightKg)
      const openingQty = closingQty - inQty + outQty
      const openingWeight = parseFloat((closingWeight - inWeight + outWeight).toFixed(3))

      return {
        id: item.id,
        itemName: item.name,
        name: item.name,
        itemCode: item.code,
        code: item.code,
        hsnCode: item.hsnCode,
        category: 'Finished Good',
        unit: item.unit,
        openingQty: parseFloat(openingQty.toFixed(3)),
        openingWtKg: parseFloat(openingWeight.toFixed(3)),
        openingWeight: parseFloat(openingWeight.toFixed(3)),
        inQty: parseFloat(inQty.toFixed(3)),
        inWtKg: parseFloat(inWeight.toFixed(3)),
        inWeight: parseFloat(inWeight.toFixed(3)),
        outQty: parseFloat(outQty.toFixed(3)),
        outWtKg: parseFloat(outWeight.toFixed(3)),
        outWeight: parseFloat(outWeight.toFixed(3)),
        closingQty,
        closingWtKg: parseFloat(closingWeight.toFixed(3)),
        closingWeight: parseFloat(closingWeight.toFixed(3)),
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Stock Report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
