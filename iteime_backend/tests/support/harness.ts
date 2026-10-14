import 'dotenv/config';

import type { Express } from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { expect } from 'vitest';

import { createApp, type AppDependencies } from '../../src/app.js';
import { MOCK_PASSWORD } from '../../src/integrations/chl/mock/mock-data.js';
import { MockChlAdapter } from '../../src/integrations/chl/mock/mock-adapter.js';
import { runMigrations } from '../../src/database/migrator.js';
import { createDatabase, type Database } from '../../src/database/pool.js';

/** The test database; database tests are skipped when it isn't set. */
export const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim() || undefined;

/** Opens the test database, refusing anything not named "…_test". */
export function openTestDatabase(): Database {
  if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is not set');
  const name = new URL(testDatabaseUrl).pathname.slice(1);
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to run tests on "${name}": its name must end in _test.`);
  }
  return createDatabase(testDatabaseUrl);
}

/** Drops everything and migrates from scratch. */
export async function recreateSchema(database: Database): Promise<void> {
  await database.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await runMigrations(database);
}

/** Empties every table, keeping the schema. */
export async function emptyTables(database: Database): Promise<void> {
  await database.query(
    `TRUNCATE agent_sessions, verifications, destination_locations, notifications,
       audit_events RESTART IDENTITY CASCADE`,
  );
}

/** A clock tests can move. */
export class TestClock {
  constructor(public time = new Date()) {}
  now = (): Date => new Date(this.time);
  advance(milliseconds: number): void {
    this.time = new Date(this.time.getTime() + milliseconds);
  }
}

export interface Harness {
  app: Express;
  chl: MockChlAdapter;
  clock: TestClock;
}

export function buildApp(
  database: Database,
  options: { clock?: TestClock } & Partial<AppDependencies> = {},
): Harness {
  const clock = options.clock ?? new TestClock();
  const chl = (options.chl as MockChlAdapter | undefined) ?? new MockChlAdapter({ now: clock.now });
  const app = createApp({
    logger: pino({ level: 'silent' }),
    database,
    now: clock.now,
    loginRateLimit: { windowMs: 60_000, limit: 1_000 },
    ...options,
    chl,
  });
  return { app, chl, clock };
}

/** Signs in the sample agent and returns its tokens. */
export async function signIn(app: Express, email = 'officer@jbr.com') {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: MOCK_PASSWORD });
  expect(response.status).toBe(200);
  return response.body as { accessToken: string; refreshToken: string };
}

export const LAGOS = { latitude: 6.6018, longitude: 3.3515, accuracyMetres: 12 };
