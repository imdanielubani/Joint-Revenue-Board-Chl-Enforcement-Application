import { errorCodes, type ErrorCode } from './error-codes.js';

/**
 * An error the API answers with. The code is one of the registered codes
 * (`error-codes.ts`), which fixes the HTTP status; the message is safe to show
 * to any client.
 */
export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    options: { message?: string; details?: unknown; cause?: unknown } = {},
  ) {
    super(options.message ?? errorCodes[code].message, { cause: options.cause });
    this.name = 'AppError';
    this.status = errorCodes[code].status;
    this.details = options.details;
  }

  readonly details: unknown;
}

/** The JSON body of every error response (docs/api/api-conventions.md). */
export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    details?: unknown;
  };
}
