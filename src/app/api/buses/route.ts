import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireCoordinator } from '@/lib/api-auth';

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
      take: 500,
    });

    return NextResponse.json(buses);
  } catch (error) {
    console.error('Failed to fetch buses:', error);
    return NextResponse.json({ error: 'Failed to fetch buses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireCoordinator();
    if (!auth) {
      return NextResponse.json({ error: 'Coordinator access required' }, { status: 401 });
    }

    const body = await request.json();
    const { plateNumber, capacity, driverId, routeId, eventId } = body;

    if (!plateNumber || !capacity) {
      return NextResponse.json(
        { error: 'Plate number and capacity are required' },
        { status: 400 }
      );
    }

    if (capacity < 1 || capacity > 200) {
      return NextResponse.json(
        { error: 'Capacity must be between 1 and 200' },
        { status: 400 }
      );
    }

    // Check for duplicate plate number
    const existing = await db.bus.findFirst({ where: { plateNumber } });
    if (existing) {
      return NextResponse.json(
        { error: 'A bus with this plate number already exists' },
        { status: 409 }
      );
    }

    const bus = await db.bus.create({
      data: {
        plateNumber,
        capacity: parseInt(capacity),
        status: 'available',
        ...(driverId ? { driverId } : {}),
        ...(routeId ? { routeId } : {}),
        ...(eventId ? { eventId } : {}),
      },
      include: {
        route: true,
        driver: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(bus, { status: 201 });
  } catch (error) {
    console.error('Failed to create bus:', error);
    return NextResponse.json({ error: 'Failed to create bus' }, { status: 500 });
  }
}
