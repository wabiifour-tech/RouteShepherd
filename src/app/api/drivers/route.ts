import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';
import { requireCoordinator, requireAuth } from '@/lib/api-auth';
import bcrypt from 'bcryptjs';
import { generateRandomPin } from '@/lib/auth';

export async function GET() {
  try {
    // Only coordinators can list all drivers
    const user = await requireCoordinator();
    if (!user) {
      return NextResponse.json({ error: 'Coordinator authentication required' }, { status: 401 });
    }

    const drivers = await db.user.findMany({
      where: { role: 'driver' },
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
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(drivers);
  } catch (error) {
    console.error('Failed to fetch drivers:', error);
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
  }
}

const driverSchema = z.object({
  name: z.string().min(2, 'Driver name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone number is required'),
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits').optional(), // Optional: auto-generated if not provided
  busId: z.string().optional(), // Assign to bus
});

export async function POST(request: Request) {
  try {
    // Only coordinators can create drivers
    const user = await requireCoordinator();
    if (!user) {
      return NextResponse.json({ error: 'Coordinator authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, pin, busId } = driverSchema.parse(body);

    // Generate a unique random PIN if not provided
    const assignedPin = pin || generateRandomPin();

    // Check if email already exists
    const existing = await db.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Hash the PIN
    const saltRounds = 10;
    const pinHash = await bcrypt.hash(assignedPin, saltRounds);

    // Create driver user with hashed PIN and pinChangeRequired = true
    const driver = await db.user.create({
      data: {
        email,
        name,
        driverPhone: phone,
        role: 'driver',
        provider: 'credentials',
        pinHash,
        pinChangeRequired: true,
      },
    });

    // If busId provided, assign driver to bus
    if (busId) {
      const bus = await db.bus.findUnique({ where: { id: busId } });
      if (bus) {
        await db.bus.update({
          where: { id: busId },
          data: { driverId: driver.id },
        });
      }
    }

    // Fetch the created driver with bus info
    const created = await db.user.findUnique({
      where: { id: driver.id },
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

    return NextResponse.json({ ...created, assignedPin }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to create driver:', error);
    return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 });
  }
}

const driverUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits').optional(),
  busId: z.string().nullable().optional(), // null to unassign
});

export async function PATCH(request: Request) {
  try {
    // Only coordinators can update drivers
    const user = await requireCoordinator();
    if (!user) {
      return NextResponse.json({ error: 'Coordinator authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, email, phone, pin, busId } = driverUpdateSchema.parse(body);

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing || existing.role !== 'driver') {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Hash new PIN if provided
    let pinHash: string | undefined;
    if (pin) {
      const saltRounds = 10;
      pinHash = await bcrypt.hash(pin, saltRounds);
    }

    // Update driver info
    await db.user.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { driverPhone: phone } : {}),
        ...(pinHash ? { pinHash } : {}),
      },
    });

    // Handle bus assignment changes
    // First, unassign from any current bus
    await db.bus.updateMany({
      where: { driverId: id },
      data: { driverId: null },
    });

    // Then assign to new bus if provided
    if (busId) {
      const bus = await db.bus.findUnique({ where: { id: busId } });
      if (bus) {
        await db.bus.update({
          where: { id: busId },
          data: { driverId: id },
        });
      }
    }

    const updated = await db.user.findUnique({
      where: { id },
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

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to update driver:', error);
    return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // Only coordinators can delete drivers
    const user = await requireCoordinator();
    if (!user) {
      return NextResponse.json({ error: 'Coordinator authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing || existing.role !== 'driver') {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Unassign from any buses first
    await db.bus.updateMany({
      where: { driverId: id },
      data: { driverId: null },
    });

    // Delete the driver
    await db.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete driver:', error);
    return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 });
  }
}
