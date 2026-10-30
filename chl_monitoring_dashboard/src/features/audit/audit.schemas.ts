import { z } from 'zod'
import type { Open, OverviewFilters } from '@/features/overview/overview.schemas'
import { verificationEntrySchema } from '@/features/verifications/verifications.schemas'

const open = <T extends string>() => z.custom<Open<T>>((value) => typeof value === 'string')

/** What the verification processed: an RFID tag, a QR code, or the plate (entered or read). */
export const IDENTIFIER_KINDS = ['rfid_tag', 'qr_code', 'plate'] as const
export type IdentifierKind = (typeof IDENTIFIER_KINDS)[number]

/**
 * One entry of the complete audit trail (SRD 28, document 12.2): a recorded
 * verification attempt, successful or not, with every audit field CHL holds
 * for it. The trail is read-only: no entry is edited or deleted here.
 */
export const auditEntrySchema = verificationEntrySchema.extend({
  /** The agent's vendor or organization, where CHL records one. */
  organization: z.string().nullable(),
  /**
   * The identifier the verification processed, as the user's access rules
   * allow it to be shown: an RFID tag's raw value is masked unless exposing it
   * was explicitly authorized. Null when CHL supplied none.
   */
  identifier: z
    .object({ kind: open<IdentifierKind>(), value: z.string(), masked: z.boolean() })
    .nullable(),
  /** The device and app version the record was made with, where CHL holds them. */
  device: z.object({ id: z.string(), appVersion: z.string() }).nullable(),
})

export const auditTrailSchema = z.object({
  /** The latest record CHL received in scope, at any time; null when none. */
  latestReceivedAt: z.string().nullable(),
  /** Every recorded verification attempt in the area and period, newest first. */
  entries: z.array(auditEntrySchema),
})

export type AuditEntry = z.infer<typeof auditEntrySchema>
export type AuditTrail = z.infer<typeof auditTrailSchema>

/** The area, period, agent and organization, as on the Overview. */
export type AuditFilters = OverviewFilters
