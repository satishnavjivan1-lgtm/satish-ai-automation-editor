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
        items: { include: { item: { select: { name: true, code: true, hsnCode: true } } } },
      },
    })

    if (!challan) return NextResponse.json({ error: 'Challan not found' }, { status: 404 })

    return NextResponse.json(challan)
  } catch (error) {
    console.error('JobWork Challan GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
