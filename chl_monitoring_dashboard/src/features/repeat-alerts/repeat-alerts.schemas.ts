import { z } from 'zod'
import type { FollowUp, Open, OverviewFilters } from '@/features/overview/overview.schemas'
import { violationCaseSchema } from '@/features/violations/violations.schemas'

const open = <T extends string>() => z.custom<Open<T>>((value) => typeof value === 'string')
const count = z.number().int().nonnegative()

/**
 * A repeat-vehicle alert (SRD 11.1): a vehicle reported three qualifying times
 * in the area and period, with a report still open. A qualifying report is a
 * violation not cancelled; any three scans are not an alert.
 */
export const repeatAlertSchema = z.object({
  plate: z.string(),
  vehicleId: z.string().nullable(),
  vehicleType: z.string().nullable(),
  /** The area of the latest qualifying report. */
  area: z.string(),
  /** Qualifying reports in the period. */
  reports: count,
  /** "none": no qualifying report escalated or closed; "partial": some were. */
  followUp: open<FollowUp>(),
  firstReportedAt: z.string(),
  lastReportedAt: z.string(),
  /**
   * When the alert was raised: the third qualifying report over the history
   * CHL keeps, as the supervisory process counts it, whatever the period.
   */
  raisedAt: z.string(),
  /**
   * Every violation of the plate in the area and period, oldest first, with
   * the actions recorded on each; cancelled ones are listed but do not qualify.
   */
  cases: z.array(violationCaseSchema),
  /**
   * The repeat-vehicle notification the central supervisory process sent for
   * it, and whether this user has read it; null when none was sent.
   */
  notification: z.object({ id: z.string(), receivedAt: z.string(), read: z.boolean() }).nullable(),
})

export const repeatAlertsSchema = z.object({
  /** The latest violation CHL received in scope; null when none. */
  latestReceivedAt: z.string().nullable(),
  /** How many qualifying reports raise an alert: three (SRD 11.1). */
  threshold: count,
  /** The alerts in the area and period, most reports first. */
  alerts: z.array(repeatAlertSchema),
})

export type RepeatAlert = z.infer<typeof repeatAlertSchema>
export type RepeatAlerts = z.infer<typeof repeatAlertsSchema>
export type RepeatAlertsFilters = OverviewFilters
