import { z } from 'zod'
import type {
  ActionStatus,
  EtagResult,
  Open,
  OverviewFilters,
  RecordSource,
  SyncStatus,
  VerificationMethod,
  VerificationOutcome,
} from '@/features/overview/overview.schemas'

const count = z.number().int().nonnegative()
const open = <T extends string>() => z.custom<Open<T>>((value) => typeof value === 'string')
const agent = z.object({ id: z.string(), name: z.string() })
const place = z.object({ id: z.string(), name: z.string(), area: z.string(), code: z.string() })

/** A verification received in the scope and period. */
const verificationRecordSchema = z.object({
  id: z.string(),
  reference: z.string(),
  plate: z.string(),
  method: open<VerificationMethod>().nullable(),
  result: open<VerificationOutcome>().nullable(),
  /** The E-Tag check, where one was made. */
  etag: open<EtagResult>().nullable(),
  agent,
  location: place,
  recordedAt: z.string(),
  /** Later than recordedAt for a record made offline; null when not supplied. */
  receivedAt: z.string().nullable(),
  source: open<RecordSource>().nullable(),
  syncStatus: open<SyncStatus>().nullable(),
})

/** A violation issued in the scope and period, and its demand notice if one was issued. */
const violationRecordSchema = z.object({
  id: z.string(),
  plate: z.string(),
  category: z.string(),
  status: open<ActionStatus>(),
  agent,
  location: place,
  recordedAt: z.string(),
  noticeId: z.string().nullable(),
})

/** A demand notice linked to a violation in the scope and period. */
const noticeRecordSchema = z.object({
  id: z.string(),
  violationId: z.string(),
  plate: z.string(),
  status: open<'pending' | 'received'>(),
  /** Whether CHL recorded the trip as activated after payment: a separate outcome. */
  tripActivated: z.boolean(),
  location: place,
  recordedAt: z.string(),
})

/** An enforcement point in scope, active in the period or not. */
const enforcementPointSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** The state or FCT it is in. */
  area: z.string(),
  code: z.string(),
  /** Where its events were recorded (GPS, WGS 84); null when CHL has none. Not a live position. */
  position: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .nullable(),
  verifications: count,
  violations: count,
  agents: count,
  /** The latest event recorded there, at any time. */
  lastRecordedAt: z.string().nullable(),
})

export const geographySchema = z.object({
  locations: z.array(enforcementPointSchema),
  /** The underlying records for the scope and period, newest first. */
  records: z.object({
    verifications: z.array(verificationRecordSchema),
    violations: z.array(violationRecordSchema),
    notices: z.array(noticeRecordSchema),
  }),
})

export type Geography = z.infer<typeof geographySchema>
export type EnforcementPoint = z.infer<typeof enforcementPointSchema>
export type VerificationRecord = z.infer<typeof verificationRecordSchema>
export type ViolationRecord = z.infer<typeof violationRecordSchema>
export type NoticeRecord = z.infer<typeof noticeRecordSchema>

/** The area and period, as on the Overview; agents and organizations are not narrowed here. */
export type GeographyFilters = Pick<OverviewFilters, 'scope' | 'range' | 'from' | 'to'>
