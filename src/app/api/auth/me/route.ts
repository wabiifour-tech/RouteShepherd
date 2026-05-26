import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Check for user email in query params (for session validation)
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ authenticated: false });
    }

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

    if (!user) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        phone: user.phone,
        provider: user.provider,
        driverPhone: user.driverPhone,
        assignedBuses: user.assignedBuses,
      },
    });
  } catch (error) {
    console.error('Session check failed:', error);
    return NextResponse.json({ authenticated: false });
  }
}
