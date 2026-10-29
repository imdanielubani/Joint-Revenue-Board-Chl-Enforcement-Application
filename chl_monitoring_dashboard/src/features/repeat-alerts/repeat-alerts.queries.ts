import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { repeatAlertsApi } from './repeat-alerts.api'
import type { RepeatAlertsFilters } from './repeat-alerts.schemas'

export const repeatAlertsKeys = {
  list: (filters: RepeatAlertsFilters) =>
    [
      'repeat-alerts',
      filters.scope,
      filters.range,
      filters.from,
      filters.to,
      filters.agentId,
      filters.organization,
    ] as const,
}

/** The repeat-vehicle alerts in an area and period; the previous answer stays while another loads. */
export function useRepeatAlerts(filters: RepeatAlertsFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: repeatAlertsKeys.list(filters),
    queryFn: () => repeatAlertsApi.getRepeatAlerts(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}
