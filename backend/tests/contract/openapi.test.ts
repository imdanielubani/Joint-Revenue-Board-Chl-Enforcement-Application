import { readFileSync } from 'node:fs';

import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { FAKE_CHL_PASSWORD } from '../../src/integrations/chl/fake/fake-identity-client.js';
import { errorCodes } from '../../src/shared/errors/error-codes.js';
import { testHarness } from '../support/app.js';

interface OpenApiDoc {
  openapi: string;
  paths: Record<string, Record<string, { responses: Record<string, unknown> }>>;
  components: { schemas: { ErrorCode: { enum: string[] } } };
}

const spec = parse(readFileSync('docs/api/openapi.yaml', 'utf8')) as OpenApiDoc;

// Every implemented endpoint, and only those. Keep in step with the spec.
const implemented = [
  'GET /health/live',
  'GET /health/ready',
  'POST /api/v1/auth/login',
  'POST /api/v1/auth/refresh',
  'POST /api/v1/auth/logout',
  'POST /api/v1/auth/forgot-password',
  'GET /api/v1/me',
  'GET /api/v1/monitoring/audit-events',
];

function documented(method: string, path: string, status: number) {
  return Object.keys(spec.paths[path]?.[method]?.responses ?? {}).includes(String(status));
}

describe('docs/api/openapi.yaml', () => {
  it('is OpenAPI 3.1', () => {
    expect(spec.openapi).toMatch(/^3\.1\./);
  });

  it('documents exactly the implemented endpoints', () => {
    const listed = Object.entries(spec.paths).flatMap(([path, operations]) =>
      Object.keys(operations).map((method) => `${method.toUpperCase()} ${path}`),
    );
    expect(listed.sort()).toEqual([...implemented].sort());
  });

  it('lists exactly the error codes the server can return', () => {
    expect([...spec.components.schemas.ErrorCode.enum].sort()).toEqual(
      Object.keys(errorCodes).sort(),
    );
  });

  it('documents the status codes the endpoints actually return', async () => {
    const { app, fake } = testHarness();
    const signIn = (email: string, extra = {}) =>
      request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: FAKE_CHL_PASSWORD, ...extra });
    const agent = (await signIn('agent.one@example.test')).body;
    const admin = (await signIn('admin@example.test', { client: 'monitoring' })).body;
    const supervisor = (await signIn('supervisor@example.test', { client: 'monitoring' })).body;

    const observed: [string, string, () => Promise<{ status: number }>][] = [
      ['get', '/health/live', () => request(app).get('/health/live')],
      ['get', '/health/ready', () => request(app).get('/health/ready')],
      ['post', '/api/v1/auth/login', () => signIn('agent.one@example.test')],
      ['post', '/api/v1/auth/login', () => request(app).post('/api/v1/auth/login').send({})],
      ['post', '/api/v1/auth/login', () => signIn('agent.one@example.test', { password: 'wrong' })],
      ['post', '/api/v1/auth/login', () => signIn('agent.deactivated@example.test')],
      [
        'post',
        '/api/v1/auth/refresh',
        () => request(app).post('/api/v1/auth/refresh').send({ refreshToken: agent.refreshToken }),
      ],
      [
        'post',
        '/api/v1/auth/refresh',
        () =>
          request(app)
            .post('/api/v1/auth/refresh')
            .send({ refreshToken: 'x'.repeat(43) }),
      ],
      [
        'post',
        '/api/v1/auth/forgot-password',
        () => request(app).post('/api/v1/auth/forgot-password').send({ email: 'a@example.test' }),
      ],
      [
        'get',
        '/api/v1/me',
        () => request(app).get('/api/v1/me').set('Authorization', `Bearer ${admin.accessToken}`),
      ],
      ['get', '/api/v1/me', () => request(app).get('/api/v1/me')],
      [
        'get',
        '/api/v1/monitoring/audit-events',
        () =>
          request(app)
            .get('/api/v1/monitoring/audit-events')
            .set('Authorization', `Bearer ${admin.accessToken}`),
      ],
      [
        'get',
        '/api/v1/monitoring/audit-events',
        () =>
          request(app)
            .get('/api/v1/monitoring/audit-events?limit=0')
            .set('Authorization', `Bearer ${admin.accessToken}`),
      ],
      [
        'get',
        '/api/v1/monitoring/audit-events',
        () =>
          request(app)
            .get('/api/v1/monitoring/audit-events')
            .set('Authorization', `Bearer ${supervisor.accessToken}`),
      ],
      [
        'post',
        '/api/v1/auth/logout',
        () =>
          request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${admin.accessToken}`),
      ],
      ['post', '/api/v1/auth/logout', () => request(app).post('/api/v1/auth/logout')],
    ];
    for (const [method, path, call] of observed) {
      const { status } = await call();
      expect(documented(method, path, status), `${method.toUpperCase()} ${path} → ${status}`).toBe(
        true,
      );
    }

    fake.setUnavailable(true);
    const outage = await signIn('agent.one@example.test');
    expect(documented('post', '/api/v1/auth/login', outage.status)).toBe(true);
  });
});
