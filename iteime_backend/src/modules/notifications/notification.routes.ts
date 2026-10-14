import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import { parse } from '../../http/validate.js';
import { sessionOf } from '../auth/require-agent.middleware.js';
import type { NotificationService } from './notification.service.js';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(200).optional(),
});

/** /notifications: the inbox, the unread count and read receipts. */
export function notificationRoutes(dependencies: {
  notifications: NotificationService;
  signedIn: RequestHandler;
}): Router {
  const { notifications, signedIn } = dependencies;
  const router = Router();
  router.use('/notifications', signedIn);

  router.get('/notifications', async (request, response) => {
    const query = parse(listQuerySchema, request.query);
    response.json(await notifications.list(sessionOf(response).agentId, query));
  });

  router.get('/notifications/unread-count', async (_request, response) => {
    response.json({ unread: await notifications.unreadCount(sessionOf(response).agentId) });
  });

  router.post('/notifications/read-all', async (_request, response) => {
    response.json({ marked: await notifications.markAllRead(sessionOf(response).agentId) });
  });

  router.post('/notifications/:id/read', async (request, response) => {
    await notifications.markRead(sessionOf(response).agentId, request.params.id as string);
    response.status(204).end();
  });

  return router;
}
