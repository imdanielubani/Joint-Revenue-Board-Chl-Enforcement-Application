import type { ViolationsApi } from '@/features/violations/violations.api'
import { delay } from './delay'

/** Sample data: some cases need attention, so the sidebar shows its marker. */
export const mockViolationsApi: ViolationsApi = {
  async getSummary() {
    await delay()
    return { needingAttention: 3 }
  },
}
