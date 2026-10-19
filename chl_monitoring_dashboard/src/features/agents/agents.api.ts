import { z } from 'zod'
import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockAgentsApi } from '@/mocks/mock-agents-api'
import {
  agentActivitySchema,
  agentsMonitoringSchema,
  type AgentActivity,
  type AgentsFilters,
  type AgentsMonitoring,
} from './agents.schemas'

/** An enforcement agent as CHL records them; the dashboard only reads this. */
export const agentSchema = z.object({
  /** The recorded agent ID, "JRB-AG-0142": agents are matched by this, never by name. */
  id: z.string(),
  name: z.string(),
  /** The vendor or organization, where CHL records one. */
  organization: z.string().nullable(),
})
export type Agent = z.infer<typeof agentSchema>

export interface AgentsApi {
  /** The agents the user may see. */
  getAgents(): Promise<Agent[]>
  /** The agents in an area, each with what they recorded in the period. */
  getMonitoring(filters: AgentsFilters): Promise<AgentsMonitoring>
  /** One agent's records and follow-up in the area and period; 404 when the user may not see them there. */
  getActivity(agentId: string, filters: AgentsFilters): Promise<AgentActivity>
}

const periodQuery = ({ scope, range, from, to }: AgentsFilters) => ({ scope, range, from, to })

// The paths are provisional until the backend's API is agreed.
const httpAgentsApi: AgentsApi = {
  getAgents: () => request('/api/v1/agents', z.array(agentSchema)),
  getMonitoring: (filters) =>
    request('/api/v1/agents/monitoring', agentsMonitoringSchema, { query: periodQuery(filters) }),
  getActivity: (agentId, filters) =>
    request(`/api/v1/agents/${encodeURIComponent(agentId)}/activity`, agentActivitySchema, {
      query: periodQuery(filters),
    }),
}

export const agentsApi: AgentsApi = env.useMocks ? mockAgentsApi : httpAgentsApi
