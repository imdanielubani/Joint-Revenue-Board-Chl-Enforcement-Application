import { z } from 'zod';

import { AppError } from '../lib/errors.js';

/** Checks [value] against [schema]; a mismatch answers 400 with each problem. */
export function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Some fields are missing or not valid.',
      parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }
  return parsed.data;
}

/** A GPS position: required with every verification (SRD §25). */
export const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMetres: z.number().min(0).max(100_000).optional(),
});

/** What the app says about the phone it runs on (model, OS, app version…). */
export const deviceSchema = z
  .record(z.string().max(50), z.string().max(200))
  .refine((device) => Object.keys(device).length <= 20, 'Too many device fields.')
  .optional();
