import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('from') || searchParams.get('dateFrom')
    const dateTo = searchParams.get('to') || searchParams.get('dateTo')
    const category = searchParams.get('category')
    const partyId = searchParams.get('partyId')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (category && category.trim()) where.category = category.trim()
    if (partyId && partyId.trim()) where.partyId = parseInt(partyId)
    if (dateFrom || dateTo) {
      where.expenseDate = {}
      if (dateFrom && dateFrom.trim()) (where.expenseDate as Record<string, Date>).gte = new Date(dateFrom.trim())
      if (dateTo && dateTo.trim()) {
        const toEnd = new Date(dateTo.trim())
        toEnd.setHours(23, 59, 59, 999)
          (where.expenseDate as Record<string, Date>).lte = toEnd
      }
    }

    if (search && search.trim()) {
      const q = search.trim()
      where.OR = [
        { description: { contains: q } },
        { party: { name: { contains: q } } },
      ]
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { party: { select: { name: true } } },
      orderBy: { expenseDate: 'desc' },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Expenses GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, description, amount, expenseDate, partyId, paymentMode, reference, notes } = body

    if (!category || !amount || !expenseDate) {
      return NextResponse.json(
        { error: 'Missing required fields: category, amount, expenseDate' },
        { status: 400 }
      )
    }

    const expense = await prisma.expense.create({
      data: {
        category,
        description: description || null,
        amount: parseFloat(amount),
        expenseDate: new Date(expenseDate),
        paymentMode: paymentMode || 'CASH',
        ...(partyId ? { party: { connect: { id: parseInt(partyId) } } } : {}),
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Expenses POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
