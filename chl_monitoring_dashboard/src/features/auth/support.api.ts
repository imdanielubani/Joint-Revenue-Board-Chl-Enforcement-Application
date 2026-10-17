import { z } from 'zod'
import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockSupportApi } from '@/mocks/mock-support-api'
import type { SupportRequest } from './support.schemas'

/** Sends a signed-out user's sign-in or access issue to CHL support by email. */
export interface SupportApi {
  sendRequest(input: SupportRequest): Promise<void>
}

// The path is provisional until the backend's API is agreed.
const httpSupportApi: SupportApi = {
  sendRequest: (input) =>
    request('/api/v1/support/requests', z.unknown(), {
      method: 'POST',
      body: input,
      auth: false,
    }).then(() => undefined),
}

export const supportApi: SupportApi = env.useMocks ? mockSupportApi : httpSupportApi
