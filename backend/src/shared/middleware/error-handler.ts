import { ZodError } from 'zod';

import { AppError, type ErrorBody } from '../errors/app-error.js';

import type { ErrorRequestHandler } from 'express';

interface HttpLikeError {
  status?: unknown;
  statusCode?: unknown;
  type?: unknown;
  expose?: unknown;
}

/** Body-parser and similar errors carry a 4xx status and a type. */
function fromHttpError(err: HttpLikeError): AppError | undefined {
  const status = typeof err.status === 'number' ? err.status : err.statusCode;
  if (typeof status !== 'number' || status < 400 || status >= 500) return undefined;
  switch (err.type) {
    case 'entity.parse.failed':
      return new AppError(400, 'malformed_json', 'The request body is not valid JSON.');
    case 'entity.too.large':
      return new AppError(413, 'payload_too_large', 'The request body is too large.');
    case 'encoding.unsupported':
    case 'charset.unsupported':
      return new AppError(415, 'unsupported_encoding', 'The request encoding is not supported.');
    default:
      return new AppError(status, 'bad_request', 'The request could not be processed.');
  }
}

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
    appError = new AppError(
      400,
      'validation_failed',
      'The request is invalid.',
      err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  } else {
    appError =
      (typeof err === 'object' && err !== null && fromHttpError(err as HttpLikeError)) ||
      new AppError(500, 'internal_error', 'An unexpected error occurred.');
  }

  if (appError.status >= 500) {
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
