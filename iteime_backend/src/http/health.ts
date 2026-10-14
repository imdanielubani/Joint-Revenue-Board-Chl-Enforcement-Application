import { Router } from 'express';

import type { ChlAdapter } from '../chl/adapter.js';
import type { Database } from '../db/pool.js';

type CheckResult =
  { status: 'up' } | { status: 'down'; error: string } | { status: 'notConfigured' };

/**
 * GET /health: the process is running (for load balancers).
 * GET /health/ready: the backend can serve requests: CHL answers and the
 * database (when configured) answers. 503 when either is down.
 */
export function healthRouter(dependencies: { chl: ChlAdapter; database?: Database }): Router {
  const router = Router();

  router.get('/', (_request, response) => {
    response.json({ status: 'ok' });
  });

  router.get('/ready', async (_request, response) => {
    const { chl: adapter, database: db } = dependencies;
    const [chl, database] = await Promise.all([
      check(() => adapter.healthCheck()),
      db ? check(() => db.ping()) : Promise.resolve<CheckResult>({ status: 'notConfigured' }),
    ]);
    const ready = chl.status === 'up' && database.status !== 'down';
    response.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'notReady',
      checks: { chl: { adapter: dependencies.chl.name, ...chl }, database },
    });
  });

  return router;
}

async function check(probe: () => Promise<void>): Promise<CheckResult> {
  try {
    await probe();
    return { status: 'up' };
  } catch (error) {
    return { status: 'down', error: error instanceof Error ? error.message : String(error) };
  }
}
