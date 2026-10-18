import type {
  ActionStatus,
  RecordSource,
  SyncStatus,
  VerificationMethod,
  VerificationOutcome,
} from '@/features/overview/overview.schemas'
import { addDays, type CalendarDay } from '@/shared/lib/dates'
import { MOCK_AGENTS } from './mock-agents-api'

/**
 * Sample field records behind the sample Overview: 90 days of verifications,
 * the violations some of them led to, and those violations' demand notices.
 * Every Overview figure is counted from these, so the cards always agree with
 * one another and change with the area, period, agent and organization.
 *
 * The records are generated from a fixed seed, so the same day always gives
 * the same records.
 */

export interface MockPoint {
  /** The enforcement point's id in the sample area tree. */
  id: string
  name: string
  code: string
  /** The state (or FCT) the point is in. */
  state: string
}

export const MOCK_POINTS: MockPoint[] = [
  { id: 'loc_ojota', name: 'Ojota enforcement point', code: 'LOS-04', state: 'Lagos' },
  { id: 'loc_ikeja_gate', name: 'Ikeja Gate 3', code: 'LOS-01', state: 'Lagos' },
  { id: 'loc_apapa', name: 'Apapa Port Rd', code: 'LOS-07', state: 'Lagos' },
  { id: 'loc_kano_zaria', name: 'Kano-Zaria Exp', code: 'KAN-02', state: 'Kano' },
  { id: 'loc_zuba', name: 'Zuba Junction', code: 'FCT-03', state: 'FCT' },
  { id: 'loc_eleme', name: 'Eleme Toll', code: 'RIV-02', state: 'Rivers' },
]

/** Where each sample agent works. */
export const AGENT_POINTS: Record<string, string[]> = {
  'JRB-AG-0142': ['loc_ojota', 'loc_ikeja_gate'],
  'JRB-AG-0143': ['loc_zuba'],
  'JRB-AG-0144': ['loc_kano_zaria'],
  'JRB-AG-0145': ['loc_apapa', 'loc_eleme'],
}

/** The first plates come up far more often, so repeat-vehicle alerts arise. */
export const PLATES: [plate: string, weight: number][] = [
  ['KJA-482-XY', 9],
  ['ENU-156-HL', 8],
  ['PHC-388-MN', 7],
  ['KDN-512-ZA', 6],
  ['LNK-482-XK', 2],
  ['PHC-338-MN', 2],
  ['IBD-640-WR', 2],
  ['AAA-001-AB', 1],
  ['LSR-771-PB', 1],
  ['ABJ-221-KT', 1],
  ['KAN-904-QR', 1],
  ['EKY-318-LD', 1],
  ['FST-552-JA', 1],
  ['RSH-117-MB', 1],
  ['APP-640-TT', 1],
  ['ENU-388-MN', 1],
]

const METHODS: [VerificationMethod, number][] = [
  ['rfid', 35],
  ['qr', 30],
  ['ocr', 25],
  ['manual', 10],
]

const OUTCOMES: [VerificationOutcome, number][] = [
  ['active_trip', 20],
  ['vehicle_not_found', 5],
  ['no_trip_history', 5],
  ['etag_missing', 13],
  ['verification_unavailable', 5],
  ['expired_trip', 12],
  ['tag_vehicle_mismatch', 12],
  ['no_active_trip', 17],
  ['invalid_etag', 11],
]

/** The violation category each result leads to; other results never lead to one. */
const CATEGORY_FOR: Partial<Record<VerificationOutcome, string>> = {
  no_active_trip: 'No Active CHL Trip',
  etag_missing: 'No E-Tag',
  invalid_etag: 'Fake / Invalid E-Tag',
  expired_trip: 'Expired Trip',
  tag_vehicle_mismatch: 'Tag-Vehicle Mismatch',
}

/** Verifications per day for the latest week, newest last; the week before is quiet. */
const LATEST_WEEK = [3, 4, 4, 4, 3, 5, 4]
const QUIET_DAYS = 7
export const HISTORY_DAYS = 90
const TODAY_SPACING_MS = 20 * 60_000

export type ViolationStatus = Extract<
  ActionStatus,
  'payment_pending' | 'awaiting_action' | 'escalated' | 'resolved' | 'cancelled'
>

export interface MockViolation {
  id: string
  category: string
  status: ViolationStatus
  /** The demand notice's payment status; null when no notice was issued. */
  notice: 'pending' | 'received' | null
  /** Whether CHL recorded the trip as activated after payment. */
  tripActivated: boolean
}

export interface MockRecord {
  id: string
  reference: string
  plate: string
  method: VerificationMethod
  outcome: VerificationOutcome
  agentId: string
  pointId: string
  /** The Lagos day it was recorded on. */
  day: CalendarDay
  recordedAt: number
  receivedAt: number
  source: RecordSource
  syncStatus: SyncStatus
  violation: MockViolation | null
}

