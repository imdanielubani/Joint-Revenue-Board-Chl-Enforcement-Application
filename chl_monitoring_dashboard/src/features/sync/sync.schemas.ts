import { z } from 'zod'
import type { OverviewFilters } from '@/features/overview/overview.schemas'
import { verificationEntrySchema } from '@/features/verifications/verifications.schemas'

/**
 * Synchronization (document 13): the records CHL received from the field in an
 * area and period, each with the synchronization status stored with it, where
 * it came from (offline-origin where the backend says so), its evidence upload
 * and when CHL received it. Received data only: the dashboard cannot know about
 * actions still stored on an offline phone.
 */
export const synchronizationSchema = z.object({
  /** When CHL last received a field record in scope, at any time; null when none. */
  latestReceivedAt: z.string().nullable(),
  /** The received records in the area and period, newest first. */
  records: z.array(verificationEntrySchema),
})

export type Synchronization = z.infer<typeof synchronizationSchema>

/** The area, period, agent and organization, as on the Overview. */
export type SyncFilters = OverviewFilters
