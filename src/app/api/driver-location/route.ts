import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';
import { requireDriver } from '@/lib/api-auth';

const locationSchema = z.object({
  busId: z.string().min(1, 'Bus ID is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function PATCH(request: Request) {
  try {
    // Only drivers can update their bus location
    const user = await requireDriver();
    if (!user) {
      return NextResponse.json({ error: 'Driver authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { busId, latitude, longitude } = locationSchema.parse(body);

    const bus = await db.bus.findUnique({ where: { id: busId } });
    if (!bus) {
      return NextResponse.json({ error: 'Bus not found' }, { status: 404 });
    }

    // Driver can only update location for buses assigned to them
    if (bus.driverId !== user.id) {
      return NextResponse.json(
        { error: 'You can only update location for buses assigned to you' },
        { status: 403 }
      );
    }

    const updated = await db.bus.update({
      where: { id: busId },
      data: {
        latitude,
        longitude,
        lastUpdated: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to update driver location:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}
