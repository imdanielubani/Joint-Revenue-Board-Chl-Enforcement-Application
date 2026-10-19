import type { Agent } from '@/features/agents/agents.api'

/**
 * The design's four sample agents, in two organizations so the filter has a choice.
 * Kept apart from the agents' sample API, which counts from the sample records:
 * the records and the counting both need this list first.
 */
export const MOCK_AGENTS: Agent[] = [
  { id: 'JRB-AG-0142', name: 'Tunde Okafor', organization: 'Zone 1' },
  { id: 'JRB-AG-0143', name: 'Grace Bello', organization: 'Zone 1' },
  { id: 'JRB-AG-0144', name: 'Musa Ibrahim', organization: 'Zone 2' },
  { id: 'JRB-AG-0145', name: 'Ada Nwosu', organization: 'Zone 2' },
]
