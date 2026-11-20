import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all users
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyIdParam = searchParams.get('companyId');

    const where: any = {};
    if (companyIdParam) {
      where.companyId = parseInt(companyIdParam);
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, city: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Strip passwordHash before sending
    const safeUsers = users.map((u) => ({
      id: u.id,
      companyId: u.companyId,
      companyName: u.company.name,
      name: u.name,
      username: u.username,
      email: u.email,
      phone: u.phone,
      role: u.role,
      pin: u.pin,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ success: true, users: safeUsers });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { success: false, error: 'યુઝર્સ લોડ કરવામાં ભૂલ આવી' },
      { status: 500 }
    );
  }
}

// POST: Create a new user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      username,
      email,
      phone,
      role,
      password,
      pin,
      companyId: reqCompanyId,
    } = body;

    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'નામ, યુઝરનેમ, ઈમેલ અને પાસવર્ડ જરૂરી છે' },
        { status: 400 }
      );
    }

    // Determine companyId (default to first company if not passed)
    let companyId = reqCompanyId;
    if (!companyId) {
      const firstCompany = await prisma.company.findFirst();
      if (!firstCompany) {
        return NextResponse.json(
          { success: false, error: 'પહેલા કંપની પ્રોફાઇલ સેટ કરો' },
          { status: 400 }
        );
      }
      companyId = firstCompany.id;
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: 'આ યુઝરનેમ પહેલેથી ઉપયોગમાં છે' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'આ ઈમેલ પહેલેથી ઉપયોગમાં છે' },
        { status: 400 }
      );
    }

    // Create User
    const newUser = await prisma.user.create({
      data: {
        companyId,
        name: name.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        role: role || 'BILLING_OPERATOR',
        passwordHash: password.trim(),
        pin: pin?.trim() || '1234',
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'નવો યુઝર સફળતાપૂર્વક ઉમેરાઈ ગયો',
      user: {
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        pin: newUser.pin,
      },
    });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json(
      { success: false, error: 'યુઝર બનાવવામાં ભૂલ આવી' },
      { status: 500 }
    );
  }
}
