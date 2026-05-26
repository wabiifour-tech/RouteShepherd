import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(request: Request) {
  // GET is public - anyone can view bus status
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const eventId = searchParams.get('eventId');
    const driverId = searchParams.get('driverId');

    const buses = await db.bus.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(eventId ? { eventId } : {}),
        ...(driverId ? { driverId } : {}),
      },
      include: {
        route: {
          include: {
            fromPoint: true,
            toPoint: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            email: true,
            driverPhone: true,
            role: true,
          },
        },
      },
      orderBy: { plateNumber: 'asc' },
    });

    return NextResponse.json(buses);
  } catch (error) {
    console.error('Failed to fetch buses:', error);
    return NextResponse.json({ error: 'Failed to fetch buses' }, { status: 500 });
  }
}
