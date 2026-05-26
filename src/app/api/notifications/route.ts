import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';

export async function GET() {
  try {
    const notifications = await db.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

const notificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['info', 'warning', 'success']).default('info'),
  target: z.enum(['all', 'coordinator', 'passenger', 'driver']).default('all'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = notificationSchema.parse(body);

    const notification = await db.notification.create({
      data: validated,
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}
