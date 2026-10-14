import { Router } from 'express';

/**
 * Everything under /api/v1. Module routers are mounted here as modules are
 * built (Phase 3 onwards); until then every /api/v1 path answers 404.
 */
export function apiV1Router(): Router {
  return Router();
}
