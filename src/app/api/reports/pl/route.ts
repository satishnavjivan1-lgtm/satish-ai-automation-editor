import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const now = new Date()
    const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    const defaultFrom = `${yr}-04-01`
    const defaultTo = `${yr + 1}-03-31`

    const dateFrom = new Date(from || defaultFrom)
    const dateTo = new Date(to || defaultTo)
    dateTo.setHours(23, 59, 59, 999)

    // Income: Sales (paid + partial customer invoices in range)
    const salesAgg = await prisma.invoice.aggregate({
      where: {
        invoiceDate: { gte: dateFrom, lte: dateTo },
        status: { in: ['PAID', 'PARTIAL'] },
        party: { type: 'CUSTOMER' },
      },
      _sum: { totalAmt: true },
    })

    // Other income: receipts from non-invoice payments from customers
    const otherIncomeAgg = await prisma.payment.aggregate({
      where: {
        paymentDate: { gte: dateFrom, lte: dateTo },
        type: 'RECEIVED',
        invoiceId: null,
      },
      _sum: { amount: true },
    })

    // Expenses grouped by category
    const expensesByCategory = await prisma.expense.groupBy({
      by: ['category'],
      where: { expenseDate: { gte: dateFrom, lte: dateTo } },
      _sum: { amount: true },
    })

    // Purchase cost (vendor invoices paid in period)
    const purchaseAgg = await prisma.invoice.aggregate({
      where: {
        invoiceDate: { gte: dateFrom, lte: dateTo },
        party: { type: 'VENDOR' },
        status: { in: ['PAID', 'PARTIAL'] },
      },
      _sum: { totalAmt: true },
    })

    const totalSales = Number(salesAgg._sum.totalAmt || 0)
    const otherIncome = Number(otherIncomeAgg._sum.amount || 0)
    const totalIncome = totalSales + otherIncome

    const expensesMap = expensesByCategory.reduce(
      (acc: Record<string, number>, row) => {
        acc[row.category] = Number(row._sum.amount || 0)
        return acc
      },
      {}
    )
    const totalPurchases = Number(purchaseAgg._sum.totalAmt || 0)
    const totalExpenses = Object.values(expensesMap).reduce((s, v) => s + v, 0)

    const grossProfit = totalSales - totalPurchases
    const netProfit = totalIncome - totalPurchases - totalExpenses

    return NextResponse.json({
      salesRevenue: totalSales,
      salesReturns: 0,
      grossRevenue: totalSales,
      rawMaterialPurchases: totalPurchases,
      jobWorkExpenses: 0,
      cogs: totalPurchases,
      grossProfit,
      operatingExpenses: Object.entries(expensesMap).map(([category, amount]) => ({ category, amount })),
      totalOpEx: totalExpenses,
      netProfit,
      period: { from, to },
      income: {
        sales: totalSales,
        otherIncome,
        total: totalIncome,
      },
      costOfGoods: totalPurchases,
      expenses: {
        byCategory: expensesMap,
        total: totalExpenses,
      },
    })
  } catch (error) {
    console.error('P&L Report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
