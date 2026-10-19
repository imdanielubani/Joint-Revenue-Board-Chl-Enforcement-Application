import { areaTitle } from '@/features/geography/areas'
import type { AgentSummary } from './agents.schemas'

/** The vendor or organization, or a plain word where CHL records none. */
export const organizationLabel = (organization: string | null) => organization ?? 'Not recorded'

/** Shown where CHL does not expose an agent's assigned scope: never guessed. */
export const SCOPE_NOT_EXPOSED = 'Not exposed by CHL'

/** "Ikeja LGA, FCT" from the areas CHL assigns the agent to; null when CHL exposes none. */
export function assignedScopeText(agent: Pick<AgentSummary, 'assignedScope'>): string | null {
  if (agent.assignedScope === null) return null
  if (agent.assignedScope.length === 0) return 'None assigned'
  return agent.assignedScope.map(areaTitle).join(', ')
}

/** Each assigned area by its title, which already says its level: "Ikeja LGA", "FCT". */
export function assignedAreas(agent: Pick<AgentSummary, 'assignedScope'>) {
  return (agent.assignedScope ?? []).map((area) => ({ id: area.id, title: areaTitle(area) }))
}

/** An agent recorded something in the period: every record starts with a verification. */
export const hasActivity = (agent: AgentSummary) => agent.metrics.verifications > 0

/** The figures of the agents in view, added up. Repeat alerts are left out: two agents can report one vehicle. */
export function totalsOf(agents: readonly AgentSummary[]) {
  const sum = (pick: (agent: AgentSummary) => number) =>
    agents.reduce((total, agent) => total + pick(agent), 0)
  return {
    agents: agents.length,
    active: agents.filter(hasActivity).length,
    verifications: sum((agent) => agent.metrics.verifications),
    violationsIssued: sum((agent) => agent.metrics.violationsIssued),
    evidenceSubmitted: sum((agent) => agent.metrics.evidenceSubmitted),
    unresolved: sum((agent) => agent.metrics.unresolved),
    escalated: sum((agent) => agent.metrics.escalated),
  }
}

export type OrganizationSummary = ReturnType<typeof totalsOf> & {
  /** Null for agents CHL records no organization for. */
  name: string | null
}

/** The agents in view grouped by vendor or organization, by name; agents with none come last. */
export function organizationsOf(agents: readonly AgentSummary[]): OrganizationSummary[] {
  const groups = new Map<string | null, AgentSummary[]>()
  for (const agent of agents) {
    groups.set(agent.organization, [...(groups.get(agent.organization) ?? []), agent])
  }
  return [...groups]
    .map(([name, members]) => ({ name, ...totalsOf(members) }))
    .sort((a, b) => (a.name === null ? 1 : b.name === null ? -1 : a.name.localeCompare(b.name)))
}

/** "TO" for Tunde Okafor: the agent's initials, for the identity card. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ''
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}
