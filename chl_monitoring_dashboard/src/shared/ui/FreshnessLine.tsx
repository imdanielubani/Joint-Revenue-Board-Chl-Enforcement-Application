import { lagosDay } from '@/shared/lib/dates'
import { formatClock, formatShortDateTime } from '@/shared/lib/format'
import styles from './FreshnessLine.module.css'

/** After this long without a field record, the time is shown in amber. */
const FIELD_DATA_DELAY_MS = 2 * 60 * 60_000

interface FreshnessLineProps {
  /** When the figures on screen were fetched (ms); nothing shows before the first answer. */
  checkedAt: number
  /** When CHL last received a field record for these figures; null when none came. */
  latestReceivedAt: string | null | undefined
}

/**
 * Right of the filters: when field data last reached CHL, and when the page
 * last checked. Field data can be delayed, so the two are kept apart (SRD 13).
 */
export function FreshnessLine({ checkedAt, latestReceivedAt }: FreshnessLineProps) {
  if (checkedAt <= 0) return null
  return (
    <div className={styles.freshness}>
      {latestReceivedAt !== undefined && (
        <FieldDataFreshness receivedAt={latestReceivedAt} checkedAt={checkedAt} />
      )}
      <p className={styles.checked}>
        <span className={styles.checkedDot} aria-hidden="true" />
        Last checked {formatClock(checkedAt)}
      </p>
    </div>
  )
}

/**
 * When CHL last received a record from the field. Records made offline reach
 * CHL later, so the figures may not include everything that has happened.
 */
function FieldDataFreshness({
  receivedAt,
  checkedAt,
}: {
  receivedAt: string | null
  checkedAt: number
}) {
  const explanation =
    'When CHL last received a record from the field for these figures. Records made offline arrive later, so recent activity may still be on its way.'
  if (!receivedAt) {
    return (
      <p className={`${styles.checked} ${styles.fieldDelayed}`} title={explanation}>
        <span className={`${styles.checkedDot} ${styles.delayedDot}`} aria-hidden="true" />
        No field records received
      </p>
    )
  }
  const received = new Date(receivedAt)
  const delayed = checkedAt - received.getTime() > FIELD_DATA_DELAY_MS
  const time =
    lagosDay(received) === lagosDay(new Date(checkedAt))
      ? formatClock(received)
      : formatShortDateTime(received)
  return (
    <p
      className={delayed ? `${styles.checked} ${styles.fieldDelayed}` : styles.checked}
      title={explanation}
    >
      <span
        className={delayed ? `${styles.checkedDot} ${styles.delayedDot}` : styles.checkedDot}
        aria-hidden="true"
      />
      <span>
        Field data received <time dateTime={received.toISOString()}>{time}</time>
        {delayed && ' · may be delayed'}
      </span>
    </p>
  )
}
