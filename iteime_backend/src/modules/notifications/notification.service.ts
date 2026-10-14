import type { Database } from '../../database/pool.js';
import { AppError } from '../../shared/errors.js';
import { decodeCursor, isUuid, toPage, type Page } from '../../shared/pagination.js';
import {
  countUnread,
  listNotifications,
  markAllRead,
  markRead,
  type Notification,
} from './notification.repository.js';

/** A notification as the app is shown it. */
export interface NotificationView {
  id: string;
  category: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  createdAt: string;
  read: boolean;
}

export function notificationView(notification: Notification): NotificationView {
  return {
    id: notification.id,
    category: notification.category,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    createdAt: notification.createdAt.toISOString(),
    read: notification.readAt !== null,
  };
}

/** Each agent's notifications inbox. */
export class NotificationService {
  constructor(private readonly database: Database) {}

  /** A page of the agent's notifications, newest first, with the unread count. */
  async list(
    agentId: string,
    query: { limit: number; cursor?: string },
  ): Promise<Page<NotificationView> & { unread: number }> {
    const [rows, unread] = await Promise.all([
      listNotifications(this.database, agentId, {
        limit: query.limit + 1,
        before: decodeCursor(query.cursor),
      }),
      countUnread(this.database, agentId),
    ]);
    return { ...toPage(rows, query.limit, notificationView), unread };
  }

  unreadCount(agentId: string): Promise<number> {
    return countUnread(this.database, agentId);
  }

  /** Marks one of the agent's notifications read; 404 for any other. */
  async markRead(agentId: string, id: string): Promise<void> {
    if (!isUuid(id) || !(await markRead(this.database, agentId, id))) {
      throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'No such notification.');
    }
  }

  /** Marks all of the agent's notifications read; returns how many changed. */
  markAllRead(agentId: string): Promise<number> {
    return markAllRead(this.database, agentId);
  }
}
