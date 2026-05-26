import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message: string; details?: string }>;
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Check 1: DATABASE_URL environment variable
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    health.checks['DATABASE_URL'] = {
      status: 'fail',
      message: 'DATABASE_URL is not set',
      details: 'Set DATABASE_URL in your deployment platform environment variables. For Neon PostgreSQL, use the pooled connection string from the Neon console.',
    };
    health.status = 'unhealthy';
  } else if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    health.checks['DATABASE_URL'] = {
      status: 'fail',
      message: 'DATABASE_URL has invalid protocol',
      details: `Expected postgresql:// or postgres://, got: "${databaseUrl.substring(0, 30)}..."`,
    };
    health.status = 'unhealthy';
  } else {
    health.checks['DATABASE_URL'] = {
      status: 'pass',
      message: 'DATABASE_URL is set with valid PostgreSQL protocol',
    };
  }

  // Check 2: DIRECT_URL environment variable
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    health.checks['DIRECT_URL'] = {
      status: 'warn',
      message: 'DIRECT_URL is not set',
      details: 'Required for Prisma migrations. Set to the direct (non-pooled) Neon connection string.',
    };
    if (health.status === 'healthy') health.status = 'degraded';
  } else if (!directUrl.startsWith('postgresql://') && !directUrl.startsWith('postgres://')) {
    health.checks['DIRECT_URL'] = {
      status: 'warn',
      message: 'DIRECT_URL has invalid protocol',
      details: `Expected postgresql:// or postgres://, got: "${directUrl.substring(0, 30)}..."`,
    };
    if (health.status === 'healthy') health.status = 'degraded';
  } else {
    health.checks['DIRECT_URL'] = {
      status: 'pass',
      message: 'DIRECT_URL is set with valid PostgreSQL protocol',
    };
  }

  // Check 3: NEXTAUTH_SECRET
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (!nextAuthSecret) {
    health.checks['NEXTAUTH_SECRET'] = {
      status: 'fail',
      message: 'NEXTAUTH_SECRET is not set',
      details: 'Required for NextAuth JWT signing and encryption. Generate with: openssl rand -base64 32',
    };
    health.status = 'unhealthy';
  } else {
    health.checks['NEXTAUTH_SECRET'] = {
      status: 'pass',
      message: 'NEXTAUTH_SECRET is set',
    };
  }

  // Check 4: NEXTAUTH_URL
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (!nextAuthUrl) {
    health.checks['NEXTAUTH_URL'] = {
      status: 'warn',
      message: 'NEXTAUTH_URL is not set',
      details: 'Required for NextAuth redirect URLs. Set to your production URL (e.g., https://routeshepherd.vercel.app)',
    };
    if (health.status === 'healthy') health.status = 'degraded';
  } else {
    health.checks['NEXTAUTH_URL'] = {
      status: 'pass',
      message: `NEXTAUTH_URL is set to ${nextAuthUrl}`,
    };
  }

  // Check 5: Google OAuth
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!googleClientId || googleClientId === 'placeholder') {
    health.checks['GOOGLE_OAUTH'] = {
      status: 'warn',
      message: 'Google OAuth is not configured',
      details: 'GOOGLE_CLIENT_ID is not set or is "placeholder". Google Sign-In will be disabled. Configure in Google Cloud Console.',
    };
    if (health.status === 'healthy') health.status = 'degraded';
  } else {
    health.checks['GOOGLE_OAUTH'] = {
      status: 'pass',
      message: 'Google OAuth credentials are configured',
    };
  }

  // Check 6: Database connectivity
  try {
    const { db } = await import('@/lib/db');
    await db.$queryRaw`SELECT 1`;
    const userCount = await db.user.count();
    health.checks['DATABASE_CONNECTION'] = {
      status: 'pass',
      message: `Successfully connected to database. ${userCount} users found.`,
    };
  } catch (dbError) {
    const errMsg = dbError instanceof Error ? dbError.message : String(dbError);
    health.checks['DATABASE_CONNECTION'] = {
      status: 'fail',
      message: 'Failed to connect to database',
      details: errMsg,
    };
    health.status = 'unhealthy';
  }

  // Check 7: Runtime environment
  health.checks['RUNTIME'] = {
    status: 'pass',
    message: `Node ${process.version} | ${process.env.VERCEL ? 'Vercel' : 'Local'} | ${process.env.NODE_ENV}`,
  };

  const statusCode = health.status === 'unhealthy' ? 503 : health.status === 'degraded' ? 200 : 200;
  return NextResponse.json(health, { status: statusCode });
}
