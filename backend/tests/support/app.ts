import { pino } from 'pino';

import { createApp } from '../../src/app.js';

import type { DependencyCheck } from '../../src/modules/health/health.types.js';

export const silentLogger = pino({ level: 'silent' });

export const upCheck = (name = 'database'): DependencyCheck => ({ name, check: async () => 'up' });

export function testApp(
  options: {
    readinessChecks?: DependencyCheck[];
    corsOrigins?: string[];
    rateLimitPerMinute?: number;
  } = {},
) {
  return createApp({
    config: {
      corsOrigins: options.corsOrigins ?? [],
      trustProxy: false,
      rateLimitPerMinute: options.rateLimitPerMinute ?? 1000,
    },
    logger: silentLogger,
    readinessChecks: options.readinessChecks ?? [upCheck()],
    readinessTimeoutMs: 200,
  });
}
