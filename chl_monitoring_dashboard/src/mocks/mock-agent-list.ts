import type { Agent } from '@/features/agents/agents.api'

/**
 * The design's four sample agents who record in the field, in two organizations
 * so the filter has a choice. The sample records and field reports are drawn
 * from these four only, so adding an agent below never changes them.
 */
export const FIELD_AGENTS: Agent[] = [
  { id: 'JRB-AG-0142', name: 'Tunde Okafor', organization: 'Zone 1' },
  { id: 'JRB-AG-0143', name: 'Grace Bello', organization: 'Zone 1' },
  { id: 'JRB-AG-0144', name: 'Musa Ibrahim', organization: 'Zone 2' },
  { id: 'JRB-AG-0145', name: 'Ada Nwosu', organization: 'Zone 2' },
]

/**
 * Every sample agent the user may see. Chidi Eze is newly assigned and has
 * recorded nothing yet, and CHL records no organization for him: the pages
 * show both as they are, never as missing data.
 *
 * Kept apart from the agents' sample API, which counts from the sample records:
 * the records and the counting both need this list first.
 */
export const MOCK_AGENTS: Agent[] = [
  ...FIELD_AGENTS,
  { id: 'JRB-AG-0146', name: 'Chidi Eze', organization: null },
]
