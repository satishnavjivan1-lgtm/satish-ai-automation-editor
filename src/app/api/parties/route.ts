import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}
    if (type === 'CUSTOMER' || type === 'VENDOR') {
      where.type = type
    }

    const parties = await prisma.party.findMany({
      where,
      include: {
        invoices: { select: { totalAmt: true, status: true } },
        payments: { select: { amount: true, type: true } },
      },
      orderBy: { name: 'asc' },
    })

    const result = parties.map((p) => {
      const isCustomer = p.type === 'CUSTOMER'
      const ob = parseFloat(String(p.openingBalance || 0)) || 0

      let balance = 0
      if (isCustomer) {
        // Customer: DR is positive (receivable), CR is negative (advance)
        balance = p.openingBalanceType === 'DR' ? ob : -ob
        for (const inv of p.invoices || []) {
          balance += parseFloat(String(inv.totalAmt || 0)) || 0
        }
        for (const pay of p.payments || []) {
          if (pay.type === 'RECEIVED') {
            balance -= parseFloat(String(pay.amount || 0)) || 0
          } else {
            balance += parseFloat(String(pay.amount || 0)) || 0
          }
        }
      } else {
        // Vendor: CR is positive (payable), DR is negative (advance paid)
        balance = p.openingBalanceType === 'CR' ? ob : -ob
        for (const inv of p.invoices || []) {
          balance += parseFloat(String(inv.totalAmt || 0)) || 0
        }
        for (const pay of p.payments || []) {
          if (pay.type === 'PAID') {
            balance -= parseFloat(String(pay.amount || 0)) || 0
          } else {
            balance += parseFloat(String(pay.amount || 0)) || 0
          }
        }
      }

      let balanceType: 'CR' | 'DR' = 'CR'
      if (isCustomer) {
        balanceType = balance >= 0 ? 'DR' : 'CR'
      } else {
        balanceType = balance >= 0 ? 'CR' : 'DR'
      }

      const currentBalance = isNaN(balance) ? 0 : Math.round(Math.abs(balance) * 100) / 100

      return {
        ...p,
        currentBalance,
        balanceType,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Parties GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      type,
      name,
      gstin,
      pan,
      phone,
      email,
      address,
      city,
      state,
      stateCode,
      creditLimit,
      openingBalance,
      openingBalanceType,
    } = body

    if (!type || !name || !phone || !address || !city) {
      return NextResponse.json(
        { error: 'Missing required fields: type, name, phone, address, city' },
        { status: 400 }
      )
    }

    const party = await prisma.party.create({
      data: {
        type,
        name,
        gstin: gstin || null,
        pan: pan || null,
        phone,
        email: email || null,
        address,
        city,
        state: state || 'Gujarat',
        stateCode: stateCode || '24',
        creditLimit: creditLimit || 0,
        openingBalance: openingBalance || 0,
        openingBalanceType: openingBalanceType || 'CR',
      },
    })

    return NextResponse.json(party, { status: 201 })
  } catch (error) {
    console.error('Parties POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
