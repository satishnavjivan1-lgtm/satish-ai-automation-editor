import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Total sales this month (PAID + PARTIAL invoices for CUSTOMERS)
    const salesAgg = await prisma.invoice.aggregate({
      where: {
        invoiceDate: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ['PAID', 'PARTIAL'] },
        party: { type: 'CUSTOMER' },
      },
      _sum: { totalAmt: true },
    })

    // Total receivables: unpaid + partial customer invoices
    const receivablesAgg = await prisma.invoice.aggregate({
      where: {
        status: { in: ['UNPAID', 'PARTIAL'] },
        party: { type: 'CUSTOMER' },
      },
      _sum: { totalAmt: true },
    })

    // Total payables: sum of pending vendor payments
    // Vendor invoices with UNPAID or PARTIAL status
    const payablesAgg = await prisma.invoice.aggregate({
      where: {
        status: { in: ['UNPAID', 'PARTIAL'] },
        party: { type: 'VENDOR' },
      },
      _sum: { totalAmt: true },
    })

    // Net profit: sales revenue minus expenses in the same month
    const expensesAgg = await prisma.expense.aggregate({
      where: { expenseDate: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    })

    const totalSalesMonth = Number(salesAgg._sum.totalAmt || 0)
    const totalExpenses = Number(expensesAgg._sum.amount || 0)
    const netProfit = totalSalesMonth - totalExpenses

    // Recent 10 invoices
    const recentInvoices = await prisma.invoice.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { party: { select: { name: true } } },
    })

    // Overdue invoices: UNPAID/PARTIAL past dueDate
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['UNPAID', 'PARTIAL'] },
        dueDate: { lt: now },
      },
      include: { party: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    })

    return NextResponse.json({
      totalSales: totalSalesMonth,
      totalSalesMonth,
      totalReceivables: Number(receivablesAgg._sum.totalAmt || 0),
      totalPayables: Number(payablesAgg._sum.totalAmt || 0),
      netProfit,
      recentTransactions: recentInvoices.map((inv) => ({
        id: inv.id,
        date: inv.invoiceDate,
        invoiceNo: inv.invoiceNo,
        party: inv.party?.name || 'Unknown',
        amount: Number(inv.totalAmt || 0),
        status: inv.status,
      })),
      recentInvoices,
      overduePayments: overdueInvoices.map((inv) => {
        const diffDays = Math.max(
          0,
          Math.floor((now.getTime() - new Date(inv.dueDate || now).getTime()) / (1000 * 60 * 60 * 24))
        )
        return {
          id: inv.id,
          party: inv.party?.name || 'Unknown',
          phone: '',
          invoiceNo: inv.invoiceNo,
          daysOverdue: diffDays,
          amount: Number(inv.totalAmt || 0),
        }
      }),
      overdueInvoices,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
