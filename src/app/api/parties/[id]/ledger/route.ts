import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const party = await prisma.party.findUnique({ where: { id } })
    if (!party) return NextResponse.json({ error: 'Party not found' }, { status: 404 })

    // Get all invoices for party (debit entries for customer, credit for vendor)
    const invoices = await prisma.invoice.findMany({
      where: { partyId: id, status: { not: 'DRAFT' } },
      orderBy: { invoiceDate: 'asc' },
      select: { id: true, invoiceNo: true, invoiceDate: true, totalAmt: true, type: true },
    })

    // Get all payments for party
    const payments = await prisma.payment.findMany({
      where: { partyId: id },
      orderBy: { paymentDate: 'asc' },
      select: { id: true, paymentDate: true, amount: true, type: true, reference: true, notes: true, invoiceId: true },
    })

    // Build merged, sorted transactions
    type TxEntry = {
      date: Date
      narration: string
      invoiceNo: string | null
      debit: number
      credit: number
    }

    const transactions: TxEntry[] = []

    for (const inv of invoices) {
      const isCustomer = party.type === 'CUSTOMER'
      transactions.push({
        date: inv.invoiceDate,
        narration: `Invoice ${inv.invoiceNo}`,
        invoiceNo: inv.invoiceNo,
        debit: isCustomer ? Number(inv.totalAmt) : 0,
        credit: isCustomer ? 0 : Number(inv.totalAmt),
      })
    }

    for (const pmt of payments) {
      const isCustomer = party.type === 'CUSTOMER'
      transactions.push({
        date: pmt.paymentDate,
        narration: pmt.notes || `Payment - ${pmt.type}${pmt.reference ? ' Ref: ' + pmt.reference : ''}`,
        invoiceNo: null,
        debit: isCustomer ? 0 : Number(pmt.amount),
        credit: isCustomer ? Number(pmt.amount) : 0,
      })
    }

    // Sort by date
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime())

    // Opening balance direction
    const openingBalance = Number(party.openingBalance)
    const obType = party.openingBalanceType

    // For customer: DR opening means they owe us (debit opening)
    let runningBalance = obType === 'DR' ? openingBalance : -openingBalance

    const ledgerRows = transactions.map((tx) => {
      runningBalance += tx.debit - tx.credit
      return {
        date: tx.date,
        narration: tx.narration,
        invoiceNo: tx.invoiceNo,
        debit: tx.debit,
        credit: tx.credit,
        balance: Math.abs(runningBalance),
        balanceType: runningBalance >= 0 ? 'DR' : 'CR',
      }
    })

    const closingBalance = Math.abs(runningBalance)
    const closingType = runningBalance >= 0 ? 'DR' : 'CR'

    return NextResponse.json({
      party,
      openingBalance,
      openingBalanceType: obType,
      transactions: ledgerRows,
      closingBalance,
      closingBalanceType: closingType,
    })
  } catch (error) {
    console.error('Ledger GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
