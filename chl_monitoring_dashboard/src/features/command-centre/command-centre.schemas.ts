import { z } from 'zod'
import {
  casesSchema,
  repeatVehiclesSchema,
  type ActionStatus,
  type Open,
  type RecordSource,
  type SyncStatus,
  type VerificationOutcome,
} from '@/features/overview/overview.schemas'

/** The time windows the Command centre shows, ending now. */
export const CC_WINDOWS = ['1h', 'today', '24h', '7d'] as const
export type CcWindow = (typeof CC_WINDOWS)[number]

export const CC_WINDOW_LABELS: Record<CcWindow, string> = {
  '1h': 'Last hour',
  today: 'Today',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
}

/** What a feed entry is (SRD 3, Operational Activity Feed). */
export const FEED_KINDS = [
  'verification',
  'violation',
  'payment',
  'field_report',
  'load_status',
] as const
export type FeedKind = (typeof FEED_KINDS)[number]

export const FEED_KIND_LABELS: Record<FeedKind, string> = {
  verification: 'Verification',
  violation: 'Violation',
  payment: 'Payment update',
  field_report: 'Field report',
  load_status: 'Loaded / empty',
}

/** The field reports agents submit from the mobile application (SRD 3, 11.3). */
export const FIELD_REPORT_TYPES = ['vehicle', 'driver', 'situation', 'general'] as const
export type FieldReportType = (typeof FIELD_REPORT_TYPES)[number]

export const FIELD_REPORT_LABELS: Record<FieldReportType, string> = {
  vehicle: 'Vehicle report',
  driver: 'Driver report',
  situation: 'Situation report',
  general: 'General notification',
}

/** A haulage-loaded or empty confirmation, where recorded. */
export type LoadStatus = 'loaded' | 'empty'

const open = <T extends string>() => z.custom<Open<T>>((value) => typeof value === 'string')
const count = z.number().int().nonnegative()

const feedItemSchema = z.object({
  id: z.string(),
  kind: open<FeedKind>(),
  /** When the event happened in the field. */
  recordedAt: z.string(),
  /** When CHL received it; later for records made offline. Null when not supplied. */
  receivedAt: z.string().nullable(),
  source: open<RecordSource>().nullable(),
  syncStatus: open<SyncStatus>().nullable(),
  agent: z.object({ id: z.string(), name: z.string() }),
  location: z.object({ name: z.string(), area: z.string(), code: z.string() }),
  plate: z.string().nullable(),
  /** For a verification: what it found. */
  result: open<VerificationOutcome>().nullable(),
  /** For a violation, or a verification that led to one. */
  violation: z
    .object({ id: z.string(), category: z.string(), status: open<ActionStatus>() })
    .nullable(),
  /** For a payment update: the demand notice and what CHL reports. */
  payment: z
    .object({
      noticeId: z.string(),
      status: open<'pending' | 'received'>(),
      /** Payment received and trip activated are distinct outcomes (SRD 10). */
      tripActivated: z.boolean(),
    })
    .nullable(),
  /** For a field report. */
  report: z.object({ type: open<FieldReportType>(), summary: z.string() }).nullable(),
  /** For a loaded / empty confirmation. */
  load: open<LoadStatus>().nullable(),
  /** Photographs supplied with the record; viewed in Evidence records. */
  evidenceCount: count,
  /** The agent's note, where one was written. */
  note: z.string().nullable(),
})

const locationActivitySchema = z.object({
  id: z.string(),
  name: z.string(),
  area: z.string(),
  code: z.string(),
  /** Entries from there that CHL received in the window. */
  events: count,
  /** The latest event recorded there, at any time; the GPS of that event, not a live position. */
  lastEventAt: z.string().nullable(),
})

export const commandCentreSchema = z.object({
  window: z.object({ from: z.string(), to: z.string() }),
  latestReceivedAt: z.string().nullable(),
  counts: z.object({
    /** Feed entries CHL received in the window, whenever they were recorded. */
    activity: count,
    fieldReports: count,
    loaded: count,
    empty: count,
  }),
  /**
   * Entries CHL received in the window, latest received first; the latest only.
   * A record made offline appears when it reaches CHL, with its earlier recorded time.
   */
  feed: z.array(feedItemSchema),
  /** Open now, whenever they were raised: what needs attention does not depend on the window. */
  cases: casesSchema,
  repeatVehicles: repeatVehiclesSchema,
  locations: z.array(locationActivitySchema),
})

export type CommandCentre = z.infer<typeof commandCentreSchema>
export type FeedItem = z.infer<typeof feedItemSchema>
export type LocationActivity = z.infer<typeof locationActivitySchema>

export interface CommandCentreFilters {
  /** The id of the area shown, within the user's own. */
  scope: string
  window: CcWindow
}
