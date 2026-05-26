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

  // Prisma handles Neon connections natively with the pooled url (DATABASE_URL)
  // and direct url (DIRECT_URL) configured in schema.prisma datasource.
  // No adapter needed — Prisma's built-in connection pooling works great with Neon.
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
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
