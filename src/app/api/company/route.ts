import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    let company = await prisma.company.findFirst()
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'Navjivan ERP System',
          address: 'Plot No. 12, GIDC Industrial Estate, Shantiniketan',
          city: 'Jamnagar',
          state: 'Gujarat',
          stateCode: '24',
          gstin: '24AABCN1234N1Z5',
          pan: 'AABCN1234N',
          phone: '9825000001',
          email: 'info@navjivanerp.com',
          bankName: 'State Bank of India',
          accountNo: '31234567890',
          ifscCode: 'SBIN0001234',
          branch: 'GIDC Jamnagar Branch',
          upiId: 'navjivan@sbi',
          invoicePrefix: 'NVJ',
          termsAndConditions: '(1) Subject to Jamnagar Jurisdiction.\n(2) Goods once sold will not be taken back.\n(3) Interest @ 18% p.a. will be charged on all bills remaining pending after due date.\n(4) Our risk & responsibility ceases once goods are dispatched.',
        },
      })
    }
    return NextResponse.json(company)
  } catch (error) {
    console.error('GET /api/company error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      logoUrl,
      address,
      city,
      state,
      stateCode = '24',
      gstin,
      pan,
      phone,
      email,
      bankName,
      accountNo,
      ifscCode,
      branch,
      upiId,
      invoicePrefix = 'NVJ',
      termsAndConditions,
    } = body

    if (!name || !gstin || !address) {
      return NextResponse.json({ error: 'Company Name, GSTIN, and Address are required' }, { status: 400 })
    }

    const payload = {
      name,
      logoUrl: logoUrl !== undefined ? logoUrl : null,
      address,
      city: city || 'Jamnagar',
      state: state || 'Gujarat',
      stateCode: stateCode || '24',
      gstin,
      pan: pan || (gstin.length >= 12 ? gstin.substring(2, 12) : ''),
      phone: phone || '',
      email: email || null,
      bankName: bankName || null,
      accountNo: accountNo || null,
      ifscCode: ifscCode || null,
      branch: branch || null,
      upiId: upiId || null,
      invoicePrefix: invoicePrefix || 'NVJ',
      termsAndConditions: termsAndConditions || null,
    }

    const company = await prisma.company.findFirst()

    if (!company) {
      const created = await prisma.company.create({ data: payload })
      return NextResponse.json(created, { status: 201 })
    }

    const updated = await prisma.company.update({
      where: { id: company.id },
      data: payload,
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/company error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
