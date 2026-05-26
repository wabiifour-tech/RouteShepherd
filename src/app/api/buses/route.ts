import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const eventId = searchParams.get('eventId');

    const buses = await db.bus.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(eventId ? { eventId } : {}),
      },
      include: {
        route: {
          include: {
            fromPoint: true,
            toPoint: true,
          },
        },
      },
      orderBy: { plateNumber: 'asc' },
    });

    return NextResponse.json(buses);
  } catch (error) {
    console.error('Failed to fetch buses:', error);
    return NextResponse.json({ error: 'Failed to fetch buses' }, { status: 500 });
  }
}
