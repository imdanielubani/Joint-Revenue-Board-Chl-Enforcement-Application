import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from './notifications.api'

export const notificationsKeys = {
  summary: ['notifications', 'summary'] as const,
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
