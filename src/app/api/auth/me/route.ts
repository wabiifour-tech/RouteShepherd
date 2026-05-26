import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ authenticated: false });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ authenticated: false });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
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
        pinChangeRequired: user.pinChangeRequired,
      },
    });
  } catch (error) {
    console.error('Session check failed:', error);
    return NextResponse.json({ authenticated: false });
  }
}
