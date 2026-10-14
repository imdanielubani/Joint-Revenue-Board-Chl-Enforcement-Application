import { execFileSync } from 'node:child_process';

/**
 * Before the tests: bring the test database's schema up to date with the
 * committed migrations. Only runs when TEST_DATABASE_URL is set, and refuses
 * any database that isn't local or whose name doesn't end in "_test",
 * because the database tests empty its tables.
 */
export default function setup(): void {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  const parsed = new URL(url);
  if (!['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
    throw new Error('TEST_DATABASE_URL must point at a local database');
  }
  if (!parsed.pathname.endsWith('_test')) {
    throw new Error(
      'TEST_DATABASE_URL must name a database ending in _test (its tables are emptied)',
    );
  }
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
