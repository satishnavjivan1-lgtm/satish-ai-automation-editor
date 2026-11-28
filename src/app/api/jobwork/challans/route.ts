import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partyId = searchParams.get('partyId') || searchParams.get('vendorId')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: Record<string, unknown> = {}
    if (partyId) where.partyId = parseInt(partyId)
    if (status && status !== 'ALL') where.status = status
    if (dateFrom || dateTo) {
      where.challanDate = {}
      if (dateFrom) (where.challanDate as Record<string, Date>).gte = new Date(dateFrom)
      if (dateTo) (where.challanDate as Record<string, Date>).lte = new Date(dateTo)
    }

    const challans = await prisma.jobWorkChallan.findMany({
      where,
      include: {
        party: { select: { id: true, name: true, phone: true, address: true, gstin: true } },
        items: { include: { item: { select: { id: true, name: true, code: true, hsnCode: true } } } },
      },
      orderBy: { challanDate: 'desc' },
    })

    // Map to include both party and vendor properties for UI compatibility
    const mapped = challans.map(c => {
      const totalSentWeightKg = c.items.reduce((sum, item) => sum + Number(item.sentWeightKg || 0), 0)
      const totalReceivedWeightKg = c.items.reduce((sum, item) => sum + Number(item.receivedWeightKg || 0), 0)
      const burningLossKg = c.items.reduce((sum, item) => sum + Number(item.burningLossKg || 0), 0)

      return {
        ...c,
        party: c.party,
        vendor: c.party,
        _count: { items: c.items.length },
        totalSentWeightKg,
        totalReceivedWeightKg,
        burningLossKg,
      }
    })

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('JobWork Challans GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const partyIdRaw = body.partyId ?? body.vendorId
    const challanDate = body.challanDate
    const challanNo = body.challanNo
    const dueDate = body.dueDate || body.expectedReturnDate
    const notes = body.notes
    const challanItems = body.items || body.challanItems
    const rootProcessType = body.processType || 'CASTING'

    if (!partyIdRaw || !challanDate || !challanItems || !Array.isArray(challanItems) || challanItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: Vendor, Challan Date, and at least 1 Item row' },
        { status: 400 }
      )
    }

    const partyId = parseInt(String(partyIdRaw))
    if (isNaN(partyId)) {
      return NextResponse.json({ error: 'Invalid Vendor ID' }, { status: 400 })
    }

    const challan = await prisma.$transaction(async (tx) => {
      // Auto-generate sequential challan number if not provided
      let challanNumber = challanNo
      if (!challanNumber) {
        const count = await tx.jobWorkChallan.count()
        const year = new Date(challanDate).getFullYear()
        challanNumber = `JWC/${year}/${String(count + 1).padStart(3, '0')}`
      }

      const created = await tx.jobWorkChallan.create({
        data: {
          challanNo: challanNumber,
          partyId,
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
              processType: (ci.processType as any) || (rootProcessType as any) || 'CASTING',
            })),
          },
        },
        include: { items: true, party: true },
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

    return NextResponse.json({
      ...challan,
      vendor: challan.party,
    }, { status: 201 })
  } catch (error: any) {
    console.error('JobWork Challans POST error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
