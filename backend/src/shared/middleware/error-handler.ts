import { ZodError } from 'zod';

import { AppError, type ErrorBody } from '../errors/app-error.js';

import type { ErrorRequestHandler } from 'express';

interface HttpLikeError {
  status?: unknown;
  statusCode?: unknown;
  type?: unknown;
}

/** Body-parser and similar errors carry a 4xx status and a type. */
function fromHttpError(err: HttpLikeError): AppError | undefined {
  const status = typeof err.status === 'number' ? err.status : err.statusCode;
  if (typeof status !== 'number' || status < 400 || status >= 500) return undefined;
  switch (err.type) {
    case 'entity.parse.failed':
      return new AppError('MALFORMED_JSON');
    case 'entity.too.large':
      return new AppError('PAYLOAD_TOO_LARGE');
    case 'encoding.unsupported':
    case 'charset.unsupported':
      return new AppError('UNSUPPORTED_ENCODING');
    default:
      return new AppError('BAD_REQUEST');
  }
}

/** Validation issues as `{field, message}`, the shape the mobile app reads. */
export function validationDetails(err: ZodError, prefix?: string) {
  return err.issues.map((issue) => ({
    field: [prefix, ...issue.path.map(String)].filter(Boolean).join('.'),
    message: issue.message,
  }));
}

// Expected upstream outages: worth a warning, not an error with a stack trace.
const upstreamCodes = new Set(['CHL_UNAVAILABLE', 'CHL_NOT_CONFIGURED']);

/**
 * Turns any error into the standard error body. Unexpected errors are logged
 * in full but answered with a generic 500: no stack traces, SQL, or upstream
 * details reach the client.
 */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  let appError: AppError;
  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof ZodError) {
    appError = new AppError('VALIDATION_ERROR', { details: validationDetails(err) });
  } else {
    appError =
      (typeof err === 'object' && err !== null && fromHttpError(err as HttpLikeError)) ||
      new AppError('INTERNAL_ERROR');
  }

  if (upstreamCodes.has(appError.code)) {
    req.log.warn({ code: appError.code, cause: appError.cause }, 'upstream unavailable');
  } else if (appError.status >= 500) {
    req.log.error({ err }, 'request failed');
  }

  const body: ErrorBody = {
    error: {
      code: appError.code,
      message: appError.message,
      requestId: String(req.id),
      ...(appError.details === undefined ? {} : { details: appError.details }),
    },
  };
  res.status(appError.status).json(body);
};
