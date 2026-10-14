import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import { parse } from '../../http/validate.js';
import type { ETagService } from './etag.service.js';

/** GET /etags/:reference/receipt: the E-Tag receipt. */
export function eTagRoutes(dependencies: { etags: ETagService; signedIn: RequestHandler }): Router {
  const { etags, signedIn } = dependencies;
  const router = Router();

  router.get('/etags/:reference/receipt', signedIn, async (request, response) => {
    const reference = parse(z.string().trim().min(1).max(200), request.params.reference);
    response.json({ receipt: await etags.receipt(reference) });
  });

  return router;
}
