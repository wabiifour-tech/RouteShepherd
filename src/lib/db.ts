import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with proper connection handling for serverless
function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('⚠️ DATABASE_URL is not set. Database operations will fail.');
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    datasources: databaseUrl ? {
      db: {
        url: databaseUrl,
      },
    } : undefined,
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
