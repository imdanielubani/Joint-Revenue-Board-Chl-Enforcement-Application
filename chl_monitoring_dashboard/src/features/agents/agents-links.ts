import { paths } from '@/config/paths'
import { FILTER_PARAMS } from '@/features/overview/use-overview-filters'

const PERIOD_PARAMS = [
  FILTER_PARAMS.scope,
  FILTER_PARAMS.range,
  FILTER_PARAMS.from,
  FILTER_PARAMS.to,
] as const

/**
 * The area and period from an address ("?scope=la&range=7d"), so moving between
 * the agents list and an agent's page keeps them; anything else is left behind.
 */
export function periodSearch(search: string): string {
  const current = new URLSearchParams(search)
  const kept = new URLSearchParams()
  for (const key of PERIOD_PARAMS) {
    const value = current.get(key)
    if (value) kept.set(key, value)
  }
  const text = kept.toString()
  return text ? `?${text}` : ''
}

/** An agent's page, for the same area and period as the page linking to it. */
export const agentPageLink = (agentId: string, search: string) =>
  `${paths.agent(agentId)}${periodSearch(search)}`

/** The agents list, for the same area and period as the agent's page. */
export const agentsListLink = (search: string) => `${paths.agents}${periodSearch(search)}`
