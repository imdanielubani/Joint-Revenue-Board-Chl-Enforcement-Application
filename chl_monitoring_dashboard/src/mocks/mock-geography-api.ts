import type { GeographyApi } from '@/features/geography/geography.api'
import type { Geography, GeographyFilters } from '@/features/geography/geography.schemas'
import { lagosDay } from '@/shared/lib/dates'
import { delay } from './delay'
import { MOCK_AREAS } from './mock-areas-api'
import { pointsWithin, summarize } from './mock-overview-api'
import { mockRecords, pointById } from './mock-records'

/**
 * The geography for an area and period, counted from the sample records with
 * the Overview's own counting, so every view agrees.
 */
export function summarizeGeography(filters: GeographyFilters, now: number = Date.now()): Geography {
  const records = mockRecords(lagosDay(new Date(now)), now)
  const scoped = (scope: string) =>
    summarize(records, { ...filters, scope, agentId: null, organization: null })

  // The children come from the area tree (CHL's configuration), never from the levels.
  const areas = MOCK_AREAS.filter((area) => area.parentId === filters.scope).map((area) => {
    const figures = scoped(area.id)
    return {
      id: area.id,
      name: area.name,
      level: area.level,
      verifications: figures.kpis.totalVerifications,
      activeTrip: figures.kpis.activeTripResults,
      noActiveTrip: figures.kpis.noActiveTripResults,
      agents: figures.kpis.agentsWithActivity,
      violations: figures.kpis.violationsIssued,
      unresolved: figures.kpis.unresolvedViolations,
      escalated: figures.kpis.escalatedViolations,
      repeatAlerts: figures.kpis.openRepeatAlerts,
      payments: { received: figures.payments.received, pending: figures.payments.pending },
      locations: pointsWithin(area.id).size,
      reportingLocations: figures.reportingLocations,
    }
  })

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

  return { areas, locations }
}

/** Sample data: counted from the sample records. */
export const mockGeographyApi: GeographyApi = {
  async getGeography(filters) {
    await delay()
    return summarizeGeography(filters)
  },
}