/** A small seeded random number generator (mulberry32): the same seed, the same numbers. */
export function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

export function pick<T>(random: () => number, choices: readonly [T, number][]): T {
  const total = choices.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = random() * total
  for (const [choice, weight] of choices) {
    roll -= weight
    if (roll < 0) return choice
  }
  return choices[choices.length - 1]![0]
}

/** Midnight at the start of a Lagos day (UTC+1, no daylight saving). */
export const startOfDay = (day: CalendarDay) => Date.parse(`${day}T00:00:00+01:00`)

function violationFor(
  random: () => number,
  outcome: VerificationOutcome,
  daysAgo: number,
): Omit<MockViolation, 'id'> | null {
  const category = CATEGORY_FOR[outcome]
  if (!category || random() > 0.85) return null
  const finalCategory =
    random() < 0.08
      ? 'Refusal to Comply'
      : outcome === 'invalid_etag' && random() < 0.35
        ? 'Tampered E-Tag'
        : category
  // The last fortnight's cases are mostly still open; older ones have mostly been dealt with.
  const status = pick<ViolationStatus>(
    random,
    daysAgo < 14
      ? [
          ['payment_pending', 40],
          ['awaiting_action', 25],
          ['escalated', 20],
          ['resolved', 15],
        ]
      : [
          ['resolved', 45],
          ['payment_pending', 20],
          ['escalated', 20],
          ['cancelled', 8],
          ['awaiting_action', 7],
        ],
  )
  const notice =
    status === 'payment_pending'
      ? 'pending'
      : status === 'resolved'
        ? 'received'
        : status === 'escalated' && random() < 0.5
          ? 'pending'
          : null
  return {
    category: finalCategory,
    status,
    notice,
    tripActivated: notice === 'received' && random() < 0.6,
  }
}

function generate(today: CalendarDay, now: number): MockRecord[] {
  const random = seeded(20_261_018)
  const records: (Omit<MockRecord, 'id' | 'reference' | 'violation'> & {
    draft: Omit<MockViolation, 'id'> | null
  })[] = []

  // Oldest day first, so references and violation numbers rise with time.
  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const day = addDays(today, -daysAgo)
    const count =
      daysAgo < LATEST_WEEK.length
        ? LATEST_WEEK[LATEST_WEEK.length - 1 - daysAgo]!
        : daysAgo < LATEST_WEEK.length + QUIET_DAYS
          ? 0
          : Math.floor(random() * 4)
    for (let index = 0; index < count; index += 1) {
      const agentId = MOCK_AGENTS[Math.floor(random() * MOCK_AGENTS.length)]!.id
      const points = AGENT_POINTS[agentId] ?? []
      const pointId = points[Math.floor(random() * points.length)] ?? MOCK_POINTS[0]!.id
      const start = startOfDay(day)
      // Today's records arrive every 20 minutes up to now (never before midnight), so
      // the latest is always recent; earlier days' fall between 07:00 and 18:00.
      const recordedAt =
        daysAgo === 0
          ? Math.min(
              now,
              Math.max(start + (index + 1) * 60_000, now - (count - index) * TODAY_SPACING_MS),
            )
          : start + (7 + random() * 11) * 3_600_000
      const offline = random() < 0.25
      const outcome = pick(random, OUTCOMES)
      records.push({
        plate: pick(random, PLATES),
        method: pick(random, METHODS),
        outcome,
        agentId,
        pointId,
        day,
        recordedAt: Math.round(recordedAt),
        receivedAt: Math.round(
          Math.min(now, recordedAt + (offline ? (20 + random() * 90) * 60_000 : 30_000)),
        ),
        source: offline ? 'offline' : 'live',
        syncStatus: offline && random() < 0.3 ? 'evidence_pending' : 'synced',
        draft: violationFor(random, outcome, daysAgo),
      })
    }
  }

  records.sort((a, b) => a.recordedAt - b.recordedAt)
  let violationNumber = 30_200
  return records.map(({ draft, ...record }, index) => {
    const violation = draft
    return {
      ...record,
      id: `rec_${index + 1}`,
      reference: `VR-${24_000 + index}`,
      violation: violation ? { ...violation, id: `VIO-${(violationNumber += 1)}` } : null,
    }
  })
}

let cache: { today: CalendarDay; records: MockRecord[] } | null = null

/** The sample records up to now, for the 90 days ending `today`. */
export function mockRecords(today: CalendarDay, now: number = Date.now()): MockRecord[] {
  if (cache?.today !== today) cache = { today, records: generate(today, now) }
  return cache.records
}

export const pointById = new Map(MOCK_POINTS.map((point) => [point.id, point]))
