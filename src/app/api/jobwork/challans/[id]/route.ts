import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const challan = await prisma.jobWorkChallan.findUnique({
      where: { id },
      include: {
        party: true,
        items: { include: { item: { select: { id: true, name: true, code: true, hsnCode: true } } } },
      },
    })

    if (!challan) return NextResponse.json({ error: 'Challan not found' }, { status: 404 })

    const totalSentWeightKg = challan.items.reduce((sum, item) => sum + Number(item.sentWeightKg || 0), 0)
    const totalReceivedWeightKg = challan.items.reduce((sum, item) => sum + Number(item.receivedWeightKg || 0), 0)

    return NextResponse.json({
      ...challan,
      party: challan.party,
      vendor: challan.party,
      totalSentWeightKg,
      totalReceivedWeightKg,
    })
  } catch (error) {
    console.error('JobWork Challan GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
