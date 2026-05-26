import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get the latest queue entry per pickup point
    const pickupPoints = await db.pickupPoint.findMany({
      where: { active: true },
      include: {
        queueEntries: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const queueStatus = pickupPoints.map((pp) => ({
      pickupPointId: pp.id,
      name: pp.name,
      state: pp.state,
      estimatedWait: pp.queueEntries[0]?.estimatedWait ?? null,
      queueLength: pp.queueEntries[0]?.queueLength ?? null,
      recordedAt: pp.queueEntries[0]?.recordedAt ?? null,
    }));

    return NextResponse.json(queueStatus);
  } catch (error) {
    console.error('Failed to fetch queue status:', error);
    return NextResponse.json({ error: 'Failed to fetch queue status' }, { status: 500 });
  }
}
