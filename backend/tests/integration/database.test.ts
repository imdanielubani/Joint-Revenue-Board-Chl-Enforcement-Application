import { afterAll, describe, expect, it } from 'vitest';

import { createDatabase, databaseCheck } from '../../src/database/prisma.js';

// Runs only when TEST_DATABASE_URL points at a reachable PostgreSQL database.
// It only runs SELECT 1; it creates and changes nothing.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('database readiness against PostgreSQL', () => {
  const db = createDatabase(url ?? '');
  afterAll(() => db.$disconnect());

  it('reports the database as up', async () => {
    await expect(databaseCheck(db).check()).resolves.toBe('up');
  });
});

describe('database readiness without a database', () => {
  it('reports not_configured when there is no client', async () => {
    await expect(databaseCheck(undefined).check()).resolves.toBe('not_configured');
  });

  it('rejects when the database cannot be reached', async () => {
    const db = createDatabase('postgresql://nobody:nothing@127.0.0.1:1/none');
    await expect(databaseCheck(db).check()).rejects.toThrow();
    await db.$disconnect();
  });
});
