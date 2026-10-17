import type { ReactNode } from 'react'
import { isApiError } from '@/shared/api/api-error'
import styles from './StatePanel.module.css'

type StatePanelProps =
  | { kind: 'loading'; message?: string }
  | { kind: 'empty'; message: string; action?: ReactNode }
  | { kind: 'error'; error: unknown; onRetry?: () => void }

/** The loading, empty and error states every data screen needs. */
export function StatePanel(props: StatePanelProps) {
  if (props.kind === 'loading') {
    return (
      <div className={styles.panel} role="status" aria-live="polite">
        <span className={styles.spinner} aria-hidden="true" />
        <p>{props.message ?? 'Loading…'}</p>
      </div>
    )
  }

  if (props.kind === 'empty') {
    return (
      <div className={styles.panel}>
        <p>{props.message}</p>
        {props.action}
      </div>
    )
  }

  return (
    <div className={`${styles.panel} ${styles.error}`} role="alert">
      <p>{errorMessage(props.error)}</p>
      {props.onRetry && (
        <button type="button" className={styles.retry} onClick={props.onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  return 'Something went wrong. Try again.'
}
