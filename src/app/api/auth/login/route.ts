import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin, username, password } = body;

    let authenticatedUser: {
      id: number;
      name: string;
      username: string;
      email: string;
      role: string;
      companyId?: number;
    } | null = null;

    // 1. PIN-based Login
    if (pin && typeof pin === 'string') {
      const trimmedPin = pin.trim();

      try {
        // Check in User table
        const dbUser = await prisma.user.findFirst({
          where: { pin: trimmedPin, isActive: true },
          include: { company: true },
        });

        if (dbUser) {
          authenticatedUser = {
            id: dbUser.id,
            name: dbUser.name,
            username: dbUser.username,
            email: dbUser.email,
            role: dbUser.role,
            companyId: dbUser.companyId,
          };

          // Update last login timestamp
          prisma.user
            .update({
              where: { id: dbUser.id },
              data: { lastLoginAt: new Date() },
            })
            .catch(() => {});
        } else {
          // Check in SuperAdmin table
          const superAdmin = await prisma.superAdmin.findFirst({
            where: { pin: trimmedPin, isActive: true },
          });

          if (superAdmin) {
            authenticatedUser = {
              id: superAdmin.id,
              name: superAdmin.name,
              username: superAdmin.email,
              email: superAdmin.email,
              role: 'SUPER_ADMIN',
            };
          }
        }
      } catch (dbErr) {
        console.warn('Database query error in PIN login, checking fallback:', dbErr);
      }

      // Safe fallback to default PIN if not authenticated yet
      if (!authenticatedUser && trimmedPin === (process.env.APP_PIN || '1234')) {
        authenticatedUser = {
          id: 1,
          name: 'Admin',
          username: 'admin',
          email: 'admin@navjivan.com',
          role: 'ADMIN',
        };
      }
    }

    // 2. Username & Password Login
    else if (username && password) {
      const u = username.trim();
      const p = password.trim();

      try {
        // Check in User table
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [{ username: u }, { email: u }],
            isActive: true,
          },
        });

        if (dbUser && dbUser.passwordHash === p) {
          authenticatedUser = {
            id: dbUser.id,
            name: dbUser.name,
            username: dbUser.username,
            email: dbUser.email,
            role: dbUser.role,
            companyId: dbUser.companyId,
          };

          prisma.user
            .update({
              where: { id: dbUser.id },
              data: { lastLoginAt: new Date() },
            })
            .catch(() => {});
        } else {
          // Check in SuperAdmin table
          const superAdmin = await prisma.superAdmin.findFirst({
            where: { email: u, isActive: true },
          });

          if (superAdmin && superAdmin.passwordHash === p) {
            authenticatedUser = {
              id: superAdmin.id,
              name: superAdmin.name,
              username: superAdmin.email,
              email: superAdmin.email,
              role: 'SUPER_ADMIN',
            };
          }
        }
      } catch (dbErr) {
        console.warn('Database query error in user/pass login, checking fallback:', dbErr);
      }

      // Safe fallback to admin credentials
      if (
        !authenticatedUser &&
        u === (process.env.ADMIN_USERNAME || 'admin') &&
        p === (process.env.ADMIN_PASSWORD || 'admin')
      ) {
        authenticatedUser = {
          id: 1,
          name: 'Admin',
          username: 'admin',
          email: 'admin@navjivan.com',
          role: 'ADMIN',
        };
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        {
          success: false,
          error: pin
            ? 'ખોટો PIN દાખલ કર્યો છે (Invalid PIN)'
            : 'ખોટો Username અથવા Password દાખલ કર્યો છે',
        },
        { status: 401 }
      );
    }

    // Generate Session Token with encoded user data
    const sessionData = {
      ...authenticatedUser,
      loginAt: Date.now(),
      sessionId: Math.random().toString(36).substring(2, 10),
    };
    const token = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    const response = NextResponse.json({
      success: true,
      user: authenticatedUser,
      message: 'Login successful',
    });

    response.cookies.set({
      name: 'erp_auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Fatal Login error:', error);
    return NextResponse.json(
      { success: false, error: 'સર્વર એરર આવી છે' },
      { status: 500 }
    );
  }
}
