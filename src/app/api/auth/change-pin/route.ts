import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod/v4';

const changePinSchema = z.object({
  currentPin: z.string().regex(/^\d{6}$/, 'Current PIN must be exactly 6 digits'),
  newPin: z.string().regex(/^\d{6}$/, 'New PIN must be exactly 6 digits'),
  confirmPin: z.string().regex(/^\d{6}$/, 'Confirmation PIN must be exactly 6 digits'),
}).refine((data) => data.newPin === data.confirmPin, {
  message: 'New PIN and confirmation PIN do not match',
}).refine((data) => data.currentPin !== data.newPin, {
  message: 'New PIN must be different from current PIN',
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    const role = (session.user as { role?: string }).role;

    if (!userId || role !== 'driver') {
      return NextResponse.json({ error: 'Only drivers can change their PIN' }, { status: 403 });
    }

    const body = await request.json();
    const { currentPin, newPin } = changePinSchema.parse(body);

    // Get current user with PIN hash
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.pinHash) {
      return NextResponse.json({ error: 'Driver account not found or no PIN set' }, { status: 404 });
    }

    // Verify current PIN
    const isValid = await bcrypt.compare(currentPin, user.pinHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 401 });
    }

    // Hash and save new PIN
    const saltRounds = 10;
    const newPinHash = await bcrypt.hash(newPin, saltRounds);

    await db.user.update({
      where: { id: userId },
      data: {
        pinHash: newPinHash,
        pinChangeRequired: false,
      },
    });

    return NextResponse.json({ success: true, message: 'PIN changed successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('PIN change failed:', error);
    return NextResponse.json({ error: 'PIN change failed' }, { status: 500 });
  }
}
