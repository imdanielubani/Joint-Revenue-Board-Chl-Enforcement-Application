import { Router, type RequestHandler } from 'express';

import { parse } from '../../http/validate.js';
import { AppError } from '../../shared/errors.js';
import { sessionOf } from '../auth/require-agent.middleware.js';
import {
  destinationLocationSchema,
  historyQuerySchema,
  idempotencyKeySchema,
  loadStatusSchema,
  resolveTagsSchema,
  verifySchema,
} from './verification.schemas.js';
import type { VerificationService } from './verification.service.js';

/** A check made offline may be sent up to 7 days later (SRD §26). */
const OFFLINE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Phone clocks drift; allow this much "future". */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

/** /verifications (verify, history, one record and its follow-ups) and /rfid. */
export function verificationRoutes(dependencies: {
  verifications: VerificationService;
  signedIn: RequestHandler;
  now: () => Date;
}): Router {
  const { verifications, signedIn, now } = dependencies;
  const router = Router();
  router.use(['/verifications', '/rfid'], signedIn);

  router.post('/verifications', async (request, response) => {
    const body = parse(verifySchema, request.body);
    const idempotencyKey = parse(idempotencyKeySchema, request.get('Idempotency-Key'));
    const capturedAt = body.capturedAt ? checkCapturedAt(body.capturedAt, now()) : undefined;

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

  router.get('/verifications', async (request, response) => {
    const query = parse(historyQuerySchema, request.query);
    response.json(await verifications.history(sessionOf(response), query));
  });

  router.get('/verifications/:id', async (request, response) => {
    response.json({
      verification: await verifications.detail(sessionOf(response), request.params.id as string),
    });
  });

  router.post('/verifications/:id/trip/refresh', async (request, response) => {
    const trip = await verifications.refreshTrip(sessionOf(response), request.params.id as string);
    response.json({ trip });
  });

  router.post('/verifications/:id/destination-location', async (request, response) => {
    const body = parse(destinationLocationSchema, request.body);
    const location = await verifications.recordDestinationLocation(
      sessionOf(response),
      request.params.id as string,
      body.location,
    );
    response.status(201).json({ destinationLocation: location });
  });

  router.post('/verifications/:id/load-status', async (request, response) => {
    const body = parse(loadStatusSchema, request.body);
    const loadStatus = await verifications.recordLoadStatus(
      sessionOf(response),
      request.params.id as string,
      body.status,
      body.location,
    );
    response.json({ loadStatus });
  });

  router.post('/rfid/resolve-tags', async (request, response) => {
    const body = parse(resolveTagsSchema, request.body);
    response.json({ tags: await verifications.resolveTags(body.tagReferences) });
  });

  return router;
}

/** When an offline check was made: within the last 7 days, not in the future. */
function checkCapturedAt(value: string, now: Date): Date {
  const capturedAt = new Date(value);
  const age = now.getTime() - capturedAt.getTime();
  if (age < -CLOCK_SKEW_MS || age > OFFLINE_MAX_AGE_MS) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'capturedAt must be within the last 7 days and not in the future.',
    );
  }
  return capturedAt;
}
