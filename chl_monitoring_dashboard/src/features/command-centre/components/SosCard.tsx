import { formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { sosStatus } from '../command-centre-display'
import type { CommandCentre, FeedItem } from '../command-centre.schemas'
import styles from './SosCard.module.css'

/** How many notifications the card lists. */
const SOS_LIMIT = 4

/**
 * "SOS monitoring": SOS notifications agents sent, where the backend exposes
 * them. Shown for awareness; the response happens outside the dashboard.
 */
export function SosCard({
  sos,
  onSelect,
}: {
  /** Null when the backend does not expose SOS notifications. */
  sos: CommandCentre['sos']
  onSelect(id: string): void
}) {
  const items = sos?.items.slice(0, SOS_LIMIT) ?? []

  return (
    <DashboardCard
      title="SOS monitoring"
      subtitle={
        sos
          ? `${sos.open} open · SOS notifications sent by agents`
          : 'SOS notifications sent by agents'
      }
      icon="command-centre/card-sos.svg"
      footer={
        <p className={styles.footer}>
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
              <SosEntry item={item} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}

function SosEntry({ item, onSelect }: { item: FeedItem; onSelect(id: string): void }) {
  const status = item.sos ? sosStatus(item.sos.status) : null
  const received = item.receivedAt ?? item.recordedAt
  return (
    <button
      type="button"
      className={item.sos?.status === 'open' ? `${styles.entry} ${styles.open}` : styles.entry}
      onClick={() => onSelect(item.id)}
    >
      <span className={styles.head}>
        <span className={styles.agent}>{item.agent.name}</span>
        {status && <StatusLabel tone={status.tone}>{status.label}</StatusLabel>}
      </span>
      {item.sos?.message && <span className={styles.message}>{item.sos.message}</span>}
      <span className={styles.meta}>
        {item.location.name} · <time dateTime={received}>{formatShortDateTime(received)}</time>
      </span>
    </button>
  )
}

/** A line above the feed while any SOS is open, naming the latest. */
export function OpenSosAlert({
  sos,
  onSelect,
}: {
  sos: CommandCentre['sos']
  onSelect(id: string): void
}) {
  const latest = sos?.items.find((item) => item.sos?.status === 'open')
  if (!sos || !latest) return null
  const received = latest.receivedAt ?? latest.recordedAt
  return (
    <div className={styles.alert} role="status">
      <span className={styles.pulse} aria-hidden="true" />
      <p className={styles.alertText}>
        <strong>
          {sos.open === 1 ? '1 open SOS notification' : `${sos.open} open SOS notifications`}
        </strong>
        <span>
          Latest from {latest.agent.name} at {latest.location.name},{' '}
          <time dateTime={received}>{formatShortDateTime(received)}</time>
        </span>
      </p>
      <button type="button" className={styles.alertButton} onClick={() => onSelect(latest.id)}>
        Show details
      </button>
    </div>
  )
}
