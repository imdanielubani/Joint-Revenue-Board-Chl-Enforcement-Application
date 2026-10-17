import { z } from 'zod'
import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockAuthApi } from '@/mocks/mock-auth-api'
import {
  sessionSchema,
  tokensSchema,
  type Session,
  type SignInInput,
  type Tokens,
} from './auth.schemas'

/** Sign-in goes through the existing CHL authentication, via the backend. */
export interface AuthApi {
  signIn(input: SignInInput): Promise<Session>
  /** New tokens for the same session; the session's end time does not move. */
  refresh(refreshToken: string): Promise<Tokens>
  signOut(refreshToken: string): Promise<void>
  /** Starts the existing CHL forgot-password process. */
  requestPasswordReset(email: string): Promise<void>
}

// The paths are provisional until the backend's API is agreed.
const httpAuthApi: AuthApi = {
  signIn: (input) =>
    request('/api/v1/admin/auth/sign-in', sessionSchema, {
      method: 'POST',
      body: input,
      auth: false,
    }),
  refresh: (refreshToken) =>
    request('/api/v1/admin/auth/refresh', tokensSchema, {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    }),
  signOut: (refreshToken) =>
    request('/api/v1/admin/auth/sign-out', z.unknown(), {
      method: 'POST',
      body: { refreshToken },
    }).then(() => undefined),
  requestPasswordReset: (email) =>
    request('/api/v1/admin/auth/forgot-password', z.unknown(), {
      method: 'POST',
      body: { email },
      auth: false,
    }).then(() => undefined),
}

export const authApi: AuthApi = env.useMocks ? mockAuthApi : httpAuthApi
