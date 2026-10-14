import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';

import type { DependencyCheck } from '../modules/health/health.types.js';

export type Database = PrismaClient;

/** A Prisma client over node-postgres. Connections open lazily, on first query. */
export function createDatabase(databaseUrl: string): Database {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

/** Readiness check: the database answers a trivial query. */
export function databaseCheck(db: Database | undefined): DependencyCheck {
  return {
    name: 'database',
    async check() {
      if (!db) return 'not_configured';
      await db.$queryRaw`SELECT 1`;
      return 'up';
    },
  };
}
