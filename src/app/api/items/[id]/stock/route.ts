import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const item = await prisma.item.findUnique({ where: { id } })
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    const body = await request.json()
    const { type, qtyPcs, weightKg, narration, date } = body

    if (!type || (!qtyPcs && !weightKg)) {
      return NextResponse.json(
        { error: 'Missing required fields: type, qtyPcs or weightKg' },
        { status: 400 }
      )
    }

    const adjQty = parseInt(qtyPcs || 0)
    const adjWeight = parseFloat(weightKg || 0)

    // Create StockLedger entry
    const stockEntry = await prisma.stockLedger.create({
      data: {
        itemId: id,
        date: date ? new Date(date) : new Date(),
        type: type, // STOCK_IN, STOCK_OUT, ADJUSTMENT
        qtyPcs: adjQty,
        weightKg: adjWeight,
        narration: narration || `Manual ${type} adjustment`,
      },
    })

    // Update item stock
    let newQtyPcs = Number(item.currentQtyPcs)
    let newWeightKg = Number(item.currentWeightKg)

    if (type === 'STOCK_IN' || type === 'JOB_WORK_IN') {
      newQtyPcs += adjQty
      newWeightKg += adjWeight
    } else if (type === 'STOCK_OUT' || type === 'JOB_WORK_OUT') {
      newQtyPcs -= adjQty
      newWeightKg -= adjWeight
    } else if (type === 'ADJUSTMENT') {
      // Direct set via qtyPcs/weightKg
      newQtyPcs = adjQty
      newWeightKg = adjWeight
    }

    const updatedItem = await prisma.item.update({
      where: { id },
      data: {
        currentQtyPcs: newQtyPcs,
        currentWeightKg: newWeightKg,
      },
    })

    return NextResponse.json({ stockEntry, updatedItem }, { status: 201 })
  } catch (error) {
    console.error('Stock adjustment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
