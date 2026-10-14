import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { FAKE_CHL_PASSWORD } from '../../src/integrations/chl/fake/fake-identity-client.js';
import { authAttemptLimit } from '../../src/modules/auth/auth.routes.js';
import { MemoryPersistence } from '../support/memory-persistence.js';
import { testHarness } from '../support/app.js';

import type { Express } from 'express';

const agent = 'agent.one@example.test';

function login(app: Express, email: string, extra: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: FAKE_CHL_PASSWORD, ...extra });
}

describe('POST /api/v1/auth/login', () => {
  it('signs an agent in to the mobile app with the existing contract', async () => {
    const { app, persistence } = testHarness();
    const res = await login(app, 'Agent.One@Example.test');
    expect(res.status).toBe(200);
    expect(res.headers['x-iteime-fake-chl']).toBe('true');
    expect(res.body).toEqual({
      accessToken: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      refreshToken: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      accessTokenExpiresAt: expect.any(String),
      sessionExpiresAt: expect.any(String),
      agent: expect.objectContaining({
        id: 'FAKE-AG-0001',
        role: 'ENFORCEMENT_AGENT',
        scope: { level: 'lga', ref: 'FAKE-LGA-001', name: 'Fake LGA One' },
      }),
    });
    const session = [...(persistence as MemoryPersistence).sessionRows.values()][0]!;
    // Only hashes are stored, never the tokens themselves.
    expect(session.accessTokenHash).not.toBe(res.body.accessToken);
    expect(JSON.stringify(session)).not.toContain(res.body.refreshToken);
    expect((persistence as MemoryPersistence).events('auth.login').at(-1)).toMatchObject({
      outcome: 'success',
      actorId: 'FAKE-AG-0001',
    });
  });

  it('caps the session at 24 hours and the access token at 30 minutes', async () => {
    const now = new Date('2026-10-14T08:00:00.000Z');
    const { app } = testHarness({ now: () => now });
    const res = await login(app, agent);
    expect(res.body.sessionExpiresAt).toBe('2026-10-15T08:00:00.000Z');
    expect(res.body.accessTokenExpiresAt).toBe('2026-10-14T08:30:00.000Z');
  });

  it('answers wrong credentials with 401 and audits the failure without the password', async () => {
    const { app, persistence } = testHarness();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: agent, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    const memory = persistence as MemoryPersistence;
    expect(memory.sessionRows.size).toBe(0);
    const [event] = memory.events('auth.login');
    expect(event).toMatchObject({
      outcome: 'failure',
      actorType: 'anonymous',
      details: { reason: 'invalid_credentials', email: 'a***@example.test', client: 'mobile' },
    });
    expect(JSON.stringify(memory.auditRows)).not.toContain('wrong-password');
  });

  it('denies a deactivated account with 403 ACCOUNT_DEACTIVATED', async () => {
    const res = await login(testHarness().app, 'agent.deactivated@example.test');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
  });

  it('keeps non-agents out of the mobile app with AGENT_ACCESS_DENIED', async () => {
    const { app, persistence } = testHarness();
    const res = await login(app, 'supervisor@example.test');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AGENT_ACCESS_DENIED');
    expect((persistence as MemoryPersistence).events('auth.login')[0]?.outcome).toBe('denied');
  });

  it('denies an unrecognized CHL role everywhere', async () => {
    const { app } = testHarness();
    expect((await login(app, 'unknown.role@example.test')).body.error.code).toBe(
      'AGENT_ACCESS_DENIED',
    );
    expect(
      (await login(app, 'unknown.role@example.test', { client: 'monitoring' })).body.error.code,
    ).toBe('CLIENT_ACCESS_DENIED');
  });

  it('signs monitoring users in with a `user` profile', async () => {
    const res = await login(testHarness().app, 'admin@example.test', { client: 'monitoring' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ role: 'SYSTEM_ADMINISTRATOR' });
    expect(res.body.agent).toBeUndefined();
  });

  it('keeps agents out of the monitoring client', async () => {
    const res = await login(testHarness().app, agent, { client: 'monitoring' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CLIENT_ACCESS_DENIED');
  });

  it('reports a CHL outage as 503 CHL_UNAVAILABLE, never as wrong credentials', async () => {
    const { app, fake } = testHarness();
    fake.setUnavailable(true);
    const res = await login(app, agent);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('CHL_UNAVAILABLE');
  });

  it('validates the body', async () => {
    const { app } = testHarness();
    const missing = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('VALIDATION_ERROR');
    expect(missing.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual([
      'email',
      'password',
    ]);
    const extra = await login(app, agent, { role: 'SYSTEM_ADMINISTRATOR' });
    expect(extra.status).toBe(400);
  });

  it(`rate-limits sign-in attempts (${authAttemptLimit} per 15 minutes)`, async () => {
    const { app } = testHarness();
    for (let i = 0; i < authAttemptLimit; i++) {
      await request(app).post('/api/v1/auth/login').send({ email: agent, password: 'x' });
    }
    const res = await login(app, agent);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('writes no session and no success event when the audit write fails', async () => {
    const persistence = new MemoryPersistence();
    const { app } = testHarness({ persistence });
    // The session and its success event share a transaction.
    persistence.failNextAuditAppend = true;
    const res = await login(app, agent);
    expect(res.status).toBe(500);
    expect(persistence.sessionRows.size).toBe(0);
    expect(persistence.events('auth.login').filter((e) => e.outcome === 'success')).toEqual([]);
  });
});

describe('authenticated requests', () => {
  it('GET /me needs a token: missing is UNAUTHENTICATED, unknown is SESSION_EXPIRED', async () => {
    const { app } = testHarness();
    expect((await request(app).get('/api/v1/me')).body.error.code).toBe('UNAUTHENTICATED');
    const unknown = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${'x'.repeat(43)}`);
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.code).toBe('SESSION_EXPIRED');
    const malformed = await request(app).get('/api/v1/me').set('Authorization', 'Basic abc');
    expect(malformed.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('GET /me returns the signed-in user from the server-side session', async () => {
    const { app } = testHarness();
    const { body } = await login(app, agent);
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ user: { id: 'FAKE-AG-0001' }, client: 'mobile' });
  });

  it('rejects an expired access token', async () => {
    let now = new Date('2026-10-14T08:00:00.000Z');
    const { app } = testHarness({ now: () => now });
    const { body } = await login(app, agent);
    now = new Date('2026-10-14T08:31:00.000Z');
    const res = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${body.accessToken}`);
    expect(res.body.error.code).toBe('SESSION_EXPIRED');
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('rotates the tokens; the old refresh token stops working', async () => {
    const { app } = testHarness();
    const first = (await login(app, agent)).body;
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.refreshToken).not.toBe(first.refreshToken);
    expect(res.body.sessionExpiresAt).toBe(first.sessionExpiresAt);
    const reused = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.refreshToken });
    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('never extends a sign-in past its 24 hours', async () => {
    let now = new Date('2026-10-14T08:00:00.000Z');
    const { app } = testHarness({ now: () => now });
    const first = (await login(app, agent)).body;
    now = new Date('2026-10-15T07:50:00.000Z');
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.refreshToken });
    expect(res.body.accessTokenExpiresAt).toBe('2026-10-15T08:00:00.000Z');
    now = new Date('2026-10-15T08:00:01.000Z');
    const late = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: res.body.refreshToken });
    expect(late.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('refuses to refresh while CHL is down, but keeps the session (Q-CHL-3 decision)', async () => {
    const { app, fake } = testHarness();
    const first = (await login(app, agent)).body;
    fake.setUnavailable(true);
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.refreshToken });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('CHL_UNAVAILABLE');
    fake.setUnavailable(false);
    const retry = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.refreshToken });
    expect(retry.status).toBe(200);
  });

  it('ends every session of an account CHL has deactivated', async () => {
    const { app, fake, persistence } = testHarness();
    const phone = (await login(app, agent)).body;
    const tablet = (await login(app, agent)).body;
    fake.setStatus('FAKE-AG-0001', 'deactivated');
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: phone.refreshToken });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
    const other = await request(app)
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${tablet.accessToken}`);
    expect(other.body.error.code).toBe('SESSION_EXPIRED');
    expect((persistence as MemoryPersistence).events('auth.session.revoke')[0]).toMatchObject({
      actorType: 'system',
      details: { reason: 'account_deactivated', sessionsRevoked: 2 },
    });
  });

  it('treats an account CHL no longer has as deactivated', async () => {
    const { app, fake } = testHarness();
    const first = (await login(app, agent)).body;
    fake.remove('FAKE-AG-0001');
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.refreshToken });
    expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
  });
});

describe('logout and password reset', () => {
  it('POST /logout ends the session', async () => {
    const { app } = testHarness();
    const { body } = await login(app, agent);
    const auth = `Bearer ${body.accessToken}`;
    expect((await request(app).post('/api/v1/auth/logout').set('Authorization', auth)).status).toBe(
      204,
    );
    expect((await request(app).get('/api/v1/me').set('Authorization', auth)).status).toBe(401);
    const refresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: body.refreshToken });
    expect(refresh.status).toBe(401);
  });

  it('POST /forgot-password answers 202 whether or not the account exists', async () => {
    const { app, fake } = testHarness();
    const known = await request(app).post('/api/v1/auth/forgot-password').send({ email: agent });
    const unknown = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@example.test' });
    expect([known.status, unknown.status]).toEqual([202, 202]);
    expect(known.text).toBe(unknown.text);
    expect(fake.passwordResets).toEqual([agent]);
  });

  it('POST /forgot-password reports a CHL outage', async () => {
    const { app, fake } = testHarness();
    fake.setUnavailable(true);
    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: agent });
    expect(res.status).toBe(503);
  });
});
