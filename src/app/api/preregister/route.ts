import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';
import { requireAuth, requireCoordinator } from '@/lib/api-auth';

const preregisterSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  pickupPointId: z.string().min(1, 'Pickup point is required'),
  preferredTime: z.string().optional(),
  passengers: z.number().int().min(1).max(10).default(1),
  userId: z.string().optional(), // Link to user account
  assignedBusId: z.string().optional(), // Coordinator can assign bus
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // If userId provided, return that user's pre-registrations (passenger can view their own)
    if (userId) {
      const preregs = await db.preRegistration.findMany({
        where: { userId },
        include: {
          pickupPoint: true,
          assignedBus: {
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
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(preregs);
    }

    // Otherwise, only coordinators can view all pre-registrations
    const user = await requireCoordinator();
    if (!user) {
      return NextResponse.json({ error: 'Coordinator authentication required' }, { status: 401 });
    }

    const preregs = await db.preRegistration.findMany({
      include: {
        pickupPoint: true,
        assignedBus: {
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
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(preregs);
  } catch (error) {
    console.error('Failed to fetch pre-registrations:', error);
    return NextResponse.json({ error: 'Failed to fetch pre-registrations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // POST is public - passengers can pre-register without auth
  try {
    const body = await request.json();
    const validated = preregisterSchema.parse(body);

    // Check pickup point exists
    const pickupPoint = await db.pickupPoint.findUnique({
      where: { id: validated.pickupPointId },
    });
    if (!pickupPoint) {
      return NextResponse.json({ error: 'Pickup point not found' }, { status: 404 });
    }

    // If assignedBusId is provided, check it exists (only coordinators should do this)
    if (validated.assignedBusId) {
      const bus = await db.bus.findUnique({ where: { id: validated.assignedBusId } });
      if (!bus) {
        return NextResponse.json({ error: 'Bus not found' }, { status: 404 });
      }
    }

    const prereg = await db.preRegistration.create({
      data: {
        fullName: validated.fullName,
        phone: validated.phone,
        pickupPointId: validated.pickupPointId,
        preferredTime: validated.preferredTime || null,
        passengers: validated.passengers,
        status: validated.assignedBusId ? 'confirmed' : 'pending',
        userId: validated.userId || null,
        assignedBusId: validated.assignedBusId || null,
      },
      include: {
        pickupPoint: true,
        assignedBus: {
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

    // If bus was assigned, create a notification for the user
    if (validated.assignedBusId && validated.userId) {
      const bus = await db.bus.findUnique({
        where: { id: validated.assignedBusId },
        include: { route: true },
      });
      if (bus) {
        await db.notification.create({
          data: {
            title: 'Bus Assigned',
            message: `Your bus ${bus.plateNumber}${bus.route ? ` on route ${bus.route.name}` : ''} has been assigned. Check the tracking tab for live updates.`,
            type: 'success',
            target: 'passenger',
            userId: validated.userId,
          },
        });
      }
    }

    return NextResponse.json(prereg, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Failed to pre-register:', error);
    return NextResponse.json({ error: 'Failed to pre-register' }, { status: 500 });
  }
}

// PATCH - Update pre-registration (coordinator assigns bus, updates status)
const preregUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  assignedBusId: z.string().nullable().optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireCoordinator();
    if (!user) {
      return NextResponse.json({ error: 'Coordinator authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validated = preregUpdateSchema.parse(body);

    const existing = await db.preRegistration.findUnique({ where: { id: validated.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pre-registration not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.assignedBusId !== undefined) {
      updateData.assignedBusId = validated.assignedBusId;
      // Auto-confirm if bus is assigned
      if (validated.assignedBusId && !validated.status) {
        updateData.status = 'confirmed';
      }
    }

    const updated = await db.preRegistration.update({
      where: { id: validated.id },
      data: updateData,
      include: {
        pickupPoint: true,
        assignedBus: {
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

    // Notify the user if bus was assigned
    if (validated.assignedBusId && existing.userId) {
      const bus = await db.bus.findUnique({
        where: { id: validated.assignedBusId },
        include: { route: true },
      });
      if (bus) {
        await db.notification.create({
          data: {
            title: 'Bus Assigned',
            message: `Your bus ${bus.plateNumber}${bus.route ? ` on route ${bus.route.name}` : ''} has been assigned. Check the tracking tab for live updates.`,
            type: 'success',
            target: 'passenger',
            userId: existing.userId,
          },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update pre-registration:', error);
    return NextResponse.json({ error: 'Failed to update pre-registration' }, { status: 500 });
  }
}
