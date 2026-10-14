import { describe, expect, it } from 'vitest';

import { checkReadiness } from '../../../src/modules/health/health.service.js';
import { silentLogger } from '../../support/app.js';

describe('checkReadiness', () => {
  it('is ready when every dependency is up', async () => {
    const report = await checkReadiness([{ name: 'a', check: async () => 'up' }], silentLogger);
    expect(report).toEqual({ status: 'ready', checks: { a: 'up' } });
  });

  it('is not ready when a dependency is not configured', async () => {
    const report = await checkReadiness(
      [{ name: 'database', check: async () => 'not_configured' }],
      silentLogger,
    );
    expect(report).toEqual({ status: 'not_ready', checks: { database: 'not_configured' } });
  });

  it('reports a failing dependency as down', async () => {
    const report = await checkReadiness(
      [
        { name: 'ok', check: async () => 'up' },
        { name: 'bad', check: () => Promise.reject(new Error('connection refused')) },
      ],
      silentLogger,
    );
    expect(report).toEqual({ status: 'not_ready', checks: { ok: 'up', bad: 'down' } });
  });

  it('reports a hanging dependency as down after the timeout', async () => {
    const report = await checkReadiness(
      [{ name: 'slow', check: () => new Promise(() => undefined) }],
      silentLogger,
      20,
    );
    expect(report.checks.slow).toBe('down');
  });
});
