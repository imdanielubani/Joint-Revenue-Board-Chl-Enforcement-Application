import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config/env.js';

const DATABASE_URL = 'postgresql://user:pass@localhost:5432/iteimedb';

describe('loadConfig', () => {
  it('uses safe defaults: mock CHL, port 4000, 30-minute tokens, 24-hour sessions', () => {
    const config = loadConfig({ DATABASE_URL });
    expect(config).toMatchObject({
      nodeEnv: 'development',
      port: 4000,
      logLevel: 'info',
      databaseUrl: DATABASE_URL,
      session: { accessTokenTtlMinutes: 30, sessionTtlHours: 24 },
      chl: { adapter: 'mock', timeoutMs: 10_000, mockDelayMs: 0 },
    });
  });

  it('needs a database', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL is required/);
    expect(() => loadConfig({ DATABASE_URL: '  ' })).toThrow(/DATABASE_URL is required/);
  });

  it('treats empty values as not set', () => {
    const config = loadConfig({ DATABASE_URL, CHL_BASE_URL: '  ', CHL_API_KEY: '' });
    expect(config.chl.baseUrl).toBeUndefined();
    expect(config.chl.apiKey).toBeUndefined();
  });

  it('reads the real CHL settings', () => {
    const config = loadConfig({
      DATABASE_URL,
      CHL_ADAPTER: 'http',
      CHL_BASE_URL: 'https://chl.example.gov.ng/api',
      CHL_API_KEY: 'secret',
      CHL_TIMEOUT_MS: '5000',
      PORT: '8080',
    });
    expect(config.port).toBe(8080);
    expect(config.chl).toMatchObject({
      adapter: 'http',
      baseUrl: 'https://chl.example.gov.ng/api',
      apiKey: 'secret',
      timeoutMs: 5000,
    });
  });

  it('needs a CHL address to use the real CHL', () => {
    expect(() => loadConfig({ DATABASE_URL, CHL_ADAPTER: 'http' })).toThrow(
      /CHL_BASE_URL is required/,
    );
  });

  it('keeps sessions within 24 hours (SRD §5.3)', () => {
    expect(() => loadConfig({ DATABASE_URL, SESSION_TTL_HOURS: '48' })).toThrow(
      /SESSION_TTL_HOURS/,
    );
  });

  it('rejects nonsense with a readable message', () => {
    expect(() => loadConfig({ DATABASE_URL, PORT: 'abc' })).toThrow(/Invalid configuration: PORT/);
    expect(() => loadConfig({ DATABASE_URL, CHL_ADAPTER: 'soap' })).toThrow(/CHL_ADAPTER/);
    expect(() => loadConfig({ DATABASE_URL, CHL_BASE_URL: 'not a url' })).toThrow(/CHL_BASE_URL/);
  });
});
