import { AppError } from '../errors/app-error.js';
import { validationDetails } from './error-handler.js';

import type { RequestHandler, Response } from 'express';
import type { z, ZodType } from 'zod';

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

type Parsed<S extends Schemas> = {
  [K in keyof S]: S[K] extends ZodType ? z.output<S[K]> : never;
};

/**
 * Validates the request's body, query and path parameters. A failure answers
 * 400 VALIDATION_ERROR with `{field, message}` details; nothing reaches the
 * handler unvalidated. Parsed values are read with `validated(res)`.
 */
export function validate<S extends Schemas>(schemas: S): RequestHandler {
  return (req, res, next) => {
    const parsed: Record<string, unknown> = {};
    const details: ReturnType<typeof validationDetails> = [];
    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) parsed[part] = result.data;
      else details.push(...validationDetails(result.error, part === 'body' ? undefined : part));
    }
    if (details.length > 0) {
      next(new AppError('VALIDATION_ERROR', { details }));
      return;
    }
    res.locals.validated = parsed;
    next();
  };
}

/** The values parsed by `validate(schemas)` for this request. */
export function validated<S extends Schemas>(res: Response, _schemas: S): Parsed<S> {
  return res.locals.validated as Parsed<S>;
}
