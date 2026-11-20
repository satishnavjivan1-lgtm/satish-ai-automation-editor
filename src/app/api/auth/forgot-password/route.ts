import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendOtpEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'કૃપા કરીને ઈમેલ એડ્રેસ દાખલ કરો' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists with this email
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    let userName = user ? user.name : '';

    if (!user) {
      // Check if superadmin exists
      const superAdmin = await prisma.superAdmin.findUnique({
        where: { email: cleanEmail },
      });
      if (superAdmin) {
        userName = superAdmin.name;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'આ ઈમેલ સાથે કોઈ એકાઉન્ટ નોંધાયેલ નથી',
          },
          { status: 404 }
        );
      }
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Expiry time: 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save OTP to database
    await prisma.passwordResetOtp.create({
      data: {
        email: cleanEmail,
        otp,
        expiresAt,
        isUsed: false,
      },
    });

    // Send Email
    await sendOtpEmail({
      toEmail: cleanEmail,
      userName: userName || 'User',
      otp,
    });

    return NextResponse.json({
      success: true,
      message: '૬-અંક નો OTP તમારા ઈમેલ પર મોકલી દેવાયો છે',
      // If dev mode without SMTP, provide helpful hint
      devHint:
        !process.env.SMTP_USER || !process.env.SMTP_PASS
          ? `(Dev Hint: તમારો OTP છે: ${otp})`
          : undefined,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'સર્વર એરર આવી છે' },
      { status: 500 }
    );
  }
}
