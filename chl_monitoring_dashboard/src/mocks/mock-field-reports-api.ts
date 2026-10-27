import type { FieldReportsApi } from '@/features/field-reports/field-reports.api'
import type {
  FieldReports,
  FieldReportsFilters,
} from '@/features/field-reports/field-reports.schemas'
import { addDays, lagosDay } from '@/shared/lib/dates'
import { delay } from './delay'
import { MOCK_AGENTS } from './mock-agent-list'
import { feedFrom, receivedTime } from './mock-command-centre-api'
import { pointsWithin } from './mock-overview-api'
import { mockRecords, startOfDay } from './mock-records'

const organizationOf = (agentId: string) =>
  MOCK_AGENTS.find((agent) => agent.id === agentId)?.organization ?? null

/**
 * The field reports and loaded / empty confirmations CHL received in an area
 * and period, from the same sample reports the Command centre shows, latest first.
 */
export function summarizeFieldReports(
  filters: FieldReportsFilters,
  now: number = Date.now(),
): FieldReports {
  const today = lagosDay(new Date(now))
  const points = pointsWithin(filters.scope)
  const from = startOfDay(filters.from)
  const to = startOfDay(addDays(filters.to, 1))
  const entries = feedFrom(mockRecords(today, now), today, now)
    .filter((entry) => {
      const at = receivedTime(entry)
      return (
        (entry.kind === 'field_report' || entry.kind === 'load_status') &&
        points.has(entry.pointId) &&
        at >= from &&
        at < to &&
        (!filters.agentId || entry.agent.id === filters.agentId) &&
        (!filters.organization || organizationOf(entry.agent.id) === filters.organization)
      )
    })
    .map(({ pointId: _pointId, at: _at, ...item }) => item)
  return {
    latestReceivedAt: entries[0]?.receivedAt ?? null,
    reports: entries.filter((entry) => entry.kind === 'field_report'),
    loadReports: entries.filter((entry) => entry.kind === 'load_status'),
  }
}

/** Sample data: the sample field reports, counted for the area and period. */
export const mockFieldReportsApi: FieldReportsApi = {
  async getFieldReports(filters) {
    await delay()
    return summarizeFieldReports(filters)
  },
}
