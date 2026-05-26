import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    const routes = await db.route.findMany({
      where: eventId ? { eventId } : undefined,
      include: {
        fromPoint: true,
        toPoint: true,
        _count: { select: { buses: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(routes);
  } catch (error) {
    console.error('Failed to fetch routes:', error);
    return NextResponse.json({ error: 'Failed to fetch routes' }, { status: 500 });
  }
}
