import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod/v4';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name is required').optional(),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, phone, password } = signupSchema.parse(body);

    // Check if user already exists
    const existing = await db.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      );
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new passenger user
    const user = await db.user.create({
      data: {
        email,
        name: name || null,
        phone: phone || null,
        role: 'passenger',
        provider: 'credentials',
        password: passwordHash,
      },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      provider: user.provider,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Sign-up failed:', error);
    return NextResponse.json(
      { error: 'Sign-up failed' },
      { status: 500 }
    );
  }
}
