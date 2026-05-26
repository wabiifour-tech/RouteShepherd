import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pickupPointId = searchParams.get('pickupPointId');

    const forecasts = await db.demandForecast.findMany({
      where: pickupPointId ? { pickupPointId } : undefined,
      include: {
        pickupPoint: true,
      },
      orderBy: [{ timeSlot: 'asc' }],
    });

    return NextResponse.json(forecasts);
  } catch (error) {
    console.error('Failed to fetch demand forecasts:', error);
    return NextResponse.json({ error: 'Failed to fetch demand forecasts' }, { status: 500 });
  }
}
