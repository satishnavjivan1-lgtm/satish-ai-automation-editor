import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { party: { select: { id: true, name: true } } },
    })

    if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Expense GET error:', error)
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
    const { category, amount, expenseDate, description, paymentMode, partyId } = body

    const data: any = {}
    if (category) data.category = category
    if (amount !== undefined) data.amount = parseFloat(amount)
    if (expenseDate) data.expenseDate = new Date(expenseDate)
    if (description !== undefined) data.description = description
    if (paymentMode) data.paymentMode = paymentMode
    if (partyId !== undefined) {
      if (partyId) {
        data.party = { connect: { id: parseInt(partyId) } }
      } else {
        data.party = { disconnect: true }
      }
    }

    const updated = await prisma.expense.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Expense PATCH error:', error)
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

    await prisma.expense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Expense DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
