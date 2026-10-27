import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from './notifications.api'
import type { NotificationsFilters } from './notifications.schemas'

export const notificationsKeys = {
  all: ['notifications'] as const,
  summary: ['notifications', 'summary'] as const,
  list: (filters: NotificationsFilters) =>
    [
      'notifications',
      'list',
      filters.scope,
      filters.range,
      filters.from,
      filters.to,
      filters.agentId,
      filters.organization,
    ] as const,
}

/** The unread count for the sidebar and the top bar's bell; refreshed every minute. */
export function useNotificationsSummary({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: notificationsKeys.summary,
    queryFn: () => notificationsApi.getSummary(),
    enabled,
    refetchInterval: 60_000,
  })
}

/** The notifications in an area and period; the previous answer stays while another loads. */
export function useNotifications(filters: NotificationsFilters, { enabled = true } = {}) {
  return useQuery({
    queryKey: notificationsKeys.list(filters),
    queryFn: () => notificationsApi.getNotifications(filters),
    enabled,
    placeholderData: keepPreviousData,
  })
}

/** Marks notifications read, then reloads the lists and the unread count. */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: readonly string[]) => notificationsApi.markRead(ids),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationsKeys.all }),
  })
}
