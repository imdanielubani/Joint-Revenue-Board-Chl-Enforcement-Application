import { Link } from 'react-router'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber } from '@/shared/lib/format'
import styles from './HeadlineFigures.module.css'

export interface HeadlineFigure {
  label: string
  value: number
  /** A 16px icon in public/assets/. */
  icon: string
  /** The line under the figure, saying what it counts. */
  note: string
  /** Where the note leads, when the user may open it. */
  to?: string | undefined
}

/** A page's headline figures, four to a row, each with a note that can link onwards. */
export function HeadlineFigures({ items }: { items: readonly HeadlineFigure[] }) {
  return (
    <ul className={styles.grid} aria-label="Headline figures">
      {items.map((kpi) => (
        <li key={kpi.label} className={styles.kpi}>
          <div className={styles.panel}>
            <div className={styles.top}>
              <p className={styles.label}>{kpi.label}</p>
              <span className={styles.iconBox}>
                <img src={assetUrl(kpi.icon)} alt="" width={16} height={16} />
              </span>
            </div>
            <p className={styles.value}>{formatNumber(kpi.value)}</p>
          </div>
          {kpi.to ? (
            <Link className={`${styles.note} ${styles.noteLink}`} to={kpi.to}>
              <span>{kpi.note}</span>
              <img src={assetUrl('overview/kpi-arrow.svg')} alt="" width={16} height={16} />
            </Link>
          ) : (
            <p className={styles.note}>
              <span>{kpi.note}</span>
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
