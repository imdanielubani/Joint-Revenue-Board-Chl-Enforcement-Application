/**
 * An error the API answers with: an HTTP status, a stable machine-readable
 * [code] for the mobile app, and a message safe to show.
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

/** The JSON body of every error response. */
export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}
