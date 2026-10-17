import type { AuthApi } from '@/features/auth/auth.api'
import { AUTH_ERROR_CODES } from '@/features/auth/auth.schemas'
import { sessionExpiry } from '@/features/auth/session'
import { ApiError } from '@/shared/api/api-error'
import { delay } from './delay'
import { MOCK_DEACTIVATED_EMAILS, MOCK_PASSWORD, MOCK_USERS } from './mock-users'

function newTokens() {
  return {
    accessToken: `mock-access-${crypto.randomUUID()}`,
    refreshToken: `mock-refresh-${crypto.randomUUID()}`,
  }
}

/** Sample-data sign-in, used until the backend is connected. */
export const mockAuthApi: AuthApi = {
  async signIn({ email, password }) {
    await delay()
    const address = email.trim().toLowerCase()
    // Like the backend: the deactivated check comes only after the password is right,
    // so it never reveals which accounts exist.
    if (MOCK_DEACTIVATED_EMAILS.includes(address) && password === MOCK_PASSWORD) {
      throw new ApiError(
        403,
        AUTH_ERROR_CODES.accountDeactivated,
        'Your account is deactivated. Your CHL administrator can help you restore access.',
      )
    }
    const user = MOCK_USERS.find((candidate) => candidate.email === address)
    if (!user || password !== MOCK_PASSWORD) {
      throw new ApiError(
        401,
        AUTH_ERROR_CODES.invalidCredentials,
        'The email or password is incorrect.',
      )
    }
    return { ...newTokens(), user, expiresAt: sessionExpiry() }
  },
  async refresh() {
    await delay()
    return newTokens()
  },
  async signOut() {
    await delay()
  },
}
