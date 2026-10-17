/**
 * Lets the HTTP client use the session without importing the auth feature.
 * The session provider registers these handlers while someone is signed in.
 */
export interface AuthHandlers {
  getAccessToken(): string | null
  /** Gets a new access token, or null when the session can't be renewed. */
  refreshAccessToken(): Promise<string | null>
}

let handlers: AuthHandlers | null = null

export function setAuthHandlers(next: AuthHandlers | null): void {
  handlers = next
}

export function getAuthHandlers(): AuthHandlers | null {
  return handlers
}
