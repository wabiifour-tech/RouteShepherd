import { NextResponse } from 'next/server';
import { z } from 'zod/v4';

const driverLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, pin } = driverLoginSchema.parse(body);

    // Use NextAuth Credentials provider for driver login
    // The actual auth logic is in src/lib/auth.ts (driver provider)
    // This route now delegates to NextAuth
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const nextAuthRes = await fetch(`${baseUrl}/api/auth/callback/driver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email,
        pin,
        csrfToken: 'placeholder', // NextAuth internal call
      }).toString(),
    });

    // Since we can't easily call NextAuth internally from a route handler,
    // we'll validate directly here and let the frontend call signIn()
    // This endpoint validates credentials and the frontend establishes the session

    // Import auth validation directly
    const { db } = await import('@/lib/db');
    const bcrypt = (await import('bcryptjs')).default;

    const user = await db.user.findUnique({
      where: { email },
      include: {
        assignedBuses: {
          include: {
            route: {
              include: {
                fromPoint: true,
                toPoint: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.role !== 'driver') {
      return NextResponse.json(
        { error: 'No driver account found with this email. Please contact your coordinator.' },
        { status: 401 }
      );
    }

    if (!user.pinHash) {
      return NextResponse.json(
        { error: 'No PIN set for this account. Please contact your coordinator to set up your PIN.' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(pin, user.pinHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid PIN. Please try again.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      provider: user.provider,
      driverPhone: user.driverPhone,
      assignedBuses: user.assignedBuses,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Driver login failed:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
