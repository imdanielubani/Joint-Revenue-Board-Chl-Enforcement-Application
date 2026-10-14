import { existsSync } from 'node:fs';

import { defineConfig } from 'prisma/config';

// Prisma 7 no longer reads .env itself.
if (existsSync('.env')) process.loadEnvFile('.env');

const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // `prisma generate` and `prisma validate` work without a database; migrate
  // commands need DATABASE_URL.
  ...(url ? { datasource: { url } } : {}),
});
