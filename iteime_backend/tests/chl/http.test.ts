import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  ChlBadResponseError,
  ChlNotFoundError,
  ChlNotImplementedError,
  ChlSessionExpiredError,
  ChlUnavailableError,
} from '../../src/chl/errors.js';
import { ChlHttpClient } from '../../src/chl/http/chl-http-client.js';
import { HttpChlAdapter } from '../../src/chl/http/http-adapter.js';
import { createChlAdapter } from '../../src/chl/index.js';
import { MockChlAdapter } from '../../src/chl/mock/mock-adapter.js';

/** A stand-in CHL server: each path answers in its own way. */
let server: Server;
let baseUrl: string;
const seen: { url?: string; headers?: IncomingMessage['headers']; body?: string } = {};

function handle(request: IncomingMessage, response: ServerResponse) {
  let body = '';
  request.on('data', (chunk) => (body += chunk));
  request.on('end', () => {
    const path = new URL(request.url ?? '/', 'http://x').pathname;
    switch (path) {
      case '/api/echo':
        Object.assign(seen, { url: request.url, headers: request.headers, body });
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ ok: true }));
        return;
      case '/api/down':
        response.writeHead(503).end();
        return;
      case '/api/missing':
        response.writeHead(404).end();
        return;
      case '/api/expired':
        response.writeHead(401).end();
        return;
      case '/api/teapot':
        response.writeHead(418).end();
        return;
      case '/api/not-json':
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end('<html>');
        return;
      case '/api/empty':
        response.writeHead(204).end();
        return;
      case '/api/slow':
        setTimeout(() => response.writeHead(200).end('{}'), 500);
        return;
      default:
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end('{}');
    }
  });
}

beforeAll(async () => {
  server = createServer(handle);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function client(timeoutMs = 2_000) {
  return new ChlHttpClient({ baseUrl, apiKey: 'test-key', timeoutMs });
}

describe('ChlHttpClient', () => {
  it('sends JSON with the API key, the agent token and the query', async () => {
    const answer = await client().request<{ ok: boolean }>({
      method: 'POST',
      path: '/echo',
      query: { plate: 'ABC123AA', skipped: undefined },
      body: { hello: 'chl' },
      bearerToken: 'agent-token',
    });
    expect(answer).toEqual({ ok: true });
    expect(seen.url).toBe('/api/echo?plate=ABC123AA');
    expect(seen.headers?.['x-api-key']).toBe('test-key');
    expect(seen.headers?.authorization).toBe('Bearer agent-token');
    expect(seen.headers?.['content-type']).toBe('application/json');
    expect(JSON.parse(seen.body ?? '')).toEqual({ hello: 'chl' });
  });

  it('a 5xx means CHL is unavailable', async () => {
    await expect(client().request({ path: '/down' })).rejects.toBeInstanceOf(ChlUnavailableError);
  });

  it('no answer in time means CHL is unavailable', async () => {
    await expect(client(100).request({ path: '/slow' })).rejects.toBeInstanceOf(
      ChlUnavailableError,
    );
  });

  it('an unreachable CHL is unavailable', async () => {
    const unreachable = new ChlHttpClient({ baseUrl: 'http://127.0.0.1:1/api', timeoutMs: 2_000 });
    await expect(unreachable.request({ path: '/echo' })).rejects.toBeInstanceOf(
      ChlUnavailableError,
    );
  });

  it('maps 404, 401 and other 4xx answers', async () => {
    await expect(client().request({ path: '/missing' })).rejects.toBeInstanceOf(ChlNotFoundError);
    await expect(client().request({ path: '/expired' })).rejects.toBeInstanceOf(
      ChlSessionExpiredError,
    );
    await expect(client().request({ path: '/teapot' })).rejects.toBeInstanceOf(ChlBadResponseError);
  });

  it('a body that is not JSON is a bad response; 204 is empty', async () => {
    await expect(client().request({ path: '/not-json' })).rejects.toBeInstanceOf(
      ChlBadResponseError,
    );
    await expect(client().request({ path: '/empty' })).resolves.toBeUndefined();
  });
});

describe('HttpChlAdapter (waiting for the CHL documentation)', () => {
  const adapter = () => new HttpChlAdapter({ baseUrl, timeoutMs: 2_000 });

  it('says each call is not connected yet', async () => {
    await expect(adapter().signIn('a', 'b')).rejects.toBeInstanceOf(ChlNotImplementedError);
    await expect(
      adapter().verifyVehicle(
        { method: 'plate', plate: 'ABC123AA' },
        {
          agentId: 'a',
          at: new Date(),
          location: { latitude: 0, longitude: 0 },
        },
      ),
    ).rejects.toThrow(/waiting for the CHL API documentation/);
  });

  it('its health check passes when CHL answers, and fails when it cannot be reached', async () => {
    await expect(adapter().healthCheck()).resolves.toBeUndefined();
    const unreachable = new HttpChlAdapter({ baseUrl: 'http://127.0.0.1:1/api', timeoutMs: 2_000 });
    await expect(unreachable.healthCheck()).rejects.toBeInstanceOf(ChlUnavailableError);
  });
});

describe('createChlAdapter', () => {
  it('builds the adapter the settings ask for', () => {
    expect(createChlAdapter({ adapter: 'mock', timeoutMs: 1, mockDelayMs: 0 })).toBeInstanceOf(
      MockChlAdapter,
    );
    expect(
      createChlAdapter({ adapter: 'http', baseUrl, timeoutMs: 1, mockDelayMs: 0 }),
    ).toBeInstanceOf(HttpChlAdapter);
    expect(() => createChlAdapter({ adapter: 'http', timeoutMs: 1, mockDelayMs: 0 })).toThrow(
      /CHL_BASE_URL/,
    );
  });
});
