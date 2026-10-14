import { readFileSync } from 'node:fs';

import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { testApp } from '../support/app.js';

interface OpenApiDoc {
  openapi: string;
  paths: Record<string, Record<string, { responses: Record<string, unknown> }>>;
}

const spec = parse(readFileSync('docs/api/openapi.yaml', 'utf8')) as OpenApiDoc;

// Every implemented endpoint, and only those. Keep in step with the spec.
const implemented = ['GET /health/live', 'GET /health/ready'];

describe('docs/api/openapi.yaml', () => {
  it('is OpenAPI 3.1', () => {
    expect(spec.openapi).toMatch(/^3\.1\./);
  });

  it('documents exactly the implemented endpoints', () => {
    const documented = Object.entries(spec.paths).flatMap(([path, operations]) =>
      Object.keys(operations).map((method) => `${method.toUpperCase()} ${path}`),
    );
    expect(documented.sort()).toEqual([...implemented].sort());
  });

  it('documents the status codes the endpoints return', async () => {
    const ready = testApp();
    const notReady = testApp({
      readinessChecks: [{ name: 'database', check: async () => 'not_configured' }],
    });
    for (const app of [ready, notReady]) {
      for (const endpoint of implemented) {
        const [, path] = endpoint.split(' ') as [string, string];
        const res = await request(app).get(path);
        expect(Object.keys(spec.paths[path]!.get!.responses)).toContain(String(res.status));
      }
    }
  });
});
