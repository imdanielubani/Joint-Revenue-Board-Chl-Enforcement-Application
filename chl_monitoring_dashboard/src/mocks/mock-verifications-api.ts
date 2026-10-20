import type { VerificationsApi } from '@/features/verifications/verifications.api'
import type {
  Provenance,
  VerificationEntry,
  VerificationsFilters,
  VerificationsMonitoring,
} from '@/features/verifications/verifications.schemas'
import { lagosDay } from '@/shared/lib/dates'
import { delay } from './delay'
import { MOCK_AGENTS } from './mock-agent-list'
import { agentOf, noticeIdOf, placeOf } from './mock-geography-api'
import { etagResultOf, pointsWithin } from './mock-overview-api'
import { mockRecords, unit, type MockRecord } from './mock-records'
import { tripOf } from './mock-trips'
import { VEHICLE_TYPES, vehicleIdOf } from './mock-vehicles'

const indexOf = (record: MockRecord) => Number(record.id.replace(/\D/g, ''))

/**
 * Where the result came from: a live check was answered by CHL's backend; about
 * half the records sent later were answered from the phone's cached CHL data,
 * the rest were recorded with no connection at all.
 */
function provenanceOf(record: MockRecord): Provenance {
  if (record.source === 'live') return 'live_backend'
  return unit(indexOf(record) * 7 + 5) < 0.5 ? 'cached_result' : 'offline_origin'
}

function entryOf(record: MockRecord): VerificationEntry {
  const provenance = provenanceOf(record)
  const violation = record.violation
  const iso = (ms: number) => new Date(ms).toISOString()
  const resolved = record.outcome !== 'vehicle_not_found'
  return {
    id: record.id,
    reference: record.reference,
    plate: record.plate,
    method: record.method,
    result: record.outcome,
    agent: agentOf(record),
    location: placeOf(record),
    position: record.position,
    recordedAt: iso(record.recordedAt),
    receivedAt: iso(record.receivedAt),
    source: record.source,
    syncStatus: record.syncStatus,
    etag: etagResultOf(record),
    provenance,
    // CHL logs whether its own requests succeeded; records answered on the phone carry none.
    attempt:
      provenance === 'live_backend'
        ? record.outcome === 'verification_unavailable'
          ? 'unsuccessful'
          : 'successful'
        : null,
    vehicle: resolved
      ? { id: vehicleIdOf(record.plate), type: VEHICLE_TYPES[record.plate] ?? null }
      : { id: null, type: null },
    tripId: tripOf(record)?.reference ?? null,
    actionTaken: violation
      ? 'violation_issued'
      : provenance === 'offline_origin'
        ? null
        : 'no_violation',
    violation: violation
      ? { id: violation.id, category: violation.category, status: violation.status }
      : null,
    payment: violation?.notice ? { id: noticeIdOf(violation.id), status: violation.notice } : null,
  }
}

/**
 * The verifications for an area, period, agent and organization, from the
 * same sample records the Overview counts, so every view agrees.
 */
export function summarizeVerifications(
  filters: VerificationsFilters,
  now: number = Date.now(),
): VerificationsMonitoring {
  const { from, to, agentId, organization } = filters
  const points = pointsWithin(filters.scope)
  const organizationOf = new Map(MOCK_AGENTS.map((agent) => [agent.id, agent.organization]))
  const all = mockRecords(lagosDay(new Date(now)), now)
  const inScope = all.filter((record) => points.has(record.pointId))
  const records = inScope
    .filter(
      (record) =>
        record.day >= from &&
        record.day <= to &&
        (!agentId || record.agentId === agentId) &&
        (!organization || organizationOf.get(record.agentId) === organization),
    )
    .sort((a, b) => b.recordedAt - a.recordedAt)
  const latest = inScope.reduce<number | null>(
    (max, record) => (max === null || record.receivedAt > max ? record.receivedAt : max),
    null,
  )
  return {
    latestReceivedAt: latest === null ? null : new Date(latest).toISOString(),
    records: records.map(entryOf),
  }
}

/** Sample data: counted from the sample records. */
export const mockVerificationsApi: VerificationsApi = {
  async getMonitoring(filters) {
    await delay()
    return summarizeVerifications(filters)
  },
}
