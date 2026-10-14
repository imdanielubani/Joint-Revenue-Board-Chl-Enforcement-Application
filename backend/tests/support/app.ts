import { pino } from 'pino';

import { createApp } from '../../src/app.js';
import { guardIdentityClient } from '../../src/integrations/chl/chl.guard.js';
import { FakeIdentityClient } from '../../src/integrations/chl/fake/fake-identity-client.js';
import { AuditService } from '../../src/modules/audit/audit.service.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { MemoryPersistence } from './memory-persistence.js';

import type { Persistence } from '../../src/database/persistence.js';
import type { DependencyCheck } from '../../src/modules/health/health.types.js';

export const silentLogger = pino({ level: 'silent' });

export const upCheck = (name = 'database'): DependencyCheck => ({ name, check: async () => 'up' });

export interface HarnessOptions {
  readinessChecks?: DependencyCheck[];
  corsOrigins?: string[];
  rateLimitPerMinute?: number;
  persistence?: Persistence;
  now?: () => Date;
}

/**
 * The real app wired to test doubles: the labelled FAKE CHL identity provider
 * and in-memory persistence (or a real database, when passed in).
 */
export function testHarness(options: HarnessOptions = {}) {
  const fake = new FakeIdentityClient();
  const identity = guardIdentityClient(fake, { timeoutMs: 500, logger: silentLogger });
  const persistence = options.persistence ?? new MemoryPersistence();
  const audit = new AuditService(persistence.audit);
  const auth = new AuthService(
    identity,
    persistence,
    audit,
    { accessTokenTtlMinutes: 30, sessionTtlHours: 24 },
    options.now,
  );
  const app = createApp({
    config: {
      corsOrigins: options.corsOrigins ?? [],
      trustProxy: false,
      rateLimitPerMinute: options.rateLimitPerMinute ?? 1000,
    },
    logger: silentLogger,
    readinessChecks: options.readinessChecks ?? [upCheck()],
    readinessTimeoutMs: 200,
    services: { auth, audit },
    chlIdentityKind: identity.kind,
  });
  return { app, fake, persistence, audit, auth };
}

/** Just the app, for tests that don't need the doubles. */
export function testApp(options: HarnessOptions = {}) {
  return testHarness(options).app;
}
