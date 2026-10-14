import { Router, type RequestHandler } from 'express';

import { sessionOf } from '../auth/require-agent.middleware.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { DashboardService } from './dashboard.service.js';

/** GET /dashboard: today's figures, recent verifications, unread notifications. */
export function dashboardRoutes(dependencies: {
  dashboard: DashboardService;
  notifications: NotificationService;
  signedIn: RequestHandler;
}): Router {
  const { dashboard, notifications, signedIn } = dependencies;
  const router = Router();

  router.get('/dashboard', signedIn, async (_request, response) => {
    const session = sessionOf(response);
    const [summary, unreadNotifications] = await Promise.all([
      dashboard.summary(session),
      notifications.unreadCount(session.agentId),
    ]);
    response.json({ ...summary, unreadNotifications });
  });

  return router;
}
