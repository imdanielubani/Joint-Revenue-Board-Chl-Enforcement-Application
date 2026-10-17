import type { OverviewApi } from '@/features/overview/overview.api'
import {
  type ActionStatus,
  type ActivityRecord,
  type Overview,
  type VerificationMethod,
  type VerificationOutcome,
} from '@/features/overview/overview.schemas'
import { periodDays } from '@/features/overview/overview-period'
import { addDays } from '@/shared/lib/dates'
import { delay } from './delay'

/** The design's sample week: 27 verifications, from the day activity started. */
const SAMPLE_WEEK = [3, 4, 4, 4, 3, 5, 4]

const TUNDE = { id: 'JRB-AG-0142', name: 'Tunde Okafor' }
const GRACE = { id: 'JRB-AG-0143', name: 'Grace Bello' }
const MUSA = { id: 'JRB-AG-0144', name: 'Musa Ibrahim' }
const ADA = { id: 'JRB-AG-0145', name: 'Ada Nwosu' }

/** The register's first page, as in the design; the rest repeat it, earlier in the day. */
const SAMPLE_RECORDS: [
  plate: string,
  method: VerificationMethod,
  result: VerificationOutcome,
  agent: { id: string; name: string },
  status: ActionStatus,
][] = [
  ['KDN-512-ZA', 'rfid', 'expired_trip', ADA, 'no_violation'],
  ['KDN-512-ZA', 'qr', 'vehicle_not_found', ADA, 'no_violation'],
  ['KDN-512-ZA', 'manual', 'no_active_trip', ADA, 'escalated'],
  ['PHC-338-MN', 'ocr', 'invalid_etag', MUSA, 'awaiting_action'],
  ['PHC-338-MN', 'manual', 'no_trip_history', GRACE, 'no_violation'],
  ['IBD-640-WR', 'manual', 'etag_missing', GRACE, 'payment_pending'],
  ['AAA-001-AB', 'rfid', 'verification_unavailable', TUNDE, 'no_violation'],
  ['LNK-482-XK', 'ocr', 'tag_vehicle_mismatch', ADA, 'no_violation'],
  ['LNK-482-XK', 'ocr', 'active_trip', TUNDE, 'no_violation'],
  ['LNK-482-XK', 'ocr', 'tag_vehicle_mismatch', TUNDE, 'resolved'],
]

const RECORD_COUNT = 68
const CANCELLED_RECORD = 12
/** Every fourth record was checked offline and reached CHL later. */
const OFFLINE_EVERY = 4
const OFFLINE_DELAY_MS = 47 * 60_000
/** One offline record still has photographs to upload. */
const EVIDENCE_PENDING_RECORD = 7

function recentActivity(lastDay: string): ActivityRecord[] {
  // 10:18 WAT on the last day of the period (or a few minutes ago, if that is
  // still to come today), then every 23 minutes earlier.
  const now = Date.now()
  const latest = Math.min(new Date(`${lastDay}T09:18:00Z`).getTime(), now - 4 * 60_000)
  const repeats = Math.ceil(RECORD_COUNT / SAMPLE_RECORDS.length)
  const samples = Array.from({ length: repeats }, () => SAMPLE_RECORDS)
    .flat()
    .slice(0, RECORD_COUNT)
  return samples.map(([plate, method, result, agent, actionStatus], index) => {
    const recordedAt = latest - index * 23 * 60_000
    const offline = index % OFFLINE_EVERY === OFFLINE_EVERY - 1
    return {
      id: `rec_${index + 1}`,
      plate,
      reference: `VR-${24861 - index}`,
      method,
      result,
      agent: { id: agent.id, name: agent.name },
      recordedAt: new Date(recordedAt).toISOString(),
      // One case on the second page was cancelled, so that status shows too.
      actionStatus: index === CANCELLED_RECORD ? 'cancelled' : actionStatus,
      location: { name: 'Ojota enforcement point', area: 'Lagos', code: 'LOS-04' },
      source: offline ? 'offline' : 'live',
      syncStatus: index === EVIDENCE_PENDING_RECORD ? 'evidence_pending' : 'synced',
      receivedAt: new Date(
        Math.min(recordedAt + (offline ? OFFLINE_DELAY_MS : 0), now),
      ).toISOString(),
    }
  })
}

function dailyVerifications(from: string, days: number) {
  return Array.from({ length: days }, (_, index) => {
    const fromEnd = days - 1 - index
    const sample = days === 1 ? 27 : (SAMPLE_WEEK[SAMPLE_WEEK.length - 1 - fromEnd] ?? 0)
    return { date: addDays(from, index), count: sample }
  })
}

/**
 * Sample data: the design's figures. They are the same for every area and
 * period; only the dates follow the chosen period.
 */
