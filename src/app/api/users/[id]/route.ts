import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET single user
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      include: { company: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'યુઝર મળ્યો નથી' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        companyId: user.companyId,
        companyName: user.company.name,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        pin: user.pin,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to get user:', error);
    return NextResponse.json(
      { success: false, error: 'યુઝર મેળવવામાં ભૂલ આવી' },
      { status: 500 }
    );
  }
}

// PUT: Update user (including backend direct password and pin reset!)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const { name, username, email, phone, role, isActive, password, pin } = body;

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'યુઝર મળ્યો નથી' },
        { status: 404 }
      );
    }

    // Check username collision if changed
    if (username && username.trim() !== existing.username) {
      const collision = await prisma.user.findUnique({
        where: { username: username.trim() },
      });
      if (collision) {
        return NextResponse.json(
          { success: false, error: 'આ યુઝરનેમ પહેલેથી કોઈ બીજા પાસે છે' },
          { status: 400 }
        );
      }
    }

    // Check email collision if changed
    if (email && email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const collision = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (collision) {
        return NextResponse.json(
          { success: false, error: 'આ ઈમેલ પહેલેથી કોઈ બીજા પાસે છે' },
          { status: 400 }
        );
      }
    }

    // Build update payload
    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (username) updateData.username = username.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (pin) updateData.pin = pin.trim();
    if (password && password.trim()) {
      // Backend Direct Password Override!
      updateData.passwordHash = password.trim();
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'યુઝર સફળતાપૂર્વક અપડેટ થઈ ગયો',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        pin: updatedUser.pin,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { success: false, error: 'યુઝર અપડેટ કરવામાં ભૂલ આવી' },
      { status: 500 }
    );
  }
}

// DELETE user
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    // Prevent deleting the main admin user if only 1 exists
    const totalUsers = await prisma.user.count();
    if (totalUsers <= 1) {
      return NextResponse.json(
        { success: false, error: 'સિસ્ટમમાં ઓછામાં ઓછો એક એડમિન યુઝર હોવો જરૂરી છે' },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'યુઝર સફળતાપૂર્વક ડિલીટ થઈ ગયો',
    });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json(
      { success: false, error: 'યુઝર ડિલીટ કરવામાં ભૂલ આવી' },
      { status: 500 }
    );
  }
}
