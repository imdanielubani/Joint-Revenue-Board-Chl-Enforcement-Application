import type { OverviewApi } from '@/features/overview/overview.api'
import {
  ETAG_RESULTS,
  VERIFICATION_METHODS,
  type EtagResult,
  VERIFICATION_OUTCOMES,
  type ActivityRecord,
  type AgentRow,
  type CaseItem,
  type LocationRow,
  type Overview,
  type OverviewFilters,
  type RepeatVehicle,
} from '@/features/overview/overview.schemas'
import { periodDays } from '@/features/overview/overview-period'
import { addDays, lagosDay } from '@/shared/lib/dates'
import { delay } from './delay'
import { MOCK_AGENTS } from './mock-agents-api'
import { MOCK_AREAS } from './mock-areas-api'
import { mockRecords, pointById, type MockRecord } from './mock-records'

/** A vehicle needs this many qualifying reports to raise a repeat-vehicle alert (SRD 11.1). */
const REPEAT_THRESHOLD = 3

/**
 * The E-Tag check a sample record stands for: a missing, fake or mismatched tag
 * from its result; otherwise a valid tag when it was an RFID read. Records
 * checked another way had no tag check.
 */
function etagResultOf(record: MockRecord): EtagResult | null {
  if (record.outcome === 'etag_missing') return 'missing'
  if (record.outcome === 'invalid_etag') return 'invalid'
  if (record.outcome === 'tag_vehicle_mismatch') return 'mismatch'
  return record.method === 'rfid' ? 'valid' : null
}

const agentById = new Map(MOCK_AGENTS.map((agent) => [agent.id, agent]))

/** The enforcement points in an area and everything under it. */
export function pointsWithin(areaId: string): Set<string> {
  const children = new Map<string, string[]>()
  for (const area of MOCK_AREAS) {
    if (area.parentId)
      children.set(area.parentId, [...(children.get(area.parentId) ?? []), area.id])
  }
  const within = new Set<string>()
  const visit = (id: string) => {
    within.add(id)
    for (const child of children.get(id) ?? []) visit(child)
  }
  visit(areaId)
  return new Set([...within].filter((id) => pointById.has(id)))
}

const isOpen = (record: MockRecord) =>
  record.violation !== null &&
  ['payment_pending', 'awaiting_action', 'escalated'].includes(record.violation.status)
const isEscalated = (record: MockRecord) => record.violation?.status === 'escalated'
/** A report that counts towards a repeat-vehicle alert: a violation not cancelled. */
const qualifies = (record: MockRecord) =>
  record.violation !== null && record.violation.status !== 'cancelled'

function countBy<T>(items: readonly T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1)
  return counts
}

function repeatVehicles(records: readonly MockRecord[]): RepeatVehicle[] {
  const byPlate = new Map<string, MockRecord[]>()
  for (const record of records.filter(qualifies)) {
    byPlate.set(record.plate, [...(byPlate.get(record.plate) ?? []), record])
  }
  const alerts: RepeatVehicle[] = []
  for (const [plate, reports] of byPlate) {
    if (reports.length < REPEAT_THRESHOLD || !reports.some(isOpen)) continue
    const latest = reports.reduce((a, b) => (a.recordedAt > b.recordedAt ? a : b))
    const followedUp = reports.some((report) =>
      ['escalated', 'resolved'].includes(report.violation?.status ?? ''),
    )
    alerts.push({
      plate,
      reports: reports.length,
      agents: new Set(reports.map((report) => report.agentId)).size,
      area: pointById.get(latest.pointId)?.state ?? '',
      followUp: followedUp ? 'partial' : 'none',
    })
  }
  return alerts.sort((a, b) => b.reports - a.reports || a.plate.localeCompare(b.plate))
}

function activity(record: MockRecord): ActivityRecord {
  const point = pointById.get(record.pointId)
  const agent = agentById.get(record.agentId)
  return {
    id: record.id,
    plate: record.plate,
    reference: record.reference,
    method: record.method,
    result: record.outcome,
    agent: { id: record.agentId, name: agent?.name ?? record.agentId },
    recordedAt: new Date(record.recordedAt).toISOString(),
    actionStatus: record.violation?.status ?? 'no_violation',
    location: {
      name: point?.name ?? record.pointId,
      area: point?.state ?? '',
      code: point?.code ?? '',
    },
    source: record.source,
    syncStatus: record.syncStatus,
    receivedAt: new Date(record.receivedAt).toISOString(),
  }
}

