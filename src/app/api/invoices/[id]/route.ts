import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        party: true,
        items: { include: { item: { select: { name: true, code: true } } } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    })

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Invoice GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const body = await request.json()
    const { status, notes, dueDate } = body

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (dueDate) updateData.dueDate = new Date(dueDate)

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(invoice)
  } catch (error: unknown) {
    console.error('Invoice PATCH error:', error)
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const body = await request.json()
    const { status, notes, dueDate, invoiceNo, partyId, items: lineItems } = body

    // If just basic updates like status/notes/dueDate
    if (!lineItems && (status || notes !== undefined || dueDate)) {
      const updateData: Record<string, unknown> = {}
      if (status) updateData.status = status
      if (notes !== undefined) updateData.notes = notes
      if (dueDate) updateData.dueDate = new Date(dueDate)

      const invoice = await prisma.invoice.update({
        where: { id },
        data: updateData,
      })
      return NextResponse.json(invoice)
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Invoice PUT error:', error)
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

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      // Restore stock if TAX_INVOICE
      if (invoice.type === 'TAX_INVOICE') {
        for (const item of invoice.items) {
          await tx.item.update({
            where: { id: item.itemId },
            data: {
              currentQtyPcs: { increment: Math.round(Number(item.qtyPcs)) },
              currentWeightKg: { increment: Number(item.weightKg) },
            },
          })
        }
      }

      // Delete related stock ledger entries
      await tx.stockLedger.deleteMany({
        where: { refType: 'INVOICE', refId: id },
      })

      // Delete payments connected to invoice
      await tx.payment.deleteMany({
        where: { invoiceId: id },
      })

      // Delete invoice items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id },
      })

      // Delete invoice
      await tx.invoice.delete({ where: { id } })
    })

    return NextResponse.json({ success: true, message: 'Invoice deleted successfully' })
  } catch (error: unknown) {
    console.error('Invoice DELETE error:', error)
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
