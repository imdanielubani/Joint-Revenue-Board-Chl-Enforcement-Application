/**
 * Local development only: drops and recreates DATABASE_URL's schema, then
 * re-applies every committed migration (`prisma migrate reset --force`).
 *
 * Refuses unless DATABASE_URL points at this machine. There is no seed data:
 * the only synthetic identities are the FAKE CHL provider's accounts
 * (src/integrations/chl/fake/), and nothing else needs seeding yet.
 *
 * Usage: npm run db:reset
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

const raw = process.env.DATABASE_URL;
if (!raw) {
  process.stderr.write('DATABASE_URL is not set.\n');
  process.exit(1);
}
const { hostname } = new URL(raw);
if (!['localhost', '127.0.0.1', '::1'].includes(hostname)) {
  process.stderr.write('Refusing to reset: DATABASE_URL is not a local database.\n');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production') {
  process.stderr.write('Refusing to reset: NODE_ENV=production.\n');
  process.exit(1);
}

execFileSync(
  process.execPath,
  ['node_modules/prisma/build/index.js', 'migrate', 'reset', '--force'],
  {
    stdio: 'inherit',
  },
);
