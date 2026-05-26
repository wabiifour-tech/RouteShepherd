import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';

const preregisterSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().regex(/^\+234-\d{3}-\d{3}-\d{4}$/, 'Phone must be in format +234-XXX-XXX-XXXX'),
  pickupPointId: z.string().min(1, 'Pickup point is required'),
  preferredTime: z.string().optional(),
  passengers: z.number().int().min(1).max(10).default(1),
});

export async function GET() {
  try {
    const preregs = await db.preRegistration.findMany({
      include: { pickupPoint: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(preregs);
  } catch (error) {
    console.error('Failed to fetch pre-registrations:', error);
    return NextResponse.json({ error: 'Failed to fetch pre-registrations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const prereg = await db.preRegistration.create({
      data: {
        fullName: validated.fullName,
        phone: validated.phone,
        pickupPointId: validated.pickupPointId,
        preferredTime: validated.preferredTime || null,
        passengers: validated.passengers,
        status: 'pending',
      },
      include: {
        pickupPoint: true,
      },
    });

    return NextResponse.json(prereg, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Failed to pre-register:', error);
    return NextResponse.json({ error: 'Failed to pre-register' }, { status: 500 });
  }
}
