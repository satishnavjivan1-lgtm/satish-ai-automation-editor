import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partyId = searchParams.get('partyId')
    const type = searchParams.get('type')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: Record<string, unknown> = {}
    if (partyId) where.partyId = parseInt(partyId)
    if (type) where.type = type
    if (dateFrom || dateTo) {
      where.paymentDate = {}
      if (dateFrom) (where.paymentDate as Record<string, Date>).gte = new Date(dateFrom)
      if (dateTo) (where.paymentDate as Record<string, Date>).lte = new Date(dateTo)
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        party: { select: { name: true } },
        invoice: { select: { invoiceNo: true } },
      },
      orderBy: { paymentDate: 'desc' },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Payments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, partyId, invoiceId, amount, paymentDate, mode, reference, notes } = body

    if (!type || !partyId || !amount || !paymentDate || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields: type, partyId, amount, paymentDate, mode' },
        { status: 400 }
      )
    }

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          type,
          partyId: parseInt(partyId),
          invoiceId: invoiceId ? parseInt(invoiceId) : null,
          amount: parseFloat(amount),
          paymentDate: new Date(paymentDate),
          mode,
          reference: reference || null,
          notes: notes || null,
        },
      })

      // Update invoice status if invoiceId is provided
      if (invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: parseInt(invoiceId) },
          include: { payments: true },
        })

        if (invoice) {
          const totalPaid = invoice.payments.reduce(
            (sum, p) => sum + Number(p.amount),
            0
          ) + parseFloat(amount)

          const totalAmt = Number(invoice.totalAmt)
          let newStatus: any

          if (totalPaid >= totalAmt) {
            newStatus = 'PAID'
          } else if (totalPaid > 0) {
            newStatus = 'PARTIAL'
          } else {
            newStatus = 'UNPAID'
          }

          await tx.invoice.update({
            where: { id: parseInt(invoiceId) },
            data: { status: newStatus },
          })
        }
      }

      return created
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Payments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
