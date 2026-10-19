import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { agentsApi } from './agents.api'
import type { AgentsFilters } from './agents.schemas'

const period = (filters: AgentsFilters) =>
  [filters.scope, filters.range, filters.from, filters.to] as const

export const agentsKeys = {
  all: ['agents'] as const,
  monitoring: (filters: AgentsFilters) => ['agents', 'monitoring', ...period(filters)] as const,
  activity: (agentId: string, filters: AgentsFilters) =>
    ['agents', 'activity', agentId, ...period(filters)] as const,
}

/** The agents the user may see, for filters; kept for ten minutes. */
export function useAgents() {
  return useQuery({
    queryKey: agentsKeys.all,
    queryFn: () => agentsApi.getAgents(),
    staleTime: 10 * 60_000,
  })
}

/** The agents in an area with what they recorded; the previous answer stays while another loads. */
export function useAgentsMonitoring(filters: AgentsFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: agentsKeys.monitoring(filters),
    queryFn: () => agentsApi.getMonitoring(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}

/** One agent's records and follow-up; nothing is fetched until an agent is chosen. */
export function useAgentActivity(
  agentId: string | null,
  filters: AgentsFilters,
  { enabled = true } = {},
) {
  return useQuery({
    queryKey: agentsKeys.activity(agentId ?? '', filters),
    queryFn: () => agentsApi.getActivity(agentId ?? '', filters),
    enabled: enabled && agentId !== null,
  })
}
