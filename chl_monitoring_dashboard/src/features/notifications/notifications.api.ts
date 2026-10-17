import { z } from 'zod'
import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockNotificationsApi } from '@/mocks/mock-notifications-api'

export const notificationsSummarySchema = z.object({
  /** Notifications the user has not opened yet. */
  unread: z.number().int().nonnegative(),
})
export type NotificationsSummary = z.infer<typeof notificationsSummarySchema>

export interface NotificationsApi {
  getSummary(): Promise<NotificationsSummary>
}

// The path is provisional until the backend's API is agreed.
const httpNotificationsApi: NotificationsApi = {
  getSummary: () => request('/api/v1/notifications/summary', notificationsSummarySchema),
}

export const notificationsApi: NotificationsApi = env.useMocks
  ? mockNotificationsApi
  : httpNotificationsApi
