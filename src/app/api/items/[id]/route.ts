import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        stockLedger: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    })

    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Item GET error:', error)
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
    const item = await prisma.item.update({ where: { id }, data: body })

    return NextResponse.json(item)
  } catch (error: unknown) {
    console.error('Item PATCH error:', error)
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
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

    await prisma.item.delete({ where: { id } })

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error: unknown) {
    console.error('Item DELETE error:', error)
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
