import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod/v4';
import { requireAuth } from '@/lib/api-auth';

export async function GET(request: Request) {
  // GET is public - anyone can view notifications (filtered by target/userId)
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');
    const userId = searchParams.get('userId');
    const unreadOnly = searchParams.get('unread') === 'true';

    const where: Record<string, unknown> = {};

    if (target) {
      // Get notifications for a target group (or all)
      where.OR = [
        { target, userId: null }, // Broadcast notifications for this target
        { target: 'all', userId: null }, // Global broadcasts
        ...(userId ? [{ userId }] : []), // User-specific notifications
      ];
    } else if (userId) {
      // Get notifications for a specific user
      where.OR = [
        { userId },
        { userId: null, target: 'all' },
      ];
    }

    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await db.notification.findMany({
      where: Object.keys(where).length > 0 ? where : {},
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
  userId: z.string().optional(), // Optional: send to a specific user
});

export async function POST(request: Request) {
  try {
    // Require authentication for creating notifications
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validated = notificationSchema.parse(body);

    const notification = await db.notification.create({
      data: {
        title: validated.title,
        message: validated.message,
        type: validated.type,
        target: validated.target,
        userId: validated.userId || null,
      },
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

// Mark notifications as read
const markReadSchema = z.object({
  id: z.string().optional(), // Mark a single notification as read
  allForUser: z.string().optional(), // Mark all unread notifications for a user as read
});

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validated = markReadSchema.parse(body);

    if (validated.id) {
      // Mark a single notification as read
      const notification = await db.notification.update({
        where: { id: validated.id },
        data: { read: true },
      });
      return NextResponse.json(notification);
    }

    if (validated.allForUser) {
      // Mark all unread notifications for a user as read
      // This includes user-specific ones and broadcast ones matching their role
      const result = await db.notification.updateMany({
        where: {
          read: false,
          OR: [
            { userId: validated.allForUser },
            { userId: null, target: user.role },
            { userId: null, target: 'all' },
          ],
        },
        data: { read: true },
      });
      return NextResponse.json({ updated: result.count });
    }

    return NextResponse.json({ error: 'Provide either id or allForUser' }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Failed to update notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// Get unread count
export async function PUT(request: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const count = await db.notification.count({
      where: {
        read: false,
        OR: [
          { userId: user.id },
          { userId: null, target: user.role },
          { userId: null, target: 'all' },
        ],
      },
    });

    return NextResponse.json({ unreadCount: count });
  } catch (error) {
    console.error('Failed to count notifications:', error);
    return NextResponse.json({ error: 'Failed to count notifications' }, { status: 500 });
  }
}
