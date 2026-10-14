/**
 * An error the API answers with: an HTTP status, a stable machine-readable
 * code, and a message that is safe to show to any client.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** The JSON body of every error response (docs/api/api-conventions.md). */
export interface ErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}
