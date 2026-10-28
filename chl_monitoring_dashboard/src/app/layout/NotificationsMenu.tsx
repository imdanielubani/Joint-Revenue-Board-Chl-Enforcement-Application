import type { RefObject } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { isSos, typeLabel } from '@/features/notifications/notifications-display'
import type { Notification } from '@/features/notifications/notifications.schemas'
import { formatShortDateTime } from '@/shared/lib/format'
import menu from './AccountMenu.module.css'
import styles from './NotificationsMenu.module.css'
import { useMenu } from './use-menu'

interface NotificationsMenuProps {
  id: string
  triggerRef: RefObject<HTMLButtonElement | null>
  /** Unread notifications in the user's areas; undefined while loading. */
  unread: number | undefined
  /** The latest notifications, latest first; undefined while loading. */
  latest: readonly Notification[] | undefined
  /** Must be stable (useCallback): the menu sets itself up once, when it opens. */
  onClose(): void
}

/** Where a notification opens: in its popup on the Notifications page, over the history kept. */
function notificationHref(id: string): string {
  return `${paths.notifications}?${new URLSearchParams({ range: '90d', notification: id })}`
}

/**
 * The top bar's notifications menu, opened from the bell as the account menu
 * opens from the profile: the unread count, the latest notifications (each
 * opens on the Notifications page, which marks it read), and the way to all of them.
 */
export function NotificationsMenu({
  id,
  triggerRef,
  unread,
  latest,
  onClose,
}: NotificationsMenuProps) {
  const { menuRef, onKeyDown } = useMenu(triggerRef, onClose)

  return (
    <div
      ref={menuRef}
      id={id}
      className={`${menu.menu} ${styles.menu}`}
      role="menu"
      aria-label="Notifications"
      onKeyDown={onKeyDown}
    >
      <div className={menu.header} role="presentation">
        <p className={menu.name}>Notifications</p>
        <p className={menu.role}>
          {unread === undefined ? 'Loading…' : unread === 0 ? 'All read' : `${unread} unread`}
        </p>
      </div>
      <div className={menu.items} role="presentation">
        {latest === undefined ? (
          <p className={styles.note} role="presentation">
            Loading notifications…
          </p>
        ) : latest.length === 0 ? (
          <p className={styles.note} role="presentation">
            No notifications yet.
          </p>
        ) : (
          latest.map((item) => (
            <Link
              key={item.id}
              className={`${menu.item} ${styles.entry}${isSos(item) ? ` ${styles.sos}` : ''}`}
              to={notificationHref(item.id)}
              role="menuitem"
              onClick={onClose}
            >
              <span
                className={item.read ? styles.dot : `${styles.dot} ${styles.unread}`}
                aria-hidden="true"
              />
              <span className={styles.text}>
                <span className={item.read ? styles.title : `${styles.title} ${styles.bold}`}>
                  {item.title}
                </span>
                <span className={styles.meta}>
                  {typeLabel(item.type)} · {formatShortDateTime(item.receivedAt)}
                  {!item.read && <span className="visually-hidden"> · Unread</span>}
                </span>
              </span>
            </Link>
          ))
        )}
        <div className={menu.separator} role="presentation">
          <Link
            className={`${menu.item} ${styles.all}`}
            to={paths.notifications}
            role="menuitem"
            onClick={onClose}
          >
            View all notifications
          </Link>
        </div>
      </div>
    </div>
  )
}
