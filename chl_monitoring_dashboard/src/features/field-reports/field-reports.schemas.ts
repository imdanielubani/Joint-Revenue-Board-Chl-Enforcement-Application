import { z } from 'zod'
import { feedItemSchema } from '@/features/command-centre/command-centre.schemas'
import type { OverviewFilters } from '@/features/overview/overview.schemas'

/**
 * What agents reported from the field in an area and period (SRD 3, 11.3):
 * vehicle, driver and situation reports and general notifications, and
 * haulage-loaded or empty confirmations. Each as the Command centre shows it.
 */
export const fieldReportsSchema = z.object({
  /** When CHL last received one in this area and period; null when none arrived. */
  latestReceivedAt: z.string().nullable(),
  /** Received in the area and period, latest first. */
  reports: z.array(feedItemSchema),
  /** Loaded / empty confirmations received in the area and period, latest first. */
  loadReports: z.array(feedItemSchema),
})

export type FieldReports = z.infer<typeof fieldReportsSchema>
export type FieldReportsFilters = OverviewFilters
