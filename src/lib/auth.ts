import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

// Rate limiting constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// Only include Google provider if credentials are configured
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [];

// Google OAuth - only if credentials are properly set (not placeholder)
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_ID !== 'placeholder' &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_SECRET !== 'placeholder'
) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

/**
 * Check if an account is currently locked out due to too many failed attempts.
 * Returns true if the account is locked.
 */
async function isAccountLocked(email: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return false;
  if (!user.lockedUntil) return false;
  // If lockout period has expired, reset it
  if (new Date() > user.lockedUntil) {
    await db.user.update({
      where: { email },
      data: { loginAttempts: 0, lockedUntil: null },
    });
    return false;
  }
  return true;
}

/**
 * Record a failed login attempt and lock the account if threshold is exceeded.
 */
async function recordFailedAttempt(email: string): Promise<void> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return;

  const newAttempts = user.loginAttempts + 1;
  const lockUntil = newAttempts >= MAX_LOGIN_ATTEMPTS
    ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
    : user.lockedUntil;

  await db.user.update({
    where: { email },
    data: {
      loginAttempts: newAttempts,
      lockedUntil: lockUntil,
    },
  });
}

/**
 * Reset login attempts after a successful login.
 */
async function resetLoginAttempts(email: string): Promise<void> {
  await db.user.update({
    where: { email },
    data: { loginAttempts: 0, lockedUntil: null },
  });
}

/**
 * Generate a random 6-digit PIN.
 */
export function generateRandomPin(): string {
  // Generate a random 6-digit number (100000-999999)
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Coordinator credentials provider
providers.push(
  CredentialsProvider({
    id: 'coordinator',
    name: 'Coordinator Login',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Email and password are required');
      }

      // Check account lockout
      if (await isAccountLocked(credentials.email)) {
        throw new Error(`Account temporarily locked due to too many failed attempts. Please try again in ${LOCKOUT_DURATION_MINUTES} minutes.`);
      }

      const user = await db.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user || user.role !== 'coordinator') {
        await recordFailedAttempt(credentials.email);
        throw new Error('Invalid coordinator credentials');
      }

      if (!user.passwordHash) {
        await recordFailedAttempt(credentials.email);
        throw new Error('Invalid coordinator credentials');
      }

      const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!isValid) {
        await recordFailedAttempt(credentials.email);
        throw new Error('Invalid coordinator credentials');
      }

      await resetLoginAttempts(credentials.email);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        provider: user.provider,
      };
    },
  })
);

// Driver credentials provider (email + 6-digit PIN)
providers.push(
  CredentialsProvider({
    id: 'driver',
    name: 'Driver Login',
    credentials: {
      email: { label: 'Email', type: 'email' },
      pin: { label: '6-Digit PIN', type: 'text' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.pin) {
        throw new Error('Email and PIN are required');
      }

      // Check account lockout
      if (await isAccountLocked(credentials.email)) {
        throw new Error(`Account temporarily locked due to too many failed attempts. Please try again in ${LOCKOUT_DURATION_MINUTES} minutes.`);
      }

      const user = await db.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user || user.role !== 'driver') {
        await recordFailedAttempt(credentials.email);
        throw new Error('No driver account found with this email. Please contact your coordinator.');
      }

      if (!user.pinHash) {
        await recordFailedAttempt(credentials.email);
        throw new Error('No PIN set for this driver. Please contact your coordinator to set up your PIN.');
      }

      const isValid = await bcrypt.compare(credentials.pin, user.pinHash);
      if (!isValid) {
        await recordFailedAttempt(credentials.email);
        throw new Error('Invalid PIN. Please try again.');
      }

      await resetLoginAttempts(credentials.email);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        provider: user.provider,
        driverPhone: user.driverPhone,
        pinChangeRequired: user.pinChangeRequired,
      };
    },
  })
);

// Passenger credentials provider (email + password)
providers.push(
  CredentialsProvider({
    id: 'passenger',
    name: 'Passenger Login',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Email and password are required');
      }

      // Check account lockout
      if (await isAccountLocked(credentials.email)) {
        throw new Error(`Account temporarily locked due to too many failed attempts. Please try again in ${LOCKOUT_DURATION_MINUTES} minutes.`);
      }

      const user = await db.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user || user.role !== 'passenger') {
        await recordFailedAttempt(credentials.email);
        throw new Error('No passenger account found with this email.');
      }

      if (!user.password) {
        await recordFailedAttempt(credentials.email);
        throw new Error('This account was created with Google. Please sign in with Google instead.');
      }

      const isValid = await bcrypt.compare(credentials.password, user.password);
      if (!isValid) {
        await recordFailedAttempt(credentials.email);
        throw new Error('Invalid email or password.');
      }

      await resetLoginAttempts(credentials.email);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        provider: user.provider,
      };
    },
  })
);

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const existingUser = await db.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          await db.user.create({
            data: {
              email: user.email!,
              name: user.name || null,
              image: user.image || null,
              role: 'passenger',
              provider: 'google',
              pinChangeRequired: false,
            },
          });
        }
        return true;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role || 'passenger';
        token.provider = (user as { provider?: string }).provider || 'google';
        token.dbId = user.id;
        // Pass pinChangeRequired for drivers
        token.pinChangeRequired = (user as { pinChangeRequired?: boolean }).pinChangeRequired || false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { provider?: string }).provider = token.provider as string;
        (session.user as { id?: string }).id = token.dbId as string;
        (session.user as { pinChangeRequired?: boolean }).pinChangeRequired = token.pinChangeRequired as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours (reduced from 24 for security)
  },
  secret: process.env.NEXTAUTH_SECRET,
};
