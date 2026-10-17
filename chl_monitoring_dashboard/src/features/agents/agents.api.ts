import { z } from 'zod'
import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockAgentsApi } from '@/mocks/mock-agents-api'

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
}

// The path is provisional until the backend's API is agreed.
const httpAgentsApi: AgentsApi = {
  getAgents: () => request('/api/v1/agents', z.array(agentSchema)),
}

export const agentsApi: AgentsApi = env.useMocks ? mockAgentsApi : httpAgentsApi
