import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prismaPersistence } from '../../src/database/persistence.js';
import { createDatabase, databaseCheck } from '../../src/database/prisma.js';
import { FAKE_CHL_PASSWORD } from '../../src/integrations/chl/fake/fake-identity-client.js';
import { testHarness } from '../support/app.js';

import type { Principal } from '../../src/modules/auth/auth.types.js';

// Runs only when TEST_DATABASE_URL points at a local PostgreSQL database
// whose name ends in _test (checked in tests/support/global-setup.ts, which
// also applies the migrations). These tests empty its tables.
const url = process.env.TEST_DATABASE_URL;

const principal: Principal = {
  id: 'FAKE-AG-0001',
  name: 'Fake Agent One',
  email: 'agent.one@example.test',
  role: 'ENFORCEMENT_AGENT',
  organization: null,
  region: null,
  assignment: null,
  scope: { level: 'lga', ref: 'FAKE-LGA-001', name: 'Fake LGA One' },
};

const later = (minutes: number) => new Date(Date.now() + minutes * 60_000);

function newSession(n: number) {
  return {
    client: 'mobile' as const,
    principal,
    accessTokenHash: `access-${n}`,
    refreshTokenHash: `refresh-${n}`,
    accessExpiresAt: later(30),
    expiresAt: later(24 * 60),
  };
}

