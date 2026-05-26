import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';

export async function GET() {
  try {
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
  busId: z.string().optional(), // Assign to bus
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, busId } = driverSchema.parse(body);

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

    // Create driver user
    const driver = await db.user.create({
      data: {
        email,
        name,
        driverPhone: phone,
        role: 'driver',
        provider: 'email-only',
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

    return NextResponse.json(created, { status: 201 });
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
  busId: z.string().nullable().optional(), // null to unassign
});

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, email, phone, busId } = driverUpdateSchema.parse(body);

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing || existing.role !== 'driver') {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Update driver info
    await db.user.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { driverPhone: phone } : {}),
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
