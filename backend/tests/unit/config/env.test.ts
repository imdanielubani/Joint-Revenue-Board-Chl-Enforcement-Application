import { describe, expect, it } from 'vitest';

import { ConfigError, parseConfig } from '../../../src/config/env.js';

describe('parseConfig', () => {
  it('applies defaults when nothing is set', () => {
    expect(parseConfig({})).toEqual({
      nodeEnv: 'development',
      port: 4000,
      logLevel: 'info',
      databaseUrl: undefined,
      corsOrigins: [],
      trustProxy: false,
      rateLimitPerMinute: 300,
      chl: { baseUrl: undefined, timeoutMs: 10_000 },
    });
  });

  it('treats empty strings as unset', () => {
    const config = parseConfig({ DATABASE_URL: '', CHL_BASE_URL: ' ' });
    expect(config.databaseUrl).toBeUndefined();
    expect(config.chl.baseUrl).toBeUndefined();
  });

  it('parses lists and proxy settings', () => {
    const config = parseConfig({
      CORS_ORIGINS: 'https://a.example, https://b.example',
      TRUST_PROXY: '1',
    });
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
    expect(config.trustProxy).toBe(1);
  });

  it('requires DATABASE_URL in production', () => {
    expect(() => parseConfig({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL/);
  });

  it('requires https for CHL in production', () => {
    expect(() =>
      parseConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://u:p@db/x',
        CHL_BASE_URL: 'http://chl.example',
      }),
    ).toThrow(/CHL_BASE_URL/);
  });

  it('rejects invalid values and a wildcard CORS origin', () => {
    expect(() => parseConfig({ PORT: 'abc' })).toThrow(ConfigError);
    expect(() => parseConfig({ TRUST_PROXY: 'maybe' })).toThrow(/TRUST_PROXY/);
    expect(() => parseConfig({ CORS_ORIGINS: '*' })).toThrow(/CORS_ORIGINS/);
    expect(() => parseConfig({ DATABASE_URL: 'mysql://x' })).toThrow(/DATABASE_URL/);
  });

  it('never includes secret values in its error message', () => {
    const secret = 'not-postgres://user:S3cr3t@host/db';
    expect(() => parseConfig({ DATABASE_URL: secret })).toThrow(ConfigError);
    try {
      parseConfig({ DATABASE_URL: secret });
    } catch (err) {
      expect((err as Error).message).toContain('DATABASE_URL');
      expect((err as Error).message).not.toContain('S3cr3t');
    }
  });
});
