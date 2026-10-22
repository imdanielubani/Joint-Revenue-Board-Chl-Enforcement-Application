import type { GeographyApi } from '@/features/geography/geography.api'
import type { Geography, GeographyFilters } from '@/features/geography/geography.schemas'
import { lagosDay } from '@/shared/lib/dates'
import { delay } from './delay'
import { MOCK_AGENTS } from './mock-agent-list'
import { pointsWithin, summarize } from './mock-overview-api'
import { mockRecords, pointById, type MockRecord } from './mock-records'

export const agentOf = (record: MockRecord) => ({
  id: record.agentId,
  name: MOCK_AGENTS.find((agent) => agent.id === record.agentId)?.name ?? record.agentId,
})
export const placeOf = (record: MockRecord) => {
  const point = pointById.get(record.pointId)
  return {
    id: record.pointId,
    name: point?.name ?? record.pointId,
    area: point?.state ?? '',
    code: point?.code ?? '',
  }
}
export const numberOf = (violationId: string) => Number(violationId.replace(/\D/g, ''))
/** The demand notice's reference, as the Command centre names it. */
export const noticeIdOf = (violationId: string) => `DN-${numberOf(violationId)}`
/** How many photographs came with a violation, as the Command centre counts them. */
export const photographsOf = (violationId: string) => 2 + (numberOf(violationId) % 4)

/**
 * The geography for an area and period: its enforcement points with their
 * recorded positions, and its underlying records, from the same sample records
 * the Overview counts, so every view agrees.
 */
export function summarizeGeography(filters: GeographyFilters, now: number = Date.now()): Geography {
  const records = mockRecords(lagosDay(new Date(now)), now)
  const scoped = (scope: string) =>
    summarize(records, { ...filters, scope, agentId: null, organization: null })

  // Every enforcement point in scope, with or without activity in the period.
  const inPeriod = scoped(filters.scope).locations
  const locations = [...pointsWithin(filters.scope)].flatMap((pointId) => {
    const point = pointById.get(pointId)
    if (!point) return []
    const row = inPeriod.find((location) => location.id === pointId)
    const last = records
      .filter((record) => record.pointId === pointId)
      .reduce<number | null>((latest, record) => Math.max(latest ?? 0, record.recordedAt), null)
    return [
      {
        id: point.id,
        name: point.name,
        area: point.state,
        code: point.code,
        position: { lat: point.lat, lng: point.lng },
        verifications: row?.verifications ?? 0,
        violations: row?.violationsIssued ?? 0,
        agents: row?.agents ?? 0,
        lastRecordedAt: last === null ? null : new Date(last).toISOString(),
      },
    ]
  })

  // The underlying records: the scope's points, the period's days (as the Overview counts).
  const points = pointsWithin(filters.scope)
  const inScope = records
    .filter(
      (record) =>
        record.day >= filters.from && record.day <= filters.to && points.has(record.pointId),
    )
    .sort((a, b) => b.recordedAt - a.recordedAt)
  const iso = (ms: number) => new Date(ms).toISOString()

  return {
    locations,
    records: {
      verifications: inScope.map((record) => ({
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
      })),
      violations: inScope.flatMap((record) =>
        record.violation
          ? [
              {
                id: record.violation.id,
                plate: record.plate,
                category: record.violation.category,
                status: record.violation.status,
                agent: agentOf(record),
                location: placeOf(record),
                position: record.position,
                recordedAt: iso(record.recordedAt),
                noticeId: record.violation.notice ? noticeIdOf(record.violation.id) : null,
                verificationReference: record.reference,
              },
            ]
          : [],
      ),
      notices: inScope.flatMap((record) =>
        record.violation?.notice
          ? [
              {
                id: noticeIdOf(record.violation.id),
                violationId: record.violation.id,
                plate: record.plate,
                status: record.violation.notice,
                tripActivated: record.violation.tripActivated,
                location: placeOf(record),
                recordedAt: iso(record.recordedAt),
              },
            ]
          : [],
      ),
      evidence: inScope.flatMap((record) =>
        record.violation
          ? [
              {
                id: `EV-${numberOf(record.violation.id)}`,
                violationId: record.violation.id,
                plate: record.plate,
                photographs: photographsOf(record.violation.id),
                status: record.syncStatus === 'evidence_pending' ? 'pending' : 'received',
                location: placeOf(record),
                position: record.position,
                recordedAt: iso(record.recordedAt),
              },
            ]
          : [],
      ),
    },
  }
}

/** Sample data: counted from the sample records. */
export const mockGeographyApi: GeographyApi = {
  async getGeography(filters) {
    await delay()
    return summarizeGeography(filters)
  },
}
