import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChlUnavailableError } from '../../src/chl/errors.js';
import { MOCK_PASSWORD } from '../../src/chl/mock/mock-data.js';
import type { Database } from '../../src/db/pool.js';
import {
  buildApp,
  emptyTables,
  openTestDatabase,
  recreateSchema,
  signIn,
  testDatabaseUrl,
} from '../support/harness.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

describe.skipIf(!testDatabaseUrl)('auth API', () => {
  let database: Database;

  beforeAll(async () => {
    database = openTestDatabase();
    await recreateSchema(database);
  });
  beforeEach(async () => {
    await emptyTables(database);
  });
  afterAll(async () => {
    await database.close();
  });

  async function auditOutcomes(action: string): Promise<string[]> {
    const { rows } = await database.query<{ outcome: string }>(
      'SELECT outcome FROM audit_events WHERE action = $1 ORDER BY id',
      [action],
    );
    return rows.map((row) => row.outcome);
  }

  describe('POST /api/v1/auth/login', () => {
    it('signs in an enforcement agent with tokens and their profile', async () => {
      const { app, clock } = buildApp(database);
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'officer@jbr.com', password: MOCK_PASSWORD, device: { model: 'Pixel 8' } });

      expect(response.status).toBe(200);
      expect(response.body.agent).toMatchObject({
        id: 'JRB-AG-0142',
        name: 'Demo Officer',
        email: 'officer@jbr.com',
        role: 'ENFORCEMENT_AGENT',
      });
      const { accessToken, refreshToken, accessTokenExpiresAt, sessionExpiresAt } = response.body;
      expect(accessToken).toMatch(/^[\w-]{43}$/);
      expect(refreshToken).toMatch(/^[\w-]{43}$/);
      expect(Date.parse(accessTokenExpiresAt) - clock.time.getTime()).toBe(30 * MINUTE);
      expect(Date.parse(sessionExpiresAt) - clock.time.getTime()).toBe(24 * HOUR);
      expect(await auditOutcomes('auth.login')).toEqual(['success']);
    });

    it('stores only hashes of the tokens', async () => {
      const { app } = buildApp(database);
      const { accessToken, refreshToken } = await signIn(app);
      const { rows } = await database.query(
        `SELECT 1 FROM agent_sessions
         WHERE access_token_hash IN ($1, $2) OR refresh_token_hash IN ($1, $2)`,
        [accessToken, refreshToken],
      );
      expect(rows).toHaveLength(0);
    });

    it('refuses wrong credentials, deactivated accounts and non-agents', async () => {
      const { app } = buildApp(database);
      const login = (email: string, password = MOCK_PASSWORD) =>
        request(app).post('/api/v1/auth/login').send({ email, password });

      const wrong = await login('officer@jbr.com', 'nope');
      expect(wrong.status).toBe(401);
      expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');

      const deactivated = await login('deactivated@jbr.com');
      expect(deactivated.status).toBe(403);
      expect(deactivated.body.error.code).toBe('ACCOUNT_DEACTIVATED');

      const clerk = await login('clerk@jbr.com');
      expect(clerk.status).toBe(403);
      expect(clerk.body.error).toMatchObject({
        code: 'AGENT_ACCESS_DENIED',
        message: 'Only enforcement agents can use the mobile app.',
      });

      expect(await auditOutcomes('auth.login')).toEqual([
        'invalidCredentials',
        'accountDeactivated',
        'notAnAgent',
      ]);
      const { rows } = await database.query('SELECT 1 FROM agent_sessions');
      expect(rows).toHaveLength(0);
    });

    it('checks the fields', async () => {
      const { app } = buildApp(database);
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: '' });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.map((issue: { field: string }) => issue.field)).toEqual([
        'email',
        'password',
      ]);
    });

    it('slows down password guessing', async () => {
      const { app } = buildApp(database, { loginRateLimit: { windowMs: 60_000, limit: 2 } });
      const attempt = () =>
        request(app).post('/api/v1/auth/login').send({ email: 'officer@jbr.com', password: 'x' });
      expect((await attempt()).status).toBe(401);
      expect((await attempt()).status).toBe(401);
      const blocked = await attempt();
      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe('TOO_MANY_ATTEMPTS');
    });
  });

  describe('signed-in requests', () => {
    it('need a valid access token', async () => {
      const { app } = buildApp(database);
      const none = await request(app).get('/api/v1/me');
      expect(none.status).toBe(401);
      expect(none.body.error.code).toBe('UNAUTHENTICATED');

      const made = await request(app).get('/api/v1/me').auth('made-up', { type: 'bearer' });
      expect(made.status).toBe(401);
      expect(made.body.error.code).toBe('SESSION_EXPIRED');

      const { accessToken } = await signIn(app);
      const me = await request(app).get('/api/v1/me').auth(accessToken, { type: 'bearer' });
      expect(me.status).toBe(200);
      expect(me.body.agent.id).toBe('JRB-AG-0142');
    });

    it('an access token lasts 30 minutes; refreshing replaces both tokens', async () => {
      const { app, clock } = buildApp(database);
      const first = await signIn(app);
      clock.advance(31 * MINUTE);
      const expired = await request(app)
        .get('/api/v1/me')
        .auth(first.accessToken, { type: 'bearer' });
      expect(expired.status).toBe(401);

      const refreshed = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: first.refreshToken });
      expect(refreshed.status).toBe(200);
      expect(refreshed.body.refreshToken).not.toBe(first.refreshToken);
      const me = await request(app)
        .get('/api/v1/me')
        .auth(refreshed.body.accessToken, { type: 'bearer' });
      expect(me.status).toBe(200);

      const reused = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: first.refreshToken });
      expect(reused.status).toBe(401);
      expect(reused.body.error.code).toBe('SESSION_EXPIRED');
    });

    it('a sign-in ends after 24 hours, whatever is refreshed', async () => {
      const { app, clock } = buildApp(database);
      let tokens = await signIn(app);
      for (let i = 0; i < 4; i += 1) {
        clock.advance(6 * HOUR - MINUTE);
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: tokens.refreshToken });
        expect(response.status).toBe(200);
        tokens = response.body;
      }
      clock.advance(10 * MINUTE);
      const late = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });
      expect(late.status).toBe(401);
    });

    it('refreshing ends every session of an account CHL has deactivated', async () => {
      const { app, chl } = buildApp(database);
      const phone = await signIn(app);
      const tablet = await signIn(app);
      vi.spyOn(chl, 'getAccountStatus').mockResolvedValue('deactivated');

      const refused = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: phone.refreshToken });
      expect(refused.status).toBe(403);
      expect(refused.body.error.code).toBe('ACCOUNT_DEACTIVATED');

      const other = await request(app)
        .get('/api/v1/me')
        .auth(tablet.accessToken, { type: 'bearer' });
      expect(other.status).toBe(401);
    });

    it('refreshing still works when CHL cannot be asked about the account', async () => {
      const { app, chl } = buildApp(database);
      const tokens = await signIn(app);
      vi.spyOn(chl, 'getAccountStatus').mockRejectedValue(new ChlUnavailableError());
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });
      expect(response.status).toBe(200);
    });

    it('signing out ends the session', async () => {
      const { app } = buildApp(database);
      const { accessToken, refreshToken } = await signIn(app);
      const out = await request(app)
        .post('/api/v1/auth/logout')
        .auth(accessToken, { type: 'bearer' });
      expect(out.status).toBe(204);
      expect(
        (await request(app).get('/api/v1/me').auth(accessToken, { type: 'bearer' })).status,
      ).toBe(401);
      expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken })).status).toBe(
        401,
      );
      expect(await auditOutcomes('auth.logout')).toEqual(['success']);
    });
  });

  it('forgot password answers the same for any email', async () => {
    const { app, chl } = buildApp(database);
    for (const email of ['officer@jbr.com', 'nobody@jbr.com']) {
      const response = await request(app).post('/api/v1/auth/forgot-password').send({ email });
      expect(response.status).toBe(202);
      expect(response.body.message).toMatch(/If an account exists/);
    }
    expect(chl.passwordResets).toEqual(['officer@jbr.com', 'nobody@jbr.com']);
  });
});
