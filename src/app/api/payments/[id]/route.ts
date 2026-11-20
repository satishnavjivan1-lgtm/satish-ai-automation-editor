import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        party: { select: { id: true, name: true, type: true } },
        invoice: { select: { id: true, invoiceNo: true, totalAmt: true } },
      },
    })

    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Payment GET error:', error)
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

    const payment = await prisma.payment.findUnique({ where: { id } })
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id } })

      // If linked to an invoice, recalculate invoice status
      if (payment.invoiceId) {
        const remainingPayments = await tx.payment.findMany({
          where: { invoiceId: payment.invoiceId },
        })
        const totalPaid = remainingPayments.reduce((s, p) => s + Number(p.amount), 0)
        const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId } })
        if (invoice) {
          const invTotal = Number(invoice.totalAmt)
          let newStatus = invoice.status
          if (totalPaid === 0) newStatus = 'UNPAID'
          else if (totalPaid >= invTotal) newStatus = 'PAID'
          else newStatus = 'PARTIAL'

          await tx.invoice.update({
            where: { id: payment.invoiceId },
            data: { status: newStatus as any },
          })
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
