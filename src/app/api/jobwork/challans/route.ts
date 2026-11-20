import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partyId = searchParams.get('partyId')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: Record<string, unknown> = {}
    if (partyId) where.partyId = parseInt(partyId)
    if (status) where.status = status
    if (dateFrom || dateTo) {
      where.challanDate = {}
      if (dateFrom) (where.challanDate as Record<string, Date>).gte = new Date(dateFrom)
      if (dateTo) (where.challanDate as Record<string, Date>).lte = new Date(dateTo)
    }

    const challans = await prisma.jobWorkChallan.findMany({
      where,
      include: {
        party: { select: { name: true } },
        items: { include: { item: { select: { name: true, code: true } } } },
      },
      orderBy: { challanDate: 'desc' },
    })

    return NextResponse.json(challans)
  } catch (error) {
    console.error('JobWork Challans GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { partyId, challanDate, challanNo, dueDate, notes, items: challanItems } = body

    if (!partyId || !challanDate || !challanItems || !Array.isArray(challanItems) || challanItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: partyId, challanDate, items[]' },
        { status: 400 }
      )
    }

    const challan = await prisma.$transaction(async (tx) => {
      const challanNumber = challanNo || `JWC/${Date.now()}`
      const created = await tx.jobWorkChallan.create({
        data: {
          challanNo: challanNumber,
          partyId: parseInt(partyId),
          challanDate: new Date(challanDate),
          expectedReturnDate: dueDate ? new Date(dueDate) : null,
          notes: notes || null,
          status: 'OPEN',
          items: {
            create: challanItems.map((ci: {
              itemId: number | string
              description?: string
              sentQtyPcs?: number
              sentWeightKg?: number
              processType?: string
            }) => ({
              itemId: parseInt(String(ci.itemId)),
              description: ci.description || '',
              sentQtyPcs: Math.round(parseFloat(String(ci.sentQtyPcs || 0))),
              sentWeightKg: parseFloat(String(ci.sentWeightKg || 0)),
              processType: (ci.processType as any) || 'CASTING',
            })),
          },
        },
        include: { items: true },
      })

      // Deduct stock for each item (JOB_WORK_OUT)
      for (const ci of challanItems) {
        const itemId = parseInt(String(ci.itemId))
        const qtyPcs = Math.round(parseFloat(String(ci.sentQtyPcs || 0)))
        const weightKg = parseFloat(String(ci.sentWeightKg || 0))

        await tx.stockLedger.create({
          data: {
            itemId,
            type: 'JOB_WORK_OUT',
            refType: 'JOB_WORK',
            refId: created.id,
            qtyPcs,
            weightKg,
            rate: 0,
            notes: `Job Work Challan ${challanNumber}`,
            entryDate: new Date(challanDate),
          },
        })

        await tx.item.update({
          where: { id: itemId },
          data: {
            currentQtyPcs: { decrement: qtyPcs },
            currentWeightKg: { decrement: weightKg },
          },
        })
      }

      return created
    })

    return NextResponse.json(challan, { status: 201 })
  } catch (error) {
    console.error('JobWork Challans POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
