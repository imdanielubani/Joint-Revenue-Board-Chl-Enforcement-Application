import type { Agent, AgentsApi } from '@/features/agents/agents.api'
import { delay } from './delay'

/** The design's four sample agents, in two organizations so the filter has a choice. */
export const MOCK_AGENTS: Agent[] = [
  { id: 'JRB-AG-0142', name: 'Tunde Okafor', organization: 'Zone 1' },
  { id: 'JRB-AG-0143', name: 'Grace Bello', organization: 'Zone 1' },
  { id: 'JRB-AG-0144', name: 'Musa Ibrahim', organization: 'Zone 2' },
  { id: 'JRB-AG-0145', name: 'Ada Nwosu', organization: 'Zone 2' },
]

export const mockAgentsApi: AgentsApi = {
  async getAgents() {
    await delay()
    return MOCK_AGENTS
  },
}
