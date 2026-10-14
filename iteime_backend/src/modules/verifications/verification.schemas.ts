import { z } from 'zod';

import { deviceSchema, geoPointSchema } from '../../http/validate.js';

export const verifySchema = z.object({
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

export const idempotencyKeySchema = z.string().trim().min(1).max(100).optional();

export const historyQuerySchema = z.object({
  period: z.enum(['30d', 'all']).default('30d'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(200).optional(),
});

export const destinationLocationSchema = z.object({ location: geoPointSchema });

export const loadStatusSchema = z.object({
  status: z.enum(['loaded', 'empty']),
  location: geoPointSchema,
});

export const resolveTagsSchema = z.object({
  tagReferences: z.array(z.string().trim().min(1).max(200)).min(1).max(50),
});