/** Counts every Overview figure from the sample records that match the filters. */
export function summarize(all: readonly MockRecord[], filters: OverviewFilters): Overview {
  const { from, to, agentId, organization } = filters
  const points = pointsWithin(filters.scope)
  const records = all.filter(
    (record) =>
      record.day >= from &&
      record.day <= to &&
      points.has(record.pointId) &&
      (!agentId || record.agentId === agentId) &&
      (!organization || agentById.get(record.agentId)?.organization === organization),
  )
  const violations = records.filter((record) => record.violation !== null)
  const repeats = repeatVehicles(records)
  const repeatPlates = new Set(repeats.map((repeat) => repeat.plate))
  const raisedRepeat = (subset: readonly MockRecord[]) =>
    new Set(subset.filter((r) => qualifies(r) && repeatPlates.has(r.plate)).map((r) => r.plate))
      .size

  const perDay = countBy(records, (record) => record.day)
  const days = periodDays({ from, to })
  const outcomes = countBy(records, (record) => record.outcome)
  const methods = countBy(records, (record) => record.method)
  const categories = countBy(violations, (record) => record.violation?.category ?? '')

  const agents: AgentRow[] = MOCK_AGENTS.flatMap((agent) => {
    const own = records.filter((record) => record.agentId === agent.id)
    if (own.length === 0) return []
    const states = [...new Set(own.map((record) => pointById.get(record.pointId)?.state ?? ''))]
    return [
      {
        agentId: agent.id,
        name: agent.name,
        organization: agent.organization ?? '—',
        verifications: own.length,
        violationsIssued: own.filter((record) => record.violation !== null).length,
        unresolved: own.filter(isOpen).length,
        escalated: own.filter(isEscalated).length,
        repeatAlerts: raisedRepeat(own),
        locations: states.sort().join(', '),
      },
    ]
  })

  const locations: LocationRow[] = [...points].flatMap((pointId) => {
    const point = pointById.get(pointId)
    const here = records.filter((record) => record.pointId === pointId)
    if (!point || here.length === 0) return []
    return [
      {
        id: point.id,
        name: point.name,
        area: point.state,
        code: point.code,
        agents: new Set(here.map((record) => record.agentId)).size,
        verifications: here.length,
        violationsIssued: here.filter((record) => record.violation !== null).length,
        unresolved: here.filter(isOpen).length,
        escalated: here.filter(isEscalated).length,
        repeatAlerts: raisedRepeat(here),
      },
    ]
  })

  const newestFirst = [...records].sort((a, b) => b.recordedAt - a.recordedAt)
  const openCases: CaseItem[] = newestFirst.filter(isOpen).map((record) => ({
    id: record.violation?.id ?? record.id,
    plate: record.plate,
    category: record.violation?.category ?? '',
    status: record.violation?.status ?? 'awaiting_action',
    area: pointById.get(record.pointId)?.state ?? '',
  }))
  const latestReceived = records.reduce<number | null>(
    (latest, record) =>
      latest === null || record.receivedAt > latest ? record.receivedAt : latest,
    null,
  )

  return {
    period: { from, to },
    reportingLocations: locations.length,
    latestReceivedAt: latestReceived === null ? null : new Date(latestReceived).toISOString(),
    attempts: {
      completed: records.length - (outcomes.get('verification_unavailable') ?? 0),
      notCompleted: outcomes.get('verification_unavailable') ?? 0,
    },
    kpis: {
      totalVerifications: records.length,
      activeTripResults: outcomes.get('active_trip') ?? 0,
      noActiveTripResults: outcomes.get('no_active_trip') ?? 0,
      violationsIssued: violations.length,
      agentsWithViolations: new Set(violations.map((record) => record.agentId)).size,
      unresolvedViolations: openCases.length,
      escalatedViolations: openCases.filter((item) => item.status === 'escalated').length,
      repeatVehiclesWithoutFollowUp: repeats.filter((repeat) => repeat.followUp === 'none').length,
      openRepeatAlerts: repeats.length,
      agentsWithActivity: agents.length,
      enforcementLocations: locations.length,
    },
    dailyVerifications: Array.from({ length: days }, (_, index) => {
      const date = addDays(from, index)
      return { date, count: perDay.get(date) ?? 0 }
    }),
    previousDailyVerifications: null,
    outcomes: VERIFICATION_OUTCOMES.map((outcome) => ({
      outcome,
      count: outcomes.get(outcome) ?? 0,
    })),
    agents,
    locations,
    methods: VERIFICATION_METHODS.map((method) => ({ method, count: methods.get(method) ?? 0 })),
    etagResults: ETAG_RESULTS.map((result) => ({
      result,
      count: records.filter((record) => etagResultOf(record) === result).length,
    })),
    violationCategories: [...categories]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
    payments: {
      received: violations.filter((record) => record.violation?.notice === 'received').length,
      pending: violations.filter((record) => record.violation?.notice === 'pending').length,
      tripActivatedOnPaid: violations.filter((record) => record.violation?.tripActivated).length,
    },
    cases: {
      unresolved: openCases.length,
      escalated: openCases.filter((item) => item.status === 'escalated').length,
      items: openCases,
    },
    repeatVehicles: {
      open: repeats.length,
      withoutFollowUp: repeats.filter((repeat) => repeat.followUp === 'none').length,
      items: repeats,
    },
    recentActivity: newestFirst.map(activity),
  }
}

/**
 * Sample data: every figure is counted from the sample records
 * (mock-records.ts) for the chosen area, period, agent and organization.
 */
export const mockOverviewApi: OverviewApi = {
  async getOverview(filters) {
    await delay()
    return summarize(mockRecords(lagosDay()), filters)
  },
}
