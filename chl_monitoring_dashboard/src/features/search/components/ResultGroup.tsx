import { Link } from 'react-router'
import { PillLabel } from '@/features/verifications/components/RecordsPanel'
import type { Pill } from '@/features/verifications/verifications-display'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import styles from './ResultGroup.module.css'

export interface ResultItem {
  key: string
  /** The plate, name or reference. */
  main: string
  /** What it is: "VH-85627 · 12/14 tyres and its equivalent". */
  sub: string
  /** When, or how often: "4 verifications · last 3 Nov, 10:33 PM". */
  meta?: string
  pill?: Pill
  /** Its page; absent where the user may not open that module, so it is shown without a link. */
  to?: string | undefined
}

/** One kind of result: a card listing each match, each leading to its own page. */
export function ResultGroup({
  title,
  icon,
  items,
}: {
  title: string
  /** A 16px icon in public/assets/. */
  icon: string
  items: readonly ResultItem[]
}) {
  if (items.length === 0) return null
  return (
    <DashboardCard
      title={title}
      subtitle={`${items.length} found`}
      icon={icon}
      bodyClassName={styles.body}
    >
      <ul className={styles.list} aria-label={title}>
        {items.map((item) => {
          const content = (
            <>
              <span className={styles.text}>
                <span className={styles.main}>{item.main}</span>
                <span className={styles.sub}>{item.sub}</span>
              </span>
              {item.pill && <PillLabel pill={item.pill} />}
              {item.meta && <span className={styles.meta}>{item.meta}</span>}
            </>
          )
          return (
            <li key={item.key}>
              {item.to ? (
                <Link className={`${styles.item} ${styles.link}`} to={item.to}>
                  {content}
                </Link>
              ) : (
                <div className={styles.item}>{content}</div>
              )}
            </li>
          )
        })}
      </ul>
    </DashboardCard>
  )
}
