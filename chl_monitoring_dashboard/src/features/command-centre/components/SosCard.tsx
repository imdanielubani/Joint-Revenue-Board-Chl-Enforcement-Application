import { formatDuration, formatShortDateTime } from '@/shared/lib/format'
import { useNow } from '@/shared/lib/use-now'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { sosDuration, sosStatus } from '../command-centre-display'
import type { CommandCentre, FeedItem } from '../command-centre.schemas'
import styles from './SosCard.module.css'

/** How many notifications the card lists: open ones first, then the latest. */
const SOS_LIMIT = 10

/**
 * "SOS monitoring": SOS notifications agents sent, where the backend exposes
 * them, with how long each has been (or was) open. Shown for awareness; the
 * response happens outside the dashboard.
 */
export function SosCard({
  sos,
  onSelect,
}: {
  /** Null when the backend does not expose SOS notifications. */
  sos: CommandCentre['sos']
  onSelect(id: string): void
}) {
  const now = useNow()
  const items = sos?.items.slice(0, SOS_LIMIT) ?? []
  const total = sos?.items.length ?? 0

  return (
    <DashboardCard
      title="SOS monitoring"
      subtitle={
        sos
          ? `${sos.open} open · ${total} in this window or still open · sent by agents`
          : 'SOS notifications sent by agents'
      }
      icon="command-centre/card-sos.svg"
      footer={
        <p className={styles.footer}>
          {total > items.length && `Showing ${items.length} of ${total}, open ones first. `}
          Shown for awareness. Responding to an SOS happens outside this dashboard.
        </p>
      }
    >
      {!sos ? (
        <p className={styles.empty}>
          CHL does not provide SOS notifications yet. They will appear here once it does.
        </p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>No SOS was received in this window, and none is open.</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id}>
              <SosEntry item={item} now={now} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}

function SosEntry({
  item,
  now,
  onSelect,
}: {
  item: FeedItem
  now: number
  onSelect(id: string): void
}) {
  const status = item.sos ? sosStatus(item.sos.status) : null
  const duration = sosDuration(item, now)
  const open = item.sos?.status === 'open'
  return (
    <button
      type="button"
      className={open ? `${styles.entry} ${styles.open}` : styles.entry}
      onClick={() => onSelect(item.id)}
    >
      <span className={styles.head}>
        <span className={styles.agent}>{item.agent.name}</span>
        {status && <StatusLabel tone={status.tone}>{status.label}</StatusLabel>}
      </span>
      <span
        className={item.sos?.message ? styles.message : `${styles.message} ${styles.noMessage}`}
      >
        {item.sos?.message ?? 'No message sent'}
      </span>
      <span className={styles.meta}>
        {item.location.name} · Sent{' '}
        <time dateTime={item.recordedAt}>{formatShortDateTime(item.recordedAt)}</time>
      </span>
      {duration && (
        <span className={duration.open ? `${styles.duration} ${styles.running}` : styles.duration}>
          <span className={styles.durationDot} aria-hidden="true" />
          {duration.text}
        </span>
      )}
    </button>
  )
}

/** A line above the feed while any SOS is open, naming the latest and how long it has been open. */
export function OpenSosAlert({
  sos,
  onSelect,
}: {
  sos: CommandCentre['sos']
  onSelect(id: string): void
}) {
  const now = useNow()
  const latest = sos?.items.find((item) => item.sos?.status === 'open')
  if (!sos || !latest) return null
  return (
    <div className={styles.alert} role="status">
      <span className={styles.pulse} aria-hidden="true" />
      <p className={styles.alertText}>
        <strong>
          {sos.open === 1 ? '1 open SOS notification' : `${sos.open} open SOS notifications`}
        </strong>
        <span>
          Latest from {latest.agent.name} at {latest.location.name}, sent{' '}
          <time dateTime={latest.recordedAt}>{formatShortDateTime(latest.recordedAt)}</time> · open
          for {formatDuration(latest.recordedAt, now)}
        </span>
      </p>
      <button type="button" className={styles.alertButton} onClick={() => onSelect(latest.id)}>
        Show details
      </button>
    </div>
  )
}
