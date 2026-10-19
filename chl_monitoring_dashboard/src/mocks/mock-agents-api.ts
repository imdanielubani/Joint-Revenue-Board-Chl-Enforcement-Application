import type { Agent, AgentsApi } from '@/features/agents/agents.api'
import type {
  AgentActivity,
  AgentsFilters,
  AgentsMonitoring,
  AgentSummary,
} from '@/features/agents/agents.schemas'
import type { GeoScope } from '@/features/auth/auth.schemas'
import type { Overview } from '@/features/overview/overview.schemas'
import { ApiError } from '@/shared/api/api-error'
import { lagosDay } from '@/shared/lib/dates'
import { delay } from './delay'
import { MOCK_AGENTS } from './mock-agent-list'
import { MOCK_AREAS } from './mock-areas-api'
import { summarizeGeography } from './mock-geography-api'
import { pointsWithin, summarize } from './mock-overview-api'
import { AGENT_POINTS, mockRecords, pointById, type MockRecord } from './mock-records'

/**
 * The areas CHL assigns each sample agent to. Ada Nwosu's is not exposed, as
 * CHL may not expose every agent's scope; her records still show where she worked.
 */
const ASSIGNED_AREAS: Record<string, readonly string[] | null> = {
  'JRB-AG-0142': ['la-ikeja'],
  'JRB-AG-0143': ['fct'],
  'JRB-AG-0144': ['kn'],
  'JRB-AG-0145': null,
}

function assignedScope(agentId: string): GeoScope[] | null {
  const ids = ASSIGNED_AREAS[agentId]
  if (!ids) return null
  return ids.flatMap((id) => {
    const area = MOCK_AREAS.find((entry) => entry.id === id)
    return area ? [{ level: area.level, id: area.id, name: area.name }] : []
  })
}

/** Whether the agent works at any enforcement location in the area. */
const worksIn = (agentId: string, points: ReadonlySet<string>) =>
  (AGENT_POINTS[agentId] ?? []).some((pointId) => points.has(pointId))

const latestOf = (records: readonly MockRecord[]) =>
  records.reduce<number | null>(
    (latest, record) =>
      latest === null || record.recordedAt > latest ? record.recordedAt : latest,
    null,
  )
const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString())

interface Context {
  filters: AgentsFilters
  records: readonly MockRecord[]
  points: ReadonlySet<string>
  /** Every agent's figures in the area and period, as the Overview counts them. */
  whole: Overview
}

function contextFor(filters: AgentsFilters, now: number): Context {
  const records = mockRecords(lagosDay(new Date(now)), now)
  return {
    filters,
    records,
    points: pointsWithin(filters.scope),
    whole: summarize(records, { ...filters, agentId: null, organization: null }),
  }
}

/** The agent's figures, counted as the Overview counts them with the agent filter on. */
function summaryOf(agent: Agent, ctx: Context): { summary: AgentSummary; own: Overview } {
  const own = summarize(ctx.records, { ...ctx.filters, agentId: agent.id, organization: null })
  const row = ctx.whole.agents.find((entry) => entry.agentId === agent.id)
  const inArea = ctx.records.filter(
    (record) => record.agentId === agent.id && ctx.points.has(record.pointId),
  )
  return {
    own,
    summary: {
      id: agent.id,
      name: agent.name,
      organization: agent.organization,
      assignedScope: assignedScope(agent.id),
      lastRecordedAt: iso(latestOf(inArea)),
      metrics: {
        verifications: own.kpis.totalVerifications,
        outcomes: own.outcomes,
        violationsIssued: own.kpis.violationsIssued,
        // Every sample violation came with photographs (see the geography's evidence records).
        evidenceSubmitted: own.kpis.violationsIssued,
        demandNotices: {
          issued: own.payments.received + own.payments.pending,
          paymentReceived: own.payments.received,
          paymentPending: own.payments.pending,
          tripActivatedOnPaid: own.payments.tripActivatedOnPaid,
        },
        unresolved: own.cases.unresolved,
        escalated: own.cases.escalated,
        // Alerts are raised across all agents' reports; the agent reported the vehicle.
        repeatAlerts: row?.repeatAlerts ?? 0,
        enforcementLocations: own.locations.length,
      },
    },
  }
}

/**
 * The agents in an area: each one assigned to or working at an enforcement
 * location in it, with what they recorded in the period, from the same sample
 * records the Overview counts. Listed by agent ID: never ranked.
 */
export function summarizeAgents(
  filters: AgentsFilters,
  now: number = Date.now(),
): AgentsMonitoring {
  const ctx = contextFor(filters, now)
  return {
    period: { from: filters.from, to: filters.to },
    latestReceivedAt: ctx.whole.latestReceivedAt,
    agents: MOCK_AGENTS.filter((agent) => worksIn(agent.id, ctx.points)).map(
      (agent) => summaryOf(agent, ctx).summary,
    ),
  }
}

/** One agent's records, locations and follow-up in the area and period. */
export function agentActivity(
  agentId: string,
  filters: AgentsFilters,
  now: number = Date.now(),
): AgentActivity {
  const ctx = contextFor(filters, now)
  const agent = MOCK_AGENTS.find((entry) => entry.id === agentId)
  if (!agent || !worksIn(agent.id, ctx.points)) {
    throw new ApiError(
      404,
      'agent_not_found',
      'This agent has no assignment or activity in the area you chose, or is not visible to your account.',
    )
  }
  const { summary, own } = summaryOf(agent, ctx)

  const scoped = summarizeGeography(filters, now).records
  const violations = scoped.violations.filter((violation) => violation.agent.id === agent.id)
  const violationIds = new Set(violations.map((violation) => violation.id))
  // The vehicles the agent reported with a violation that counts towards an alert.
  const reported = new Set(
    violations
      .filter((violation) => violation.status !== 'cancelled')
      .map((violation) => violation.plate),
  )
  const repeats = ctx.whole.repeatVehicles.items.filter((item) => reported.has(item.plate))
  const mine = ctx.records.filter((record) => record.agentId === agent.id)

  return {
    agent: summary,
    latestReceivedAt: own.latestReceivedAt,
    records: {
      verifications: scoped.verifications.filter((record) => record.agent.id === agent.id),
      violations,
      notices: scoped.notices.filter((notice) => violationIds.has(notice.violationId)),
      evidence: scoped.evidence.filter((evidence) => violationIds.has(evidence.violationId)),
    },
    locations: own.locations.map((location) => {
      const point = pointById.get(location.id)
      return {
        id: location.id,
        name: location.name,
        area: location.area,
        code: location.code,
        position: point ? { lat: point.lat, lng: point.lng } : null,
        verifications: location.verifications,
        violations: location.violationsIssued,
        lastRecordedAt: iso(latestOf(mine.filter((record) => record.pointId === location.id))),
      }
    }),
    cases: own.cases,
    repeatVehicles: {
      open: repeats.length,
      withoutFollowUp: repeats.filter((item) => item.followUp === 'none').length,
      items: repeats,
    },
  }
}

/** Sample data: counted from the sample records for the chosen area and period. */
export const mockAgentsApi: AgentsApi = {
  async getAgents() {
    await delay()
    return MOCK_AGENTS
  },
  async getMonitoring(filters) {
    await delay()
    return summarizeAgents(filters)
  },
  async getActivity(agentId, filters) {
    await delay()
    return agentActivity(agentId, filters)
  },
}
