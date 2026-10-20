import { z } from 'zod'
import { verificationRecordSchema } from '@/features/geography/geography.schemas'
import type {
  ActionStatus,
  EtagResult,
  Open,
  OverviewFilters,
} from '@/features/overview/overview.schemas'

const open = <T extends string>() => z.custom<Open<T>>((value) => typeof value === 'string')

/**
 * Where a verification's result came from (SRD 6.1): CHL's backend at the
 * time, the phone's cached CHL data while the backend could not be reached, or
 * a record made with no connection and uploaded later. A recorded fact about
 * the record, not the device's state now.
 */
export const PROVENANCES = ['live_backend', 'cached_result', 'offline_origin'] as const
export type Provenance = (typeof PROVENANCES)[number]

/** Whether the verification request itself succeeded, where CHL supplies it. */
export const ATTEMPT_STATUSES = ['successful', 'unsuccessful'] as const
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number]

/** What the agent did after the verification, where CHL records it. */
export const ACTIONS_TAKEN = ['violation_issued', 'no_violation'] as const
export type ActionTaken = (typeof ACTIONS_TAKEN)[number]

/**
 * One verification as Verifications & E-Tags shows it (SRD 6.1–6.5): the
 * record, its E-Tag result, the vehicle and trip it resolved to, and what
 * followed. Raw RFID values are never part of it.
 */
export const verificationEntrySchema = verificationRecordSchema.extend({
  /** The E-Tag check's result; null when the verification read no tag. A failed scan is not a missing tag. */
  etag: open<EtagResult>().nullable(),
  provenance: open<Provenance>().nullable(),
  /** Null when CHL did not supply it. */
  attempt: open<AttemptStatus>().nullable(),
  vehicle: z.object({
    /** CHL's vehicle ID, where the plate resolved to a vehicle; null when it did not. */
    id: z.string().nullable(),
    /** The vehicle type, where CHL has one. */
    type: z.string().nullable(),
  }),
  /** The trip the verification found (active or previous); null when none. */
  tripId: z.string().nullable(),
  actionTaken: open<ActionTaken>().nullable(),
  /** The violation issued from it, if any. */
  violation: z
    .object({ id: z.string(), category: z.string(), status: open<ActionStatus>() })
    .nullable(),
  /** The payment request (demand notice) generated from the violation, if any. */
  payment: z.object({ id: z.string(), status: open<'pending' | 'received'>() }).nullable(),
})

export const verificationsMonitoringSchema = z.object({
  /** The latest record CHL received in scope, at any time; null when none. */
  latestReceivedAt: z.string().nullable(),
  /** The verifications in the area and period, newest first. */
  records: z.array(verificationEntrySchema),
})

export type VerificationEntry = z.infer<typeof verificationEntrySchema>
export type VerificationsMonitoring = z.infer<typeof verificationsMonitoringSchema>

/** The area, period, agent and organization, as on the Overview. */
export type VerificationsFilters = OverviewFilters
