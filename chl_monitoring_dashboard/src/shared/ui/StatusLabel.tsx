import type { ReactNode } from 'react'
import { assetUrl } from '@/shared/lib/asset-url'
import styles from './StatusLabel.module.css'

/**
 * The label's colours. "amber" is the softer warning used for expired trips
 * and pending payments; "warning" the brighter one.
 */
export type StatusTone = 'success' | 'warning' | 'amber' | 'danger' | 'info'

interface StatusLabelProps {
  tone: StatusTone
  /** A 12px icon in public/assets/, drawn in its own colour. */
  icon?: string
  children: ReactNode
}

/** A coloured status pill: "Escalated", "Payment Pending", "Active Trip". */
export function StatusLabel({ tone, icon, children }: StatusLabelProps) {
  return (
    <span className={`${styles.label} ${styles[tone]} ${icon ? styles.withIcon : ''}`}>
      {icon && (
        <span className={styles.icon}>
          <img src={assetUrl(icon)} alt="" width={12} height={12} />
        </span>
      )}
      {children}
    </span>
  )
}
