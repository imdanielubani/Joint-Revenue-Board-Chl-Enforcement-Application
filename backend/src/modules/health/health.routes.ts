import { Router } from 'express';

import { checkReadiness } from './health.service.js';

import type { DependencyCheck } from './health.types.js';

/**
 * Liveness: the process is up and serving HTTP. It never touches dependencies,
 * so a database outage doesn't make an orchestrator restart healthy processes.
 *
 * Readiness: every dependency is reachable. 503 otherwise.
 */
export function healthRouter(dependencies: DependencyCheck[], readinessTimeoutMs?: number): Router {
  const router = Router();

  router.get('/live', (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ status: 'ok' });
  });

  router.get('/ready', async (req, res) => {
    const report = await checkReadiness(dependencies, req.log, readinessTimeoutMs);
    res
      .status(report.status === 'ready' ? 200 : 503)
      .set('Cache-Control', 'no-store')
      .json(report);
  });

  return router;
}
