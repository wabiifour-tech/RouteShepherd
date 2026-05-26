import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';

const busUpdateSchema = z.object({
  status: z.enum(['available', 'in-transit', 'loading', 'maintenance']).optional(),
  currentLoad: z.number().int().min(0).optional(),
  routeId: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  driverId: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = busUpdateSchema.parse(body);

    // Check bus exists
    const existing = await db.bus.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Bus not found' }, { status: 404 });
    }

    // Validate currentLoad doesn't exceed capacity
    if (validated.currentLoad !== undefined && validated.currentLoad > existing.capacity) {
      return NextResponse.json(
        { error: `Current load (${validated.currentLoad}) exceeds capacity (${existing.capacity})` },
        { status: 400 }
      );
    }

    const bus = await db.bus.update({
      where: { id },
      data: {
        ...validated,
        lastUpdated: new Date(),
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
          },
        },
      },
    });

    return NextResponse.json(bus);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update bus:', error);
    return NextResponse.json({ error: 'Failed to update bus' }, { status: 500 });
  }
}
