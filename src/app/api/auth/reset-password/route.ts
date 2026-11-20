import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email, otp, newPassword, newPin } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'ઈમેલ, OTP અને નવો પાસવર્ડ જરૂરી છે' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    const cleanPassword = newPassword.trim();

    if (cleanPassword.length < 4) {
      return NextResponse.json(
        { success: false, error: 'પાસવર્ડ ઓછામાં ઓછો ૪ અક્ષરનો હોવો જોઈએ' },
        { status: 400 }
      );
    }

    // Find the latest active OTP for this email
    const validOtpRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        email: cleanEmail,
        otp: cleanOtp,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!validOtpRecord) {
      return NextResponse.json(
        {
          success: false,
          error: 'અમાન્ય અથવા એક્સપાયર થયેલો OTP છે (Invalid or Expired OTP)',
        },
        { status: 400 }
      );
    }

    // Mark OTP as used
    await prisma.passwordResetOtp.update({
      where: { id: validOtpRecord.id },
      data: { isUsed: true },
    });

    // Update user password and optional pin
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (user) {
      const updateData: any = { passwordHash: cleanPassword };
      if (newPin && newPin.trim().length === 4) {
        updateData.pin = newPin.trim();
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    } else {
      // Check superAdmin
      const superAdmin = await prisma.superAdmin.findUnique({
        where: { email: cleanEmail },
      });
      if (superAdmin) {
        const updateData: any = { passwordHash: cleanPassword };
        if (newPin && newPin.trim().length === 4) {
          updateData.pin = newPin.trim();
        }
        await prisma.superAdmin.update({
          where: { id: superAdmin.id },
          data: updateData,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'પાસવર્ડ સફળતાપૂર્વક બદલાઈ ગયો છે! હવે તમે લૉગિન કરી શકો છો.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'પાસવર્ડ બદલવામાં ભૂલ આવી' },
      { status: 500 }
    );
  }
}
