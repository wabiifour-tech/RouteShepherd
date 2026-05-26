import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error(
      'CRITICAL: DATABASE_URL environment variable is not set. ' +
      'All database operations will fail. ' +
      'Please set DATABASE_URL in your deployment platform (Vercel Dashboard > Settings > Environment Variables).'
    )
    return new PrismaClient()
  }

  // Validate DATABASE_URL protocol
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    console.error(
      `CRITICAL: DATABASE_URL must start with postgresql:// or postgres://. ` +
      `Current value starts with: "${databaseUrl.substring(0, 30)}..." ` +
      `This usually means the environment variable is incorrectly set or pointing to a SQLite database. ` +
      `For Neon PostgreSQL, the URL should look like: postgresql://user:pass@ep-xxx.neon.tech/dbname`
    )
    return new PrismaClient()
  }

  // For Vercel/serverless: Use the Neon serverless adapter for better connection handling
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  if (isServerless) {
    try {
      // Dynamic import for Neon adapter — only used in serverless environments
      const { PrismaNeon } = require('@prisma/adapter-neon')
      console.log('[DB] Initializing Neon serverless adapter for serverless environment')
      // PrismaNeon constructor takes PoolConfig (connection options), not a Pool instance
      const adapter = new PrismaNeon({ connectionString: databaseUrl })
      return new PrismaClient({ adapter })
    } catch (adapterError) {
      console.warn('[DB] Neon adapter initialization failed, falling back to standard PrismaClient:', adapterError)
      // Fall through to standard client with datasources override
    }
  }

  // For local development or when adapter isn't available:
  // Override the url in datasources. Note: directUrl is read from DIRECT_URL env var
  // by Prisma automatically (as defined in schema.prisma) — it CANNOT be overridden
  // in the datasources object at runtime.
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Handle connection cleanup on process exit
process.on('beforeExit', async () => {
  try {
    await db.$disconnect()
  } catch {
    // Ignore disconnect errors on exit
  }
})
