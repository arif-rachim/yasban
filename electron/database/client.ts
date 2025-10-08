import { PrismaClient } from '@prisma/client';
import path from 'path';
import { app } from 'electron';

// Singleton Prisma Client
let prisma: PrismaClient | null = null;

/**
 * Get Prisma Client instance (singleton)
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    // Database path: User's app data directory
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'yasban.db');

    console.log(`Database path: ${dbPath}`);

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}`,
        },
      },
      log: ['error', 'warn'],
    });

    // Test connection
    prisma.$connect()
      .then(() => {
        console.log('✓ Database connected successfully');
      })
      .catch((error) => {
        console.error('✗ Database connection failed:', error);
      });
  }

  return prisma;
}

/**
 * Disconnect Prisma Client (call on app quit)
 */
export async function disconnectPrismaClient() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    console.log('Database disconnected');
  }
}

// Export as default to avoid redeclaration
export default getPrismaClient();
