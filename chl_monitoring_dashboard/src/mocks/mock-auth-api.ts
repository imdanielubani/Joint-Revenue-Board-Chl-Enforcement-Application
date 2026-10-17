import type { AuthApi } from '@/features/auth/auth.api'
import { sessionExpiry } from '@/features/auth/session'
import { ApiError } from '@/shared/api/api-error'
import { delay } from './delay'
import { MOCK_PASSWORD, MOCK_USERS } from './mock-users'

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
    const user = MOCK_USERS.find((candidate) => candidate.email === email.trim().toLowerCase())
    if (!user || password !== MOCK_PASSWORD) {
      throw new ApiError(401, 'invalid_credentials', 'The email or password is incorrect.')
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
