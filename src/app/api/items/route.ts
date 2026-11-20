import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const categoryId = searchParams.get('categoryId')
    const lowStock = searchParams.get('lowStock') === 'true'

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { hsnCode: { contains: search } },
      ]
    }
    if (categoryId) where.categoryId = parseInt(categoryId)
    if (lowStock) {
      where.currentQtyPcs = { lte: prisma.item.fields?.minStockQty }
    }

    const items = await prisma.item.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(
      items.map((item) => ({
        ...item,
        currentQtyPcs: Number(item.currentQtyPcs),
        currentWeightKg: Number(item.currentWeightKg),
        purchaseRate: Number(item.purchaseRate),
        saleRate: Number(item.saleRate),
        gstRate: Number(item.gstRate),
      }))
    )
  } catch (error) {
    console.error('Items GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name, code, hsnCode, categoryId, unit, priceMode,
      purchaseRate, saleRate, gstRate, grossWeightKg, minStockQty,
    } = body

    if (!name || !code || !hsnCode || !categoryId || !purchaseRate || !saleRate) {
      return NextResponse.json(
        { error: 'Missing required fields: name, code, hsnCode, categoryId, purchaseRate, saleRate' },
        { status: 400 }
      )
    }

    const item = await prisma.item.create({
      data: {
        name, code, hsnCode,
        categoryId: parseInt(categoryId),
        unit: unit || 'PCS',
        priceMode: priceMode || 'PER_PIECE',
        purchaseRate,
        saleRate,
        gstRate: gstRate || 18,
        grossWeightKg: grossWeightKg || null,
        minStockQty: minStockQty || 0,
      },
      include: { category: { select: { name: true } } },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error: unknown) {
    console.error('Items POST error:', error)
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Item code already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
