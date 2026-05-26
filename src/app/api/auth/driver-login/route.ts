import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';

const driverLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = driverLoginSchema.parse(body);

    const user = await db.user.findUnique({
      where: { email },
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

    if (!user || user.role !== 'driver') {
      return NextResponse.json(
        { error: 'No driver account found with this email. Please contact your coordinator.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      provider: user.provider,
      driverPhone: user.driverPhone,
      assignedBuses: user.assignedBuses,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Driver login failed:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
