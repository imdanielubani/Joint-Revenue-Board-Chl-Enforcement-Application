import type { Database } from './pool.js';
import type { Migration } from './migration.js';
import { migrations as allMigrations } from './migrations/index.js';

/** Any number, shared by every instance, so only one migrates at a time. */
const MIGRATION_LOCK = 4_271_001;

/**
 * Applies every migration not applied yet, in order, each in its own
 * transaction. Safe to run on every start and from several servers at once.
 * Returns the IDs it applied.
 */
export async function runMigrations(
  database: Database,
  migrations: Migration[] = allMigrations,
): Promise<string[]> {
  return database.transaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query<{ id: string }>('SELECT id FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.id));

    const done: string[] = [];
    for (const migration of migrations) {
      if (applied.has(migration.id)) continue;
      await client.query(migration.sql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
      done.push(migration.id);
    }
    return done;
  });
}
