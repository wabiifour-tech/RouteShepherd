import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';

const dispatchSchema = z.object({
  busId: z.string().min(1),
  routeId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { busId, routeId } = dispatchSchema.parse(body);

    // Check bus exists and is available
    const bus = await db.bus.findUnique({ where: { id: busId } });
    if (!bus) {
      return NextResponse.json({ error: 'Bus not found' }, { status: 404 });
    }
    if (bus.status !== 'available') {
      return NextResponse.json(
        { error: `Bus is not available (current status: ${bus.status})` },
        { status: 400 }
      );
    }

    // Check route exists
    const route = await db.route.findUnique({ where: { id: routeId } });
    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    // Dispatch: assign bus to route and set status to loading
    const updatedBus = await db.bus.update({
      where: { id: busId },
      data: {
        routeId,
        status: 'loading',
        currentLoad: 0,
        lastUpdated: new Date(),
      },
      include: {
        route: {
          include: {
            fromPoint: true,
            toPoint: true,
          },
        },
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        title: 'Bus Dispatched',
        message: `Bus ${bus.plateNumber} has been dispatched to route ${route.name}. Driver: ${bus.driverName || 'N/A'}`,
        type: 'success',
        target: 'coordinator',
      },
    });

    return NextResponse.json(updatedBus);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Failed to dispatch bus:', error);
    return NextResponse.json({ error: 'Failed to dispatch bus' }, { status: 500 });
  }
}
