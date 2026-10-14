import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config/env.js';

describe('loadConfig', () => {
  it('uses safe defaults: mock CHL, port 4000, no database', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      nodeEnv: 'development',
      port: 4000,
      logLevel: 'info',
      databaseUrl: undefined,
      chl: { adapter: 'mock', timeoutMs: 10_000, mockDelayMs: 0 },
    });
  });

  it('treats empty values as not set', () => {
    const config = loadConfig({ DATABASE_URL: '', CHL_BASE_URL: '  ', CHL_API_KEY: '' });
    expect(config.databaseUrl).toBeUndefined();
    expect(config.chl.baseUrl).toBeUndefined();
    expect(config.chl.apiKey).toBeUndefined();
  });

  it('reads the real CHL settings', () => {
    const config = loadConfig({
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
    expect(() => loadConfig({ CHL_ADAPTER: 'http' })).toThrow(/CHL_BASE_URL is required/);
  });

  it('rejects nonsense with a readable message', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/Invalid configuration: PORT/);
    expect(() => loadConfig({ CHL_ADAPTER: 'soap' })).toThrow(/CHL_ADAPTER/);
    expect(() => loadConfig({ CHL_BASE_URL: 'not a url' })).toThrow(/CHL_BASE_URL/);
  });
});