export const mockOverviewApi: OverviewApi = {
  async getOverview({ from, to }) {
    await delay()
    const days = periodDays({ from, to })

    const records = recentActivity(to)
    const overview: Overview = {
      period: { from, to },
      reportingLocations: 8,
      kpis: {
        totalVerifications: 27,
        activeTripResults: 3,
        noActiveTripResults: 3,
        violationsIssued: 30,
        agentsWithViolations: 4,
        unresolvedViolations: 15,
        escalatedViolations: 7,
        repeatVehiclesWithoutFollowUp: 3,
        openRepeatAlerts: 3,
        agentsWithActivity: 4,
        enforcementLocations: 5,
      },
      dailyVerifications: dailyVerifications(from, days),
      previousDailyVerifications: null,
      outcomes: [
        'active_trip',
        'vehicle_not_found',
        'no_trip_history',
        'etag_missing',
        'verification_unavailable',
        'expired_trip',
        'tag_vehicle_mismatch',
        'no_active_trip',
        'invalid_etag',
      ].map((outcome) => ({ outcome: outcome as VerificationOutcome, count: 3 })),
      agents: [
        agentRow(TUNDE, [9, 8, 8, 0, 2], 'Lagos'),
        agentRow(GRACE, [9, 8, 0, 0, 0], 'Abuja'),
        agentRow(MUSA, [0, 7, 7, 7, 1], 'Kano'),
        agentRow(ADA, [9, 7, 0, 0, 0], 'Jos'),
      ],
      locations: [
        location('loc_kano_zaria', 'Kano-Zaria Exp', 'Kano', 'KAN-02', 6),
        location('loc_ikeja_gate', 'Ikeja Gate 3', 'Lagos', 'LOS-01', 6),
        location('loc_zuba', 'Zuba Junction', 'FCT', 'FCT-03', 5),
        location('loc_apapa', 'Apapa Port Rd', 'Lagos', 'LOS-07', 5),
        location('loc_eleme', 'Eleme Toll', 'Rivers', 'RIV-02', 5),
      ],
      methods: [
        { method: 'rfid', count: 9 },
        { method: 'qr', count: 9 },
        { method: 'ocr', count: 9 },
        { method: 'manual', count: 0 },
      ],
      violationCategories: [
        { category: 'No Active CHL Trip', count: 5 },
        { category: 'No E-Tag', count: 5 },
        { category: 'Fake / Invalid E-Tag', count: 4 },
        { category: 'Tampered E-Tag', count: 4 },
        { category: 'Expired Trip', count: 4 },
        { category: 'Refusal to Comply', count: 4 },
        { category: 'Tag-Vehicle Mismatch', count: 4 },
      ],
      payments: { received: 12, pending: 12, tripActivatedOnPaid: 0 },
      cases: {
        unresolved: 15,
        escalated: 7,
        items: [
          caseItem('VIO-30410', 'KJA-482XY', 'No Active CHL Trip', 'payment_pending', 'Lagos'),
          caseItem('VIO-30412', 'LSR-771PB', 'Fake / Invalid E-Tag', 'escalated', 'FCT'),
          caseItem('VIO-30414', 'ENU-156HL', 'Expired Trip', 'payment_pending', 'Rivers'),
          caseItem('VIO-30416', 'PHC-388MN', 'Tag-Vehicle Mismatch', 'escalated', 'Lagos'),
          caseItem('VIO-30409', 'KJA-482XY', 'E-Tag Missing', 'escalated', 'Lagos'),
          caseItem('VIO-30407', 'ENU-156HL', 'Invalid E-Tag', 'escalated', 'Rivers'),
        ],
      },
      repeatVehicles: {
        open: 4,
        withoutFollowUp: 3,
        items: [
          { plate: 'KJA-482-XY', reports: 3, agents: 2, area: 'Lagos', followUp: 'none' },
          { plate: 'ENU-156-HL', reports: 4, agents: 2, area: 'Rivers', followUp: 'partial' },
          { plate: 'PHC-388-MN', reports: 3, agents: 2, area: 'Lagos', followUp: 'partial' },
          { plate: 'ENU-388-MN', reports: 3, agents: 2, area: 'Lagos', followUp: 'none' },
        ],
      },
      recentActivity: records,
      latestReceivedAt: latestOf(records.map((record) => record.receivedAt)),
    }
    return overview
  },
}

function latestOf(times: (string | null)[]): string | null {
  const known = times.filter((time): time is string => time !== null)
  return known.length === 0 ? null : known.reduce((a, b) => (a > b ? a : b))
}

/** Figures in table order: verifications, violations issued, unresolved, escalated, repeat alerts. */
function agentRow(
  agent: { id: string; name: string },
  [verifications, violationsIssued, unresolved, escalated, repeatAlerts]: [
    number,
    number,
    number,
    number,
    number,
  ],
  locations: string,
) {
  return {
    agentId: agent.id,
    name: agent.name,
    organization: 'Zone 1',
    verifications,
    violationsIssued,
    unresolved,
    escalated,
    repeatAlerts,
    locations,
  }
}

function location(id: string, name: string, area: string, code: string, verifications: number) {
  return {
    id,
    name,
    area,
    code,
    agents: 4,
    verifications,
    violationsIssued: 6,
    unresolved: 3,
    escalated: 1,
    repeatAlerts: 1,
  }
}

function caseItem(
  id: string,
  plate: string,
  category: string,
  status: 'payment_pending' | 'escalated',
  area: string,
) {
  return { id, plate, category, status, area }
}
