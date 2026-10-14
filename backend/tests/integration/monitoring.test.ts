import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { FAKE_CHL_PASSWORD } from '../../src/integrations/chl/fake/fake-identity-client.js';
import { testHarness } from '../support/app.js';

import type { MemoryPersistence } from '../support/memory-persistence.js';
import type { Express } from 'express';

async function token(app: Express, email: string, client: 'mobile' | 'monitoring') {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: FAKE_CHL_PASSWORD, ...(client === 'monitoring' ? { client } : {}) });
  expect(res.status).toBe(200);
  return `Bearer ${res.body.accessToken as string}`;
}

const path = '/api/v1/monitoring/audit-events';

describe('monitoring surface: GET /api/v1/monitoring/audit-events', () => {
  it('requires a session', async () => {
    const res = await request(testHarness().app).get(path);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('refuses mobile sessions, even valid ones', async () => {
    const { app } = testHarness();
    const res = await request(app)
      .get(path)
      .set('Authorization', await token(app, 'agent.one@example.test', 'mobile'));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CLIENT_ACCESS_DENIED');
  });

  it('refuses a supervisor (no audit permission yet, Q-ROL-5) and audits the denial', async () => {
    const { app, persistence } = testHarness();
    const res = await request(app)
      .get(path)
      .set('Authorization', await token(app, 'supervisor@example.test', 'monitoring'));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect((persistence as MemoryPersistence).events('access.denied')[0]).toMatchObject({
      actorId: 'FAKE-SU-0001',
      outcome: 'denied',
      details: { permission: 'audit:read:all', method: 'GET' },
    });
  });

  it('gives the System Administrator the audit trail, newest first, and audits the read', async () => {
    const { app, persistence } = testHarness();
    const admin = await token(app, 'admin@example.test', 'monitoring');
    const res = await request(app).get(path).set('Authorization', admin);
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({
      action: 'auth.login',
      outcome: 'success',
      actor: { type: 'principal', id: 'FAKE-SA-0001', role: 'SYSTEM_ADMINISTRATOR' },
      target: { type: 'session', id: expect.any(String) },
    });
    expect(res.body.items[0].actorId).toBeUndefined(); // an API view, not the database row
    expect((persistence as MemoryPersistence).events('audit.read')).toHaveLength(1);
  });

  it('filters and validates its query', async () => {
    const { app } = testHarness();
    await request(app).post('/api/v1/auth/login').send({ email: 'x@example.test', password: 'no' });
    const admin = await token(app, 'admin@example.test', 'monitoring');
    const failures = await request(app).get(`${path}?outcome=failure`).set('Authorization', admin);
    expect(failures.body.items.every((e: { outcome: string }) => e.outcome === 'failure')).toBe(
      true,
    );
    expect(failures.body.items.length).toBeGreaterThan(0);
    const bad = await request(app).get(`${path}?limit=500&cursor=%%%`).set('Authorization', admin);
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    const unknown = await request(app).get(`${path}?role=x`).set('Authorization', admin);
    expect(unknown.status).toBe(400);
  });

  it('is read-only: writes are refused before anything else, even signed in', async () => {
    const { app } = testHarness();
    const admin = await token(app, 'admin@example.test', 'monitoring');
    for (const method of ['post', 'put', 'patch', 'delete'] as const) {
      const anonymous = await request(app)[method](path);
      expect(anonymous.status).toBe(405);
      const signedIn = await request(app)[method](path).set('Authorization', admin);
      expect(signedIn.status).toBe(405);
      expect(signedIn.body.error.code).toBe('METHOD_NOT_ALLOWED');
    }
  });
});
