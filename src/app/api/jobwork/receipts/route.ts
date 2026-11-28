import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Support batch receipts: { challanId, items: [{ challanItemId, receivedQtyPcs, receivedWeightKg }] }
    if (Array.isArray(body.items)) {
      const { challanId, items: receiptItems, receiptDate, notes } = body
      if (!receiptItems || receiptItems.length === 0) {
        return NextResponse.json({ error: 'No items provided for receipt' }, { status: 400 })
      }

      const results = await prisma.$transaction(async (tx) => {
        const itemIds = receiptItems
          .map((i: any) => parseInt(String(i.challanItemId || i.itemId)))
          .filter((id: number) => !isNaN(id))

        // Pre-fetch all challan items in a single query to eliminate round-trip latency
        const existingItems = await tx.jobWorkChallanItem.findMany({
          where: { id: { in: itemIds } },
          include: { challan: true },
        })
        const itemsMap = new Map(existingItems.map(it => [it.id, it]))

        const processed = []

        for (const item of receiptItems) {
          const challanItemId = parseInt(String(item.challanItemId || item.itemId))
          const rxQty = parseFloat(String(item.receivedQtyPcs || 0))
          const rxWeight = parseFloat(String(item.receivedWeightKg || 0))

          if (isNaN(challanItemId) || (rxQty <= 0 && rxWeight <= 0)) {
            continue
          }

          const challanItem = itemsMap.get(challanItemId)
          if (!challanItem) continue

          const sentWeight = Number(challanItem.sentWeightKg)
          const burningLossKg = parseFloat((sentWeight - rxWeight).toFixed(3))
          const burningLossPct =
            sentWeight > 0 ? parseFloat(((burningLossKg / sentWeight) * 100).toFixed(2)) : 0

          const updatedItem = await tx.jobWorkChallanItem.update({
            where: { id: challanItemId },
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

          processed.push(updatedItem)
        }

        // Update overall challan status if challanId is known
        const targetChallanId = challanId ? parseInt(String(challanId)) : null
        if (targetChallanId) {
          const allItems = await tx.jobWorkChallanItem.findMany({
            where: { challanId: targetChallanId },
          })

          const allReceived = allItems.every((item) => Number(item.receivedWeightKg) > 0)
          const someReceived = allItems.some((item) => Number(item.receivedWeightKg) > 0)

          let newStatus: 'OPEN' | 'PARTIAL' | 'CLOSED' = 'OPEN'
          if (allReceived) newStatus = 'CLOSED'
          else if (someReceived) newStatus = 'PARTIAL'

          await tx.jobWorkChallan.update({
            where: { id: targetChallanId },
            data: { status: newStatus },
          })
        }

        return processed
      }, {
        maxWait: 15000,
        timeout: 30000,
      })

      return NextResponse.json({ success: true, count: results.length }, { status: 201 })
    }

    // Support single item receipt
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

    const burningLossKg = parseFloat((sentWeight - rxWeight).toFixed(3))
    const burningLossPct =
      sentWeight > 0 ? parseFloat(((burningLossKg / sentWeight) * 100).toFixed(2)) : 0

    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.jobWorkChallanItem.update({
        where: { id: parseInt(challanItemId) },
        data: {
          receivedQtyPcs: Math.round(rxQty),
          receivedWeightKg: rxWeight,
          burningLossKg,
          burningLossPct,
        },
      })

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
    }, {
      maxWait: 15000,
      timeout: 30000,
    })

    return NextResponse.json(
      {
        challanItem: result,
        burningLossKg,
        burningLossPct,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('JobWork Receipt POST error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
