import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { assetUrl } from '@/shared/lib/asset-url'
import styles from './SummaryStrip.module.css'

interface SummaryStripProps {
  title: string
  /** The line under the title: what the figures below cover. */
  meta: ReactNode
  /** A link on the right, when the user may open where it goes. */
  link?: { label: string; to: string } | undefined
}

/** The pale green strip under the filters, saying what the page's figures cover. */
export function SummaryStrip({ title, meta, link }: SummaryStripProps) {
  return (
    <div className={styles.strip}>
      <span className={styles.stripIcon}>
        <img src={assetUrl('overview/strip-shield.svg')} alt="" width={21} height={21} />
      </span>
      <div className={styles.stripText}>
        <p className={styles.stripTitle}>{title}</p>
        <p className={styles.stripMeta}>{meta}</p>
      </div>
      {link && (
        <Link className={styles.stripLink} to={link.to}>
          {link.label}
          <img src={assetUrl('overview/strip-arrow.svg')} alt="" width={16} height={16} />
        </Link>
      )}
      <span className={styles.stripGrid} aria-hidden="true" />
    </div>
  )
}
