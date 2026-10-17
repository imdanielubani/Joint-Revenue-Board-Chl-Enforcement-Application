import { useQuery } from '@tanstack/react-query'
import { violationsApi } from './violations.api'

export const violationsKeys = {
  summary: ['violations', 'summary'] as const,
}

/** How many cases need attention, for the sidebar's marker; refreshed every minute. */
export function useViolationsSummary({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: violationsKeys.summary,
    queryFn: () => violationsApi.getSummary(),
    enabled,
    refetchInterval: 60_000,
  })
}
