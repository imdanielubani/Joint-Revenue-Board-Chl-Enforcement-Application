/**
 * Every error code the API can return, with its HTTP status and default
 * message (ADR-0009: UPPER_SNAKE_CASE, matching the mobile app's contract).
 * Clients branch on the code, never on the message.
 */
export const errorCodes = {
  VALIDATION_ERROR: { status: 400, message: 'Some fields are missing or not valid.' },
  MALFORMED_JSON: { status: 400, message: 'The request body is not valid JSON.' },
  BAD_REQUEST: { status: 400, message: 'The request could not be processed.' },
  UNAUTHENTICATED: { status: 401, message: 'Sign in to continue.' },
  INVALID_CREDENTIALS: { status: 401, message: 'The email or password is not correct.' },
  SESSION_EXPIRED: { status: 401, message: 'Your session has ended. Please sign in again.' },
  FORBIDDEN: { status: 403, message: 'You are not allowed to do this.' },
  ACCOUNT_DEACTIVATED: { status: 403, message: 'This account has been deactivated.' },
  AGENT_ACCESS_DENIED: { status: 403, message: 'Only enforcement agents can use the mobile app.' },
  CLIENT_ACCESS_DENIED: { status: 403, message: 'This account cannot use this application.' },
  NOT_FOUND: { status: 404, message: 'The requested resource does not exist.' },
  METHOD_NOT_ALLOWED: { status: 405, message: 'This operation is not allowed here.' },
  PAYLOAD_TOO_LARGE: { status: 413, message: 'The request body is too large.' },
  UNSUPPORTED_ENCODING: { status: 415, message: 'The request encoding is not supported.' },
  RATE_LIMITED: { status: 429, message: 'Too many requests. Try again shortly.' },
  INTERNAL_ERROR: { status: 500, message: 'An unexpected error occurred.' },
  CHL_UNAVAILABLE: {
    status: 503,
    message: 'The CHL service could not be reached. Please retry when it is available.',
  },
  CHL_NOT_CONFIGURED: { status: 503, message: 'The CHL integration is not configured.' },
  SERVICE_UNAVAILABLE: { status: 503, message: 'The service is temporarily unavailable.' },
} as const satisfies Record<string, { status: number; message: string }>;

export type ErrorCode = keyof typeof errorCodes;
