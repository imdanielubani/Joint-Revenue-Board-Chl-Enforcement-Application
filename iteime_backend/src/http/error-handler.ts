import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from 'pino';

import { ChlError } from '../chl/errors.js';
import { AppError, type ErrorBody } from '../lib/errors.js';

/** How each CHL failure is answered to the app. */
const chlErrors: Record<string, { status: number; code: string }> = {
  unavailable: { status: 503, code: 'CHL_UNAVAILABLE' },
  invalidCredentials: { status: 401, code: 'INVALID_CREDENTIALS' },
  accountDeactivated: { status: 403, code: 'ACCOUNT_DEACTIVATED' },
  sessionExpired: { status: 401, code: 'SESSION_EXPIRED' },
  notFound: { status: 404, code: 'NOT_FOUND' },
  badResponse: { status: 502, code: 'CHL_BAD_RESPONSE' },
  notImplemented: { status: 501, code: 'CHL_NOT_CONNECTED' },
};

/** 404 for any route that doesn't exist. */
export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'This route does not exist.'));
};

/**
 * Turns every error into the JSON error body. Unknown errors are logged and
 * answered as 500 without their details, so nothing internal leaks.
 */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, request, response, _next) => {
    const requestId = String(request.id ?? '');
    let status = 500;
    let body: ErrorBody['error'] = {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
    };

    if (error instanceof AppError) {
      status = error.status;
      body = { code: error.code, message: error.message, details: error.details };
    } else if (error instanceof ChlError) {
      const mapped = chlErrors[error.kind] ?? { status: 502, code: 'CHL_ERROR' };
      status = mapped.status;
      body = { code: mapped.code, message: error.message };
    } else if (isJsonSyntaxError(error)) {
      status = 400;
      body = { code: 'INVALID_JSON', message: 'The request body is not valid JSON.' };
    }

    if (status >= 500) logger.error({ err: error, requestId }, 'Request failed');
    response.status(status).json({ error: { ...body, requestId } } satisfies ErrorBody);
  };
}

function isJsonSyntaxError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    typeof (error as { status?: unknown }).status === 'number' &&
    'body' in error
  );
}
