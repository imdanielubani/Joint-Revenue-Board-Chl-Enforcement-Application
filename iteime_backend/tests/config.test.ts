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

  describe('deployments (APP_ENV)', () => {
    const production = { DATABASE_URL, NODE_ENV: 'production' };

    it('development by default: any browser origin, private-network proxies', () => {
      expect(loadConfig({ DATABASE_URL })).toMatchObject({
        appEnv: 'development',
        corsOrigins: '*',
        trustProxy: 'loopback, linklocal, uniquelocal',
      });
    });

    it('staging may use the sample CHL; no browser origins unless listed', () => {
      expect(loadConfig({ ...production, APP_ENV: 'staging' })).toMatchObject({
        appEnv: 'staging',
        corsOrigins: [],
        chl: { adapter: 'mock' },
      });
    });

    it('staging and production run with NODE_ENV=production', () => {
      expect(() => loadConfig({ DATABASE_URL, APP_ENV: 'staging' })).toThrow(
        /NODE_ENV must be production when APP_ENV=staging/,
      );
    });

    it('production never uses the sample CHL', () => {
      expect(() => loadConfig({ ...production, APP_ENV: 'production' })).toThrow(
        /CHL_ADAPTER must be http when APP_ENV=production/,
      );
      const config = loadConfig({
        ...production,
        APP_ENV: 'production',
        CHL_ADAPTER: 'http',
        CHL_BASE_URL: 'https://chl.example.gov.ng/api',
      });
      expect(config.appEnv).toBe('production');
    });

    it('reads proxy hops and origin lists', () => {
      const config = loadConfig({
        ...production,
        APP_ENV: 'staging',
        TRUST_PROXY: '1',
        CORS_ORIGINS: 'https://a.jrb.gov.ng, https://b.jrb.gov.ng',
      });
      expect(config.trustProxy).toBe(1);
      expect(config.corsOrigins).toEqual(['https://a.jrb.gov.ng', 'https://b.jrb.gov.ng']);
      expect(loadConfig({ DATABASE_URL, TRUST_PROXY: 'false' }).trustProxy).toBe(false);
    });
  });

  it('rejects nonsense with a readable message', () => {
    expect(() => loadConfig({ DATABASE_URL, PORT: 'abc' })).toThrow(/Invalid configuration: PORT/);
    expect(() => loadConfig({ DATABASE_URL, CHL_ADAPTER: 'soap' })).toThrow(/CHL_ADAPTER/);
    expect(() => loadConfig({ DATABASE_URL, CHL_BASE_URL: 'not a url' })).toThrow(/CHL_BASE_URL/);
  });
});
