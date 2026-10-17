import { useQuery } from '@tanstack/react-query'
import { agentsApi } from './agents.api'

export const agentsKeys = {
  all: ['agents'] as const,
}

/** The agents the user may see, for filters; kept for ten minutes. */
export function useAgents() {
  return useQuery({
    queryKey: agentsKeys.all,
    queryFn: () => agentsApi.getAgents(),
    staleTime: 10 * 60_000,
  })
}
