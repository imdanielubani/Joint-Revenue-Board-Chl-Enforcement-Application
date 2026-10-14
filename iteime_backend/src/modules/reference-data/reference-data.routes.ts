import { Router, type RequestHandler } from 'express';

import type { ChlAdapter } from '../../integrations/chl/adapter.js';

/** GET /reference-data: states, LGAs, vehicle types and enforcement points, from CHL. */
export function referenceDataRoutes(dependencies: {
  chl: ChlAdapter;
  signedIn: RequestHandler;
}): Router {
  const { chl, signedIn } = dependencies;
  const router = Router();

  router.get('/reference-data', signedIn, async (_request, response) => {
    response.json(await chl.getReferenceData());
  });

  return router;
}
