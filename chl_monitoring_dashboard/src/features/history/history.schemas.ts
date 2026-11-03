import { z } from 'zod'
import type { OverviewFilters } from '@/features/overview/overview.schemas'
import { verificationEntrySchema } from '@/features/verifications/verifications.schemas'

/**
 * Verification history (document 12.1): the recorded verification attempts in
 * an area and period, each with its completion status, the action taken, the
 * violation it is linked to, the payment request generated and what is still
 * pending. Read-only.
 *
 * The SRD's "last 30 days" default and "view all" apply to an agent's personal
 * history on the phone; administrators browse any period.
 */
export const verificationHistorySchema = z.object({
  /** The latest record CHL received in scope, at any time; null when none. */
  latestReceivedAt: z.string().nullable(),
  /** The recorded verification attempts in the area and period, newest first. */
  records: z.array(verificationEntrySchema),
})

export type VerificationHistory = z.infer<typeof verificationHistorySchema>

/** The area, period, agent and organization, as on the Overview. */
export type HistoryFilters = OverviewFilters
