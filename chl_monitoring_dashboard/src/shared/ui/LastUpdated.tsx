import { formatDateTime } from '@/shared/lib/format'
import styles from './LastUpdated.module.css'

/**
 * When the data on screen was fetched. Field data can arrive late, so every
 * monitoring screen says how fresh its figures are.
 */
export function LastUpdated({ at }: { at: number | string | Date | null | undefined }) {
  if (!at) return null
  const date = at instanceof Date ? at : new Date(at)
  return (
    <p className={styles.text}>
      Last updated <time dateTime={date.toISOString()}>{formatDateTime(date)}</time>
    </p>
  )
}
