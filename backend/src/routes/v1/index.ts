import { Router } from 'express';

import { readOnly, requireClient } from '../../modules/access-control/access-control.middleware.js';
import { auditRouter } from '../../modules/audit/audit.routes.js';
import { authenticate } from '../../modules/auth/auth.middleware.js';
import { authRouter, meRouter } from '../../modules/auth/auth.routes.js';

import type { AuditService } from '../../modules/audit/audit.service.js';
import type { AuthService } from '../../modules/auth/auth.service.js';

export interface ApiServices {
  auth: AuthService;
  audit: AuditService;
}

/**
 * Everything under /api/v1.
 *
 * Surfaces (ADR-0005, ADR-0008):
 * - shared: `/auth/*` and `/me`;
 * - monitoring: `/monitoring/*`, read-only, monitoring sessions only;
 * - mobile: the app's paths (ADR-0009). None are implemented yet; each will
 *   use `requireClient('mobile')`;
 * - admin: not started; its roles are undefined (Q-ROL-1).
 */
export function apiV1Router({ auth, audit }: ApiServices): Router {
  const router = Router();
  router.use('/auth', authRouter(auth));
  router.use('/me', meRouter(auth));

  const monitoring = Router();
  monitoring.use(readOnly, authenticate(auth), requireClient('monitoring'));
  monitoring.use('/audit-events', auditRouter(audit));
  router.use('/monitoring', monitoring);

  return router;
}
