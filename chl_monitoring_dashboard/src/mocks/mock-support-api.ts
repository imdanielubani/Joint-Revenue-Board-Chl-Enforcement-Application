import type { SupportApi } from '@/features/auth/support.api'
import { delay } from './delay'

/** Sample-data support: accepts the request without sending any email. */
export const mockSupportApi: SupportApi = {
  async sendRequest() {
    await delay()
  },
}
