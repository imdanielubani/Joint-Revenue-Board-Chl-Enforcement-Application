import { Router } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import type { ChlAdapter } from '../chl/adapter.js';
import type { Database } from '../db/pool.js';
import { AppError } from '../lib/errors.js';
import {
  countUnread,
  listNotifications,
  markAllRead,
  markRead,
  type Notification,
} from '../repositories/notifications.js';
import type { AuthService } from '../services/auth-service.js';
import {
  decodeCursor,
  encodeCursor,
  isUuid,
  type VerificationService,
} from '../services/verification-service.js';
import { metaOf, requireAgent, sessionOf } from './authenticate.js';
import { deviceSchema, geoPointSchema, parse } from './validate.js';

export interface ApiDependencies {
  auth: AuthService;
  verifications: VerificationService;
  chl: ChlAdapter;
  database: Database;
  now: () => Date;
  /** Sign-in attempts allowed per IP address and email in each window. */
  loginRateLimit?: { windowMs: number; limit: number };
}

const emailSchema = z.string().trim().max(254).pipe(z.email('Enter a valid email address.'));

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(200),
  device: deviceSchema,
});

const verifySchema = z.object({
  method: z.enum(['plate', 'qrCode', 'eTag', 'rfid']),
  plate: z.string().max(50).optional(),
  reference: z.string().max(200).optional(),
  tagReference: z.string().max(200).optional(),
  location: geoPointSchema,
  /** Set only for a check made offline and sent later. */
  capturedAt: z.iso.datetime({ offset: true }).optional(),
  offline: z.boolean().optional(),
  device: deviceSchema,
});

