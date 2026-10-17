import type { NotificationsApi } from '@/features/notifications/notifications.api'
import { delay } from './delay'

/** Sample data: six unread notifications, as in the design. */
export const mockNotificationsApi: NotificationsApi = {
  async getSummary() {
    await delay()
    return { unread: 6 }
  },
}
