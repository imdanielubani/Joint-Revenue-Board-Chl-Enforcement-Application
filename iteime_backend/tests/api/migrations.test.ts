import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runMigrations } from '../../src/db/migrate.js';
import { migrations } from '../../src/db/migrations.js';
import type { Database } from '../../src/db/pool.js';
import { openTestDatabase, testDatabaseUrl } from '../support/harness.js';

describe.skipIf(!testDatabaseUrl)('migrations', () => {
  let database: Database;

  beforeAll(async () => {
    database = openTestDatabase();
    await database.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  });

  afterAll(async () => {
    await database.close();
  });

  it('apply once, even when several servers start together', async () => {
    const results = await Promise.all([runMigrations(database), runMigrations(database)]);
    expect(results.flat()).toEqual(migrations.map((migration) => migration.id));
    expect(await runMigrations(database)).toEqual([]);

    const { rows } = await database.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`,
    );
    expect(rows.map((row) => row.table_name)).toEqual([
      'agent_sessions',
      'audit_events',
      'destination_locations',
      'notifications',
      'schema_migrations',
      'verifications',
    ]);
  });

  it('a failing migration changes nothing', async () => {
    await expect(
      runMigrations(database, [
        ...migrations,
        { id: '999_good', sql: 'CREATE TABLE should_not_exist (id int)' },
        { id: '999_broken', sql: 'THIS IS NOT SQL' },
      ]),
    ).rejects.toThrow();
    const { rows } = await database.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'should_not_exist'",
    );
    expect(rows).toHaveLength(0);
  });
});