const historySchema = z.object({
  period: z.enum(['30d', 'all']).default('30d'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(200).optional(),
});

/** A check made offline may be sent up to 7 days later (SRD §26). */
const OFFLINE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Phone clocks drift; allow this much "future". */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

/** The mobile API, version 1. Everything but sign-in needs an access token. */
export function apiV1Router(dependencies: ApiDependencies): Router {
  const { auth, verifications, chl, database, now } = dependencies;
  const router = Router();
  const signedIn = requireAgent(auth);

  // ---------------------------------------------------------------- Auth

  const loginLimit = dependencies.loginRateLimit ?? { windowMs: 15 * 60 * 1000, limit: 10 };
  const loginLimiter = rateLimit({
    windowMs: loginLimit.windowMs,
    limit: loginLimit.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (request) => {
      const email = String((request.body as { email?: unknown } | undefined)?.email ?? '');
      return `${ipKeyGenerator(request.ip ?? '')}|${email.trim().toLowerCase()}`;
    },
    handler: (_request, _response, next) => {
      next(
        new AppError(
          429,
          'TOO_MANY_ATTEMPTS',
          'Too many sign-in attempts. Please wait a few minutes and try again.',
        ),
      );
    },
  });

  router.post('/auth/login', loginLimiter, async (request, response) => {
    const body = parse(loginSchema, request.body);
    const { tokens, agent } = await auth.login(
      body.email,
      body.password,
      metaOf(request, body.device),
    );
    response.json({ ...tokens, agent });
  });

  router.post('/auth/refresh', async (request, response) => {
    const body = parse(z.object({ refreshToken: z.string().min(1).max(200) }), request.body);
    response.json(await auth.refresh(body.refreshToken, metaOf(request)));
  });

  router.post('/auth/forgot-password', loginLimiter, async (request, response) => {
    const body = parse(z.object({ email: emailSchema }), request.body);
    await auth.forgotPassword(body.email, metaOf(request));
    response.status(202).json({
      message: 'If an account exists for this email, a password reset link has been sent.',
    });
  });

  router.post('/auth/logout', signedIn, async (request, response) => {
    await auth.logout(sessionOf(response), metaOf(request));
    response.status(204).end();
  });

  router.get('/me', signedIn, async (_request, response) => {
    response.json({ agent: await auth.profile(sessionOf(response)) });
  });

  // ---------------------------------------------------------- Dashboard

  router.get('/dashboard', signedIn, async (_request, response) => {
    const session = sessionOf(response);
    const [summary, unreadNotifications] = await Promise.all([
      verifications.dashboard(session),
      countUnread(database, session.agentId),
    ]);
    response.json({ ...summary, unreadNotifications });
  });

  // ------------------------------------------------------- Verification

  router.post('/verifications', signedIn, async (request, response) => {
    const body = parse(verifySchema, request.body);
    const idempotencyKey = parse(
      z.string().trim().min(1).max(100).optional(),
      request.get('Idempotency-Key'),
    );

    let capturedAt: Date | undefined;
    if (body.capturedAt) {
      capturedAt = new Date(body.capturedAt);
      const age = now().getTime() - capturedAt.getTime();
      if (age < -CLOCK_SKEW_MS || age > OFFLINE_MAX_AGE_MS) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'capturedAt must be within the last 7 days and not in the future.',
        );
      }
    }

    const { verification, created } = await verifications.verify(sessionOf(response), {
      method: body.method,
      plate: body.plate,
      reference: body.reference,
      tagReference: body.tagReference,
      location: body.location,
      capturedAt,
      offline: body.offline ?? capturedAt !== undefined,
      idempotencyKey,
      device: body.device,
    });
    response.status(created ? 201 : 200).json({ verification });
  });

  router.get('/verifications', signedIn, async (request, response) => {
    const query = parse(historySchema, request.query);
    response.json(await verifications.history(sessionOf(response), query));
  });

  router.get('/verifications/:id', signedIn, async (request, response) => {
    response.json({
      verification: await verifications.detail(sessionOf(response), request.params.id as string),
    });
  });

  router.post('/verifications/:id/trip/refresh', signedIn, async (request, response) => {
    const trip = await verifications.refreshTrip(sessionOf(response), request.params.id as string);
    response.json({ trip });
  });

  router.post('/verifications/:id/destination-location', signedIn, async (request, response) => {
    const body = parse(z.object({ location: geoPointSchema }), request.body);
    const location = await verifications.recordDestinationLocation(
      sessionOf(response),
      request.params.id as string,
      body.location,
    );
    response.status(201).json({ destinationLocation: location });
  });

  router.post('/verifications/:id/load-status', signedIn, async (request, response) => {
    const body = parse(
      z.object({ status: z.enum(['loaded', 'empty']), location: geoPointSchema }),
      request.body,
    );
    const loadStatus = await verifications.recordLoadStatus(
      sessionOf(response),
      request.params.id as string,
      body.status,
      body.location,
    );
    response.json({ loadStatus });
  });

  router.post('/rfid/resolve-tags', signedIn, async (request, response) => {
    const body = parse(
      z.object({ tagReferences: z.array(z.string().trim().min(1).max(200)).min(1).max(50) }),
      request.body,
    );
    response.json({ tags: await verifications.resolveTags(body.tagReferences) });
  });

  router.get('/etags/:reference/receipt', signedIn, async (request, response) => {
    const reference = parse(z.string().trim().min(1).max(200), request.params.reference);
    response.json({ receipt: await verifications.eTagReceipt(reference) });
  });

  router.get('/reference-data', signedIn, async (_request, response) => {
    response.json(await chl.getReferenceData());
  });

  // ------------------------------------------------------ Notifications

  router.get('/notifications', signedIn, async (request, response) => {
    const query = parse(
      z.object({
        limit: z.coerce.number().int().min(1).max(100).default(20),
        cursor: z.string().max(200).optional(),
      }),
      request.query,
    );
    const session = sessionOf(response);
    const [rows, unread] = await Promise.all([
      listNotifications(database, session.agentId, {
        limit: query.limit + 1,
        before: decodeCursor(query.cursor),
      }),
      countUnread(database, session.agentId),
    ]);
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    response.json({
      items: page.map(notificationView),
      unread,
      nextCursor: rows.length > query.limit && last ? encodeCursor(last) : null,
    });
  });

  router.get('/notifications/unread-count', signedIn, async (_request, response) => {
    response.json({ unread: await countUnread(database, sessionOf(response).agentId) });
  });

  router.post('/notifications/read-all', signedIn, async (_request, response) => {
    response.json({ marked: await markAllRead(database, sessionOf(response).agentId) });
  });

  router.post('/notifications/:id/read', signedIn, async (request, response) => {
    const id = request.params.id as string;
    if (!isUuid(id) || !(await markRead(database, sessionOf(response).agentId, id))) {
      throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'No such notification.');
    }
    response.status(204).end();
  });

  return router;
}

function notificationView(notification: Notification) {
  return {
    id: notification.id,
    category: notification.category,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    createdAt: notification.createdAt.toISOString(),
    read: notification.readAt !== null,
  };
}
