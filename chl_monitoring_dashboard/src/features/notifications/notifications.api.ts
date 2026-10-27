import { z } from 'zod'
import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockNotificationsApi } from '@/mocks/mock-notifications-api'
import {
  notificationsSchema,
  type Notifications,
  type NotificationsFilters,
} from './notifications.schemas'

export const notificationsSummarySchema = z.object({
  /** Notifications the user has not opened yet. */
  unread: z.number().int().nonnegative(),
})
export type NotificationsSummary = z.infer<typeof notificationsSummarySchema>

export interface NotificationsApi {
  /** The signed-in user's unread notifications, in their own areas. */
  getSummary(): Promise<NotificationsSummary>
  /** The notifications received in the area and period, latest first. Read-only. */
  getNotifications(filters: NotificationsFilters): Promise<Notifications>
  /**
   * Marks notifications as read for this user only (a suggested API capability
   * in the SRD). It changes no CHL record.
   */
  markRead(ids: readonly string[]): Promise<void>
}

// The paths are provisional until the backend's API is agreed.
const httpNotificationsApi: NotificationsApi = {
  getSummary: () => request('/api/v1/notifications/summary', notificationsSummarySchema),
  getNotifications: ({ scope, range, from, to, agentId, organization }) =>
    request('/api/v1/notifications', notificationsSchema, {
      query: { scope, range, from, to, agent: agentId, organization },
    }),
  markRead: (ids) =>
    request('/api/v1/notifications/read', z.undefined(), { method: 'POST', body: { ids } }),
}

export const notificationsApi: NotificationsApi = env.useMocks
  ? mockNotificationsApi
  : httpNotificationsApi
