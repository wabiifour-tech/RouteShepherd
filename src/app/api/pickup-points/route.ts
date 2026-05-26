import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const pickupPoints = await db.pickupPoint.findMany({
      where: { active: true },
      orderBy: [{ state: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(pickupPoints);
  } catch (error) {
    console.error('Failed to fetch pickup points:', error);
    return NextResponse.json({ error: 'Failed to fetch pickup points' }, { status: 500 });
  }
}
