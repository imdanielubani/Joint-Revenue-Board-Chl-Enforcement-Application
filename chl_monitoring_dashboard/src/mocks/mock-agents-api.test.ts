import { describe, expect, it } from 'vitest'
import { agentActivitySchema, agentsMonitoringSchema } from '@/features/agents/agents.schemas'
import { presetPeriod } from '@/features/overview/overview-period'
import { isApiError } from '@/shared/api/api-error'
import { agentActivity, summarizeAgents } from './mock-agents-api'
import { summarize } from './mock-overview-api'
import { mockRecords } from './mock-records'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')
const TODAY = '2026-10-18'
const filters = (scope: string) => ({ scope, range: '30d' as const, ...presetPeriod('30d', TODAY) })
const overviewOf = (scope: string, agentId: string | null = null) =>
  summarize(mockRecords(TODAY, NOW), { ...filters(scope), agentId, organization: null })

describe('summarizeAgents', () => {
  it('returns data the schema accepts', () => {
    expect(agentsMonitoringSchema.safeParse(summarizeAgents(filters('ng'), NOW)).success).toBe(true)
  })

  it('counts each agent as the Overview does', () => {
    const { agents } = summarizeAgents(filters('ng'), NOW)
    const overview = overviewOf('ng')
    expect(agents.reduce((sum, agent) => sum + agent.metrics.verifications, 0)).toBe(
      overview.kpis.totalVerifications,
    )
    for (const agent of agents) {
      const row = overview.agents.find((entry) => entry.agentId === agent.id)
      expect(agent.metrics.verifications).toBe(row?.verifications ?? 0)
      expect(agent.metrics.violationsIssued).toBe(row?.violationsIssued ?? 0)
      expect(agent.metrics.unresolved).toBe(row?.unresolved ?? 0)
      expect(agent.metrics.escalated).toBe(row?.escalated ?? 0)
      expect(agent.metrics.repeatAlerts).toBe(row?.repeatAlerts ?? 0)
      const outcomes = agent.metrics.outcomes.reduce((sum, entry) => sum + entry.count, 0)
      expect(outcomes).toBe(agent.metrics.verifications)
      const notices = agent.metrics.demandNotices
      expect(notices.paymentReceived + notices.paymentPending).toBe(notices.issued)
      expect(notices.tripActivatedOnPaid).toBeLessThanOrEqual(notices.paymentReceived)
    }
  })

  it('lists the agents of the area, by agent ID', () => {
    expect(summarizeAgents(filters('kn'), NOW).agents.map((agent) => agent.id)).toEqual([
      'JRB-AG-0144',
    ])
    const national = summarizeAgents(filters('ng'), NOW).agents.map((agent) => agent.id)
    expect(national).toEqual([...national].sort())
    expect(national).toHaveLength(4)
  })

  it('gives the assigned scope CHL exposes, and none where it exposes none', () => {
    const { agents } = summarizeAgents(filters('ng'), NOW)
    expect(agents.find((agent) => agent.id === 'JRB-AG-0142')?.assignedScope).toEqual([
      { level: 'lga', id: 'la-ikeja', name: 'Ikeja' },
    ])
    expect(agents.find((agent) => agent.id === 'JRB-AG-0145')?.assignedScope).toBeNull()
  })
})

describe('agentActivity', () => {
  it('returns data the schema accepts', () => {
    expect(
      agentActivitySchema.safeParse(agentActivity('JRB-AG-0142', filters('ng'), NOW)).success,
    ).toBe(true)
  })

  it('holds only the agent’s records, as many as the agent’s figures', () => {
    const activity = agentActivity('JRB-AG-0142', filters('ng'), NOW)
    const { metrics } = activity.agent
    const { verifications, violations, notices, evidence } = activity.records
    expect(verifications.every((record) => record.agent.id === 'JRB-AG-0142')).toBe(true)
    expect(violations.every((record) => record.agent.id === 'JRB-AG-0142')).toBe(true)
    expect(verifications).toHaveLength(metrics.verifications)
    expect(violations).toHaveLength(metrics.violationsIssued)
    expect(evidence).toHaveLength(metrics.evidenceSubmitted)
    expect(notices).toHaveLength(metrics.demandNotices.issued)
    const ids = new Set(violations.map((violation) => violation.id))
    expect(notices.every((notice) => ids.has(notice.violationId))).toBe(true)
    expect(activity.cases.unresolved).toBe(metrics.unresolved)
    expect(activity.cases.escalated).toBe(metrics.escalated)
    expect(activity.repeatVehicles.open).toBe(metrics.repeatAlerts)
    expect(activity.locations).toHaveLength(metrics.enforcementLocations)
    expect(activity.locations.reduce((sum, location) => sum + location.verifications, 0)).toBe(
      metrics.verifications,
    )
  })

  it('lists only repeat alerts for vehicles the agent reported', () => {
    const activity = agentActivity('JRB-AG-0142', filters('ng'), NOW)
    const plates = new Set(activity.records.violations.map((violation) => violation.plate))
    const all = overviewOf('ng').repeatVehicles.items.map((item) => item.plate)
    for (const item of activity.repeatVehicles.items) {
      expect(plates.has(item.plate)).toBe(true)
      expect(all).toContain(item.plate)
    }
  })

  it('answers 404 for an agent the user may not see in the area', () => {
    const notFound = (agentId: string, scope: string) => {
      try {
        agentActivity(agentId, filters(scope), NOW)
        return false
      } catch (error) {
        return isApiError(error) && error.status === 404
      }
    }
    expect(notFound('JRB-AG-0142', 'kn')).toBe(true)
    expect(notFound('JRB-AG-9999', 'ng')).toBe(true)
    expect(notFound('JRB-AG-0144', 'kn')).toBe(false)
  })
})
