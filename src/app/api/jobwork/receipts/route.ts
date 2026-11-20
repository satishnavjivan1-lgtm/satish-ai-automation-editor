import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { challanItemId, receivedQtyPcs, receivedWeightKg, receiptDate, notes } = body

    if (!challanItemId || receivedQtyPcs === undefined || receivedWeightKg === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: challanItemId, receivedQtyPcs, receivedWeightKg' },
        { status: 400 }
      )
    }

    const challanItem = await prisma.jobWorkChallanItem.findUnique({
      where: { id: parseInt(challanItemId) },
      include: { challan: true },
    })

    if (!challanItem) {
      return NextResponse.json({ error: 'Challan item not found' }, { status: 404 })
    }

    const rxQty = parseFloat(receivedQtyPcs)
    const rxWeight = parseFloat(receivedWeightKg)
    const sentWeight = Number(challanItem.sentWeightKg)

    // Calculate burning loss
    const burningLossKg = parseFloat((sentWeight - rxWeight).toFixed(3))
    const burningLossPct =
      sentWeight > 0
        ? parseFloat(((burningLossKg / sentWeight) * 100).toFixed(2))
        : 0

    const result = await prisma.$transaction(async (tx) => {
      // Update challan item with received quantities and burning loss
      const updatedItem = await tx.jobWorkChallanItem.update({
        where: { id: parseInt(challanItemId) },
        data: {
          receivedQtyPcs: Math.round(rxQty),
          receivedWeightKg: rxWeight,
          burningLossKg,
          burningLossPct,
        },
      })

      // Add stock back (JOB_WORK_IN)
      await tx.stockLedger.create({
        data: {
          itemId: challanItem.itemId,
          type: 'JOB_WORK_IN',
          refType: 'JOB_WORK_RECEIPT',
          refId: challanItem.challanId,
          qtyPcs: rxQty,
          weightKg: rxWeight,
          rate: 0,
          notes: `Job Work Receipt - Challan ${challanItem.challan.challanNo || challanItem.challanId}${notes ? ' - ' + notes : ''}`,
          entryDate: receiptDate ? new Date(receiptDate) : new Date(),
        },
      })

      await tx.item.update({
        where: { id: challanItem.itemId },
        data: {
          currentQtyPcs: { increment: Math.round(rxQty) },
          currentWeightKg: { increment: rxWeight },
        },
      })

      // Check if all items in challan are received; update challan status
      const allItems = await tx.jobWorkChallanItem.findMany({
        where: { challanId: challanItem.challanId },
      })

      const allReceived = allItems.every((item) => Number(item.receivedWeightKg) > 0)
      const someReceived = allItems.some((item) => Number(item.receivedWeightKg) > 0)

      let newStatus: 'OPEN' | 'PARTIAL' | 'CLOSED' = 'OPEN'
      if (allReceived) newStatus = 'CLOSED'
      else if (someReceived) newStatus = 'PARTIAL'

      await tx.jobWorkChallan.update({
        where: { id: challanItem.challanId },
        data: { status: newStatus },
      })

      return updatedItem
    })

    return NextResponse.json(
      {
        challanItem: result,
        burningLossKg,
        burningLossPct,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('JobWork Receipt POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
