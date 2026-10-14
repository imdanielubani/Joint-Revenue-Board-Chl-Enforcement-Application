import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../../src/app.js';
import { MockChlAdapter } from '../../../src/integrations/chl/mock/mock-adapter.js';
import type { Database } from '../../../src/database/pool.js';

const logger = pino({ level: 'silent' });

/** A stand-in database: these tests only need it to answer, or not. */
function database(up = true): Database {
  const fail = () => Promise.reject(new Error('not used in these tests'));
  return {
    query: fail,
    transaction: fail,
    ping: async () => {
      if (!up) throw new Error('connection refused');
    },
    close: async () => {},
  };
}

describe('health', () => {
  it('GET /health: the process is running', async () => {
    const app = createApp({ logger, chl: new MockChlAdapter(), database: database() });
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', environment: 'development' });
  });

  it('GET /health/ready: ready when CHL and the database answer', async () => {
    const app = createApp({ logger, chl: new MockChlAdapter(), database: database() });
    const response = await request(app).get('/health/ready');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ready',
      environment: 'development',
      checks: { chl: { adapter: 'mock', status: 'up' }, database: { status: 'up' } },
    });
  });

  it('not ready when CHL is down', async () => {
    const app = createApp({
      logger,
      chl: new MockChlAdapter({ available: false }),
      database: database(),
    });
    const response = await request(app).get('/health/ready');
    expect(response.status).toBe(503);
    expect(response.body.checks.chl).toMatchObject({ status: 'down' });
  });

  it('not ready when the database is down; ready when it answers', async () => {
    const chl = new MockChlAdapter();
    const down = await request(createApp({ logger, chl, database: database(false) })).get(
      '/health/ready',
    );
    expect(down.status).toBe(503);
    expect(down.body.checks.database).toEqual({ status: 'down', error: 'connection refused' });

    const up = await request(createApp({ logger, chl, database: database(true) })).get(
      '/health/ready',
    );
    expect(up.status).toBe(200);
    expect(up.body.checks.database).toEqual({ status: 'up' });
  });
});

describe('errors and request IDs', () => {
  const app = createApp({ logger, chl: new MockChlAdapter(), database: database() });

  it('an unknown route answers 404 in the JSON error format', async () => {
    const response = await request(app).get('/nope');
    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: 'ROUTE_NOT_FOUND',
      message: 'This route does not exist.',
    });
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
  });

  it("keeps the caller's request ID", async () => {
    const response = await request(app).get('/health').set('X-Request-Id', 'abc-123');
    expect(response.headers['x-request-id']).toBe('abc-123');
  });

  it('a body that is not JSON answers 400', async () => {
    const response = await request(app)
      .post('/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('sends security headers and hides the framework', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('CORS (browsers: the admin dashboards)', () => {
  const origin = 'https://dashboard.jrb.gov.ng';

  it('development allows any origin', async () => {
    const app = createApp({ logger, chl: new MockChlAdapter(), database: database() });
    const response = await request(app).get('/health').set('Origin', origin);
    expect(response.headers['access-control-allow-origin']).toBe(origin);
  });

  it('elsewhere, only the origins listed', async () => {
    const app = createApp({
      logger,
      chl: new MockChlAdapter(),
      database: database(),
      http: { appEnv: 'staging', trustProxy: 1, corsOrigins: [origin] },
    });
    const allowed = await request(app).get('/health').set('Origin', origin);
    expect(allowed.headers['access-control-allow-origin']).toBe(origin);
    expect(allowed.body.environment).toBe('staging');
    const other = await request(app).get('/health').set('Origin', 'https://evil.example');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });
});
