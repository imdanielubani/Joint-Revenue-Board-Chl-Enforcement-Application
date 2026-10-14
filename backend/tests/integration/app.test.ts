import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { testApp } from '../support/app.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('health endpoints', () => {
  it('GET /health/live answers without checking dependencies', async () => {
    const failing = { name: 'database', check: () => Promise.reject(new Error('down')) };
    const res = await request(testApp({ readinessChecks: [failing] })).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('GET /health/ready is 200 when dependencies are up', async () => {
    const res = await request(testApp()).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready', checks: { database: 'up' } });
  });

  it('GET /health/ready is 503 when the database is down, without leaking why', async () => {
    const down = { name: 'database', check: () => Promise.reject(new Error('ECONNREFUSED')) };
    const res = await request(testApp({ readinessChecks: [down] })).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'not_ready', checks: { database: 'down' } });
    expect(res.text).not.toContain('ECONNREFUSED');
  });

  it('GET /health/ready is 503 when the database is not configured', async () => {
    const missing = { name: 'database', check: async () => 'not_configured' as const };
    const res = await request(testApp({ readinessChecks: [missing] })).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.checks.database).toBe('not_configured');
  });
});

describe('request IDs', () => {
  it('generates one and returns it in the header', async () => {
    const res = await request(testApp()).get('/health/live');
    expect(res.headers['x-request-id']).toMatch(uuid);
  });

  it('echoes a well-formed ID from the caller', async () => {
    const res = await request(testApp()).get('/health/live').set('X-Request-ID', 'mobile-abc.123');
    expect(res.headers['x-request-id']).toBe('mobile-abc.123');
  });

  it('replaces a malformed ID from the caller', async () => {
    const res = await request(testApp())
      .get('/health/live')
      .set('X-Request-ID', '<script>alert(1)</script>');
    expect(res.headers['x-request-id']).toMatch(uuid);
  });
});

describe('unknown routes and bad requests', () => {
  it('answers unknown paths with the standard 404 body', async () => {
    const res = await request(testApp()).get('/api/v1/nothing-here');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource does not exist.',
        requestId: res.headers['x-request-id'],
      },
    });
  });

  it('answers malformed JSON with 400', async () => {
    const res = await request(testApp())
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .send('{"plate": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MALFORMED_JSON');
  });

  it('answers an oversized JSON body with 413', async () => {
    const res = await request(testApp())
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ notes: 'x'.repeat(200 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rate-limits API requests with the standard error body', async () => {
    const app = testApp({ rateLimitPerMinute: 2 });
    await request(app).get('/api/v1/x');
    await request(app).get('/api/v1/x');
    const res = await request(app).get('/api/v1/x');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('does not rate-limit health probes', async () => {
    const app = testApp({ rateLimitPerMinute: 1 });
    for (let i = 0; i < 3; i++) {
      expect((await request(app).get('/health/live')).status).toBe(200);
    }
  });
});

describe('security headers and CORS', () => {
  it('sets helmet headers and hides the framework', async () => {
    const res = await request(testApp()).get('/health/live');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows only configured origins', async () => {
    const app = testApp({ corsOrigins: ['https://dashboard.example'] });
    const allowed = await request(app)
      .get('/health/live')
      .set('Origin', 'https://dashboard.example');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://dashboard.example');
    const other = await request(app).get('/health/live').set('Origin', 'https://evil.example');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows no cross-origin access by default', async () => {
    const res = await request(testApp()).get('/health/live').set('Origin', 'https://a.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
