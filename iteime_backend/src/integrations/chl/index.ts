import type { Config } from '../../config/env.js';
import type { ChlAdapter } from './adapter.js';
import { HttpChlAdapter } from './http/http-adapter.js';
import { MockChlAdapter } from './mock/mock-adapter.js';

export type { ChlAdapter } from './adapter.js';
export * from './errors.js';
export type * from './types.js';

/** The CHL adapter the settings ask for (CHL_ADAPTER). */
export function createChlAdapter(config: Config['chl']): ChlAdapter {
  switch (config.adapter) {
    case 'mock':
      return new MockChlAdapter({ delayMs: config.mockDelayMs });
    case 'http':
      if (!config.baseUrl) throw new Error('CHL_BASE_URL is required when CHL_ADAPTER=http');
      return new HttpChlAdapter({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        timeoutMs: config.timeoutMs,
      });
  }
}
