import { useQuery } from '@tanstack/react-query'
import { areasApi } from './areas.api'

export const areasKeys = {
  all: ['areas'] as const,
}

/** CHL's area tree. It changes rarely, so it is kept for an hour. */
export function useAreas() {
  return useQuery({
    queryKey: areasKeys.all,
    queryFn: () => areasApi.getAreas(),
    staleTime: 60 * 60_000,
  })
}
