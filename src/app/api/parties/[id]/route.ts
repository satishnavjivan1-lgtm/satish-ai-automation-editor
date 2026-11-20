import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const party = await prisma.party.findUnique({
      where: { id },
      include: {
        invoices: { orderBy: { invoiceDate: 'desc' }, take: 20 },
        payments: { orderBy: { paymentDate: 'desc' }, take: 20 },
      },
    })

    if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 })

    return NextResponse.json(party)
  } catch (error) {
    console.error('Party GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PATCH(request, { params })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const body = await request.json()

    const party = await prisma.party.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(party)
  } catch (error: unknown) {
    console.error('Party PATCH error:', error)
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    await prisma.party.delete({ where: { id } })

    return NextResponse.json({ message: 'Party deleted successfully' })
  } catch (error: unknown) {
    console.error('Party DELETE error:', error)
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
