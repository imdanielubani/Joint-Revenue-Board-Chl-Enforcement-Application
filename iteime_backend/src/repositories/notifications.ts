import { onlyRow, type Queryable } from '../db/pool.js';

export interface Notification {
  id: string;
  category: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  createdAt: Date;
  readAt: Date | null;
}

interface NotificationRow {
  id: string;
  category: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  created_at: Date;
  read_at: Date | null;
}

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    data: row.data,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export interface NewNotification {
  agentId: string;
  category: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function createNotification(
  db: Queryable,
  notification: NewNotification,
): Promise<Notification> {
  const { rows } = await db.query<NotificationRow>(
    `INSERT INTO notifications (agent_id, category, title, body, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, category, title, body, data, created_at, read_at`,
    [
      notification.agentId,
      notification.category,
      notification.title,
      notification.body,
      notification.data ? JSON.stringify(notification.data) : null,
    ],
  );
  return toNotification(onlyRow(rows));
}

/** A page of an agent's notifications, newest first, after [before] when given. */
export async function listNotifications(
  db: Queryable,
  agentId: string,
  page: { limit: number; before?: { createdAt: Date; id: string } },
): Promise<Notification[]> {
  const { rows } = await db.query<NotificationRow>(
    `SELECT id, category, title, body, data, created_at, read_at FROM notifications
     WHERE agent_id = $1
       AND ($2::timestamptz IS NULL OR (created_at, id) < ($2, $3::uuid))
     ORDER BY created_at DESC, id DESC
     LIMIT $4`,
    [agentId, page.before?.createdAt ?? null, page.before?.id ?? null, page.limit],
  );
  return rows.map(toNotification);
}

export async function countUnread(db: Queryable, agentId: string): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    'SELECT count(*) FROM notifications WHERE agent_id = $1 AND read_at IS NULL',
    [agentId],
  );
  return Number(rows[0]?.count ?? 0);
}

/** Marks one notification read; false when the agent has no such notification. */
export async function markRead(db: Queryable, agentId: string, id: string): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE notifications SET read_at = COALESCE(read_at, now())
     WHERE agent_id = $1 AND id = $2`,
    [agentId, id],
  );
  return (rowCount ?? 0) > 0;
}

export async function markAllRead(db: Queryable, agentId: string): Promise<number> {
  const { rowCount } = await db.query(
    'UPDATE notifications SET read_at = now() WHERE agent_id = $1 AND read_at IS NULL',
    [agentId],
  );
  return rowCount ?? 0;
}
