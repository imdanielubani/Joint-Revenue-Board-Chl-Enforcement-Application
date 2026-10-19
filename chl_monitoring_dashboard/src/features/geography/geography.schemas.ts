import { z } from 'zod'
import type {
  ActionStatus,
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
/** The GPS the device captured with the record (WGS 84); null when none. A recorded position, not a live one. */
const gps = z
  .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
  .nullable()

/** A verification received in the scope and period. */
export const verificationRecordSchema = z.object({
  id: z.string(),
  reference: z.string(),
  plate: z.string(),
  method: open<VerificationMethod>().nullable(),
  result: open<VerificationOutcome>().nullable(),
  agent,
  location: place,
  position: gps,
  recordedAt: z.string(),
  /** Later than recordedAt for a record made offline; null when not supplied. */
  receivedAt: z.string().nullable(),
  source: open<RecordSource>().nullable(),
  syncStatus: open<SyncStatus>().nullable(),
})

/** A violation issued in the scope and period, and its demand notice if one was issued. */
export const violationRecordSchema = z.object({
  id: z.string(),
  plate: z.string(),
  category: z.string(),
  status: open<ActionStatus>(),
  agent,
  location: place,
  position: gps,
  recordedAt: z.string(),
  noticeId: z.string().nullable(),
  /** The verification that led to it. */
  verificationReference: z.string(),
})

/** The photographs supplied with a violation, as Evidence records holds them. */
export const evidenceRecordSchema = z.object({
  id: z.string(),
  violationId: z.string(),
  plate: z.string(),
  photographs: count,
  /** Received by CHL, or still uploading from the device. */
  status: open<'received' | 'pending'>(),
  location: place,
  position: gps,
  recordedAt: z.string(),
})

/** A demand notice linked to a violation in the scope and period. */
export const noticeRecordSchema = z.object({
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
    evidence: z.array(evidenceRecordSchema),
  }),
})

export type Geography = z.infer<typeof geographySchema>
export type EnforcementPoint = z.infer<typeof enforcementPointSchema>
export type VerificationRecord = z.infer<typeof verificationRecordSchema>
export type ViolationRecord = z.infer<typeof violationRecordSchema>
export type NoticeRecord = z.infer<typeof noticeRecordSchema>
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>

/** The area and period, as on the Overview; agents and organizations are not narrowed here. */
export type GeographyFilters = Pick<OverviewFilters, 'scope' | 'range' | 'from' | 'to'>
