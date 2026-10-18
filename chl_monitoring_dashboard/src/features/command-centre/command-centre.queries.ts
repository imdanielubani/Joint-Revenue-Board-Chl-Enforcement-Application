import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { commandCentreApi } from './command-centre.api'
import type { CommandCentreFilters } from './command-centre.schemas'

export const commandCentreKeys = {
  all: ['command-centre'] as const,
  detail: (filters: CommandCentreFilters) =>
    ['command-centre', filters.scope, filters.window] as const,
}

/** How often the feed is checked for new records. */
export const COMMAND_CENTRE_REFRESH_MS = 30_000

/**
 * The Command centre's feed and cases for one area and window, checked every
 * 30 seconds. While another area or window loads, the previous answer stays.
 */
export function useCommandCentre(filters: CommandCentreFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: commandCentreKeys.detail(filters),
    queryFn: () => commandCentreApi.getCommandCentre(filters),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: COMMAND_CENTRE_REFRESH_MS,
  })
}
