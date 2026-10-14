import { Router } from 'express';

import type { Container } from '../container.js';
import { authRoutes, type LoginRateLimit } from '../modules/auth/auth.routes.js';
import { requireAgent } from '../modules/auth/require-agent.middleware.js';
import { dashboardRoutes } from '../modules/dashboard/dashboard.routes.js';
import { eTagRoutes } from '../modules/etags/etag.routes.js';
import { notificationRoutes } from '../modules/notifications/notification.routes.js';
import { referenceDataRoutes } from '../modules/reference-data/reference-data.routes.js';
import { verificationRoutes } from '../modules/verifications/verification.routes.js';

/**
 * The mobile API, version 1: each module's routes. Everything except
 * sign-in, refresh and forgot-password needs an access token (`signedIn`).
 */
export function apiV1Router(
  container: Container,
  options: { loginRateLimit?: LoginRateLimit },
): Router {
  const signedIn = requireAgent(container.auth);
  const router = Router();

  router.use(
    authRoutes({ auth: container.auth, signedIn, loginRateLimit: options.loginRateLimit }),
  );
  router.use(
    dashboardRoutes({
      dashboard: container.dashboard,
      notifications: container.notifications,
      signedIn,
    }),
  );
  router.use(
    verificationRoutes({ verifications: container.verifications, signedIn, now: container.now }),
  );
  router.use(eTagRoutes({ etags: container.etags, signedIn }));
  router.use(referenceDataRoutes({ chl: container.chl, signedIn }));
  router.use(notificationRoutes({ notifications: container.notifications, signedIn }));

  return router;
}