describe.skipIf(!url)('PostgreSQL persistence', () => {
  const db = createDatabase(url ?? '');
  const persistence = prismaPersistence(db);

  beforeEach(async () => {
    // TRUNCATE is not blocked by the append-only row trigger; tests only.
    await db.$executeRawUnsafe('TRUNCATE TABLE sessions, audit_events');
  });
  afterAll(() => db.$disconnect());

  it('reports the database as ready', async () => {
    await expect(databaseCheck(db).check()).resolves.toBe('up');
  });

  describe('sessions', () => {
    it('stores and finds sessions by token hash', async () => {
      const created = await persistence.sessions.create(newSession(1));
      expect(created.principalId).toBe('FAKE-AG-0001');
      expect((await persistence.sessions.findByAccessHash('access-1'))?.id).toBe(created.id);
      expect((await persistence.sessions.findByRefreshHash('refresh-1'))?.principal).toEqual(
        principal,
      );
      expect(await persistence.sessions.findByAccessHash('nope')).toBeNull();
    });

    it('refuses two sessions with the same token hash', async () => {
      await persistence.sessions.create(newSession(1));
      await expect(persistence.sessions.create(newSession(1))).rejects.toThrow();
    });

    it('rotates only when the presented refresh token is still current', async () => {
      const s = await persistence.sessions.create(newSession(1));
      const rotation = {
        accessTokenHash: 'access-2',
        refreshTokenHash: 'refresh-2',
        accessExpiresAt: later(30),
        principal,
        refreshedAt: new Date(),
      };
      expect(await persistence.sessions.rotate(s.id, 'refresh-1', rotation)).toBe(true);
      expect(
        await persistence.sessions.rotate(s.id, 'refresh-1', {
          ...rotation,
          accessTokenHash: 'access-3',
          refreshTokenHash: 'refresh-3',
        }),
      ).toBe(false);
    });

    it('revokes every session of an account', async () => {
      await persistence.sessions.create(newSession(1));
      await persistence.sessions.create(newSession(2));
      expect(
        await persistence.sessions.revokeAllForPrincipal('FAKE-AG-0001', 'test', new Date()),
      ).toBe(2);
      expect((await persistence.sessions.findByAccessHash('access-1'))?.revokedReason).toBe('test');
    });

    it('enforces the client and expiry constraints', async () => {
      await expect(
        db.$executeRawUnsafe(
          `INSERT INTO sessions (id, principal_id, client, principal, access_token_hash, refresh_token_hash, access_expires_at, expires_at)
           VALUES (gen_random_uuid(), 'x', 'admin', '{}', 'a', 'r', now(), now())`,
        ),
      ).rejects.toThrow(/sessions_client_check/);
      await expect(
        db.$executeRawUnsafe(
          `INSERT INTO sessions (id, principal_id, client, principal, access_token_hash, refresh_token_hash, access_expires_at, expires_at)
           VALUES (gen_random_uuid(), 'x', 'mobile', '{}', 'a', 'r', now() + interval '2 days', now())`,
        ),
      ).rejects.toThrow(/sessions_expiry_check/);
    });
  });

  describe('audit_events', () => {
    const event = (action: string, outcome: 'success' | 'failure' = 'success') => ({
      actorType: 'principal' as const,
      actorId: 'FAKE-SA-0001',
      actorRole: 'SYSTEM_ADMINISTRATOR',
      action,
      outcome,
      targetType: null,
      targetId: null,
      requestId: 'req',
      ip: null,
      details: { n: 1 },
    });

    it('appends and lists newest first, with filters and a cursor', async () => {
      for (const action of ['a.one', 'a.two', 'a.three']) {
        await persistence.audit.append(event(action));
      }
      await persistence.audit.append(event('a.four', 'failure'));
      const all = await persistence.audit.list({ limit: 10 });
      expect(all.map((e) => e.action)).toEqual(['a.four', 'a.three', 'a.two', 'a.one']);
      const failures = await persistence.audit.list({ limit: 10, outcome: 'failure' });
      expect(failures.map((e) => e.action)).toEqual(['a.four']);
      const page2 = await persistence.audit.list({
        limit: 10,
        before: { occurredAt: all[1]!.occurredAt, id: all[1]!.id },
      });
      expect(page2.map((e) => e.action)).toEqual(['a.two', 'a.one']);
    });

    it('is append-only: UPDATE and DELETE are refused by the database', async () => {
      await persistence.audit.append(event('a.one'));
      await expect(
        db.$executeRawUnsafe(`UPDATE audit_events SET outcome = 'failure'`),
      ).rejects.toThrow(/append-only/);
      await expect(db.$executeRawUnsafe('DELETE FROM audit_events')).rejects.toThrow(/append-only/);
      expect(await persistence.audit.list({ limit: 10 })).toHaveLength(1);
    });

    it('accepts only the defined outcomes and actor types', async () => {
      await expect(
        persistence.audit.append({ ...event('a'), outcome: 'maybe' as 'success' }),
      ).rejects.toThrow();
      await expect(
        persistence.audit.append({ ...event('a'), actorType: 'robot' as 'system' }),
      ).rejects.toThrow();
    });
  });

  it('rolls a transaction back entirely on error', async () => {
    await expect(
      persistence.transaction(async (repos) => {
        await repos.sessions.create(newSession(1));
        await repos.audit.append({
          actorType: 'system',
          actorId: null,
          actorRole: null,
          action: 'auth.login',
          outcome: 'success',
          targetType: null,
          targetId: null,
          requestId: null,
          ip: null,
          details: null,
        });
        throw new Error('later step failed');
      }),
    ).rejects.toThrow('later step failed');
    expect(await persistence.sessions.findByAccessHash('access-1')).toBeNull();
    expect(await persistence.audit.list({ limit: 10 })).toEqual([]);
  });

  it('runs the whole sign-in flow against PostgreSQL', async () => {
    const { app, fake } = testHarness({ persistence });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'agent.one@example.test', password: FAKE_CHL_PASSWORD });
    expect(login.status).toBe(200);
    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken });
    expect(refreshed.status).toBe(200);
    fake.setStatus('FAKE-AG-0001', 'deactivated');
    const denied = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshed.body.refreshToken });
    expect(denied.body.error.code).toBe('ACCOUNT_DEACTIVATED');

    const admin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.test', password: FAKE_CHL_PASSWORD, client: 'monitoring' });
    const trail = await request(app)
      .get('/api/v1/monitoring/audit-events')
      .set('Authorization', `Bearer ${admin.body.accessToken}`);
    expect(trail.status).toBe(200);
    expect(trail.body.items.map((e: { action: string }) => e.action)).toEqual([
      'auth.login',
      'auth.session.revoke',
      'auth.refresh',
      'auth.login',
    ]);
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
