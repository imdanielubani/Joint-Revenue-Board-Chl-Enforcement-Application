import { randomUUID } from 'node:crypto';

import type { IncomingMessage } from 'node:http';

export const requestIdHeader = 'x-request-id';

// Accept a caller's ID only if it is short and plain, so it is safe to log and echo.
const acceptedId = /^[A-Za-z0-9._:-]{1,128}$/;

/** The caller's X-Request-ID if acceptable, otherwise a new UUID. */
export function resolveRequestId(req: IncomingMessage): string {
  const header = req.headers[requestIdHeader];
  const candidate = Array.isArray(header) ? header[0] : header;
  return candidate !== undefined && acceptedId.test(candidate) ? candidate : randomUUID();
}
