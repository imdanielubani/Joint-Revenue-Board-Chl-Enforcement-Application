import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { formatNumber, formatPercent } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { outcomeLabel } from '../overview-display'
import type { Overview } from '../overview.schemas'
import { useModuleLink } from '@/features/auth/use-module-link'
import styles from './OutcomesCard.module.css'

/** "Verification outcomes": each result kept separate, with its count and share. */
export function OutcomesCard({ outcomes }: { outcomes: Overview['outcomes'] }) {
  const link = useModuleLink()
  const total = outcomes.reduce((sum, item) => sum + item.count, 0)

  return (
    <DashboardCard
      title="Verification outcomes"
      subtitle="Distinct outcomes — never merged into pass/fail"
      bodyClassName={styles.body}
    >
      {outcomes.length === 0 ? (
        <p className={styles.empty}>No verification outcomes in this period.</p>
      ) : (
        <ul className={styles.list}>
          {outcomes.map(({ outcome, count }) => {
            const to = link('verifications', `${paths.verifications}?result=${outcome}`)
            const content = (
              <>
                <span>
                  <span className={styles.name}>{outcomeLabel(outcome)}</span>
                  <span className={styles.share}>{formatPercent(count, total)}</span>
                </span>
                <span className={styles.count}>{formatNumber(count)}</span>
              </>
            )
            return (
              <li key={outcome}>
                {to ? (
                  <Link className={`${styles.row} ${styles.rowLink}`} to={to}>
                    {content}
                  </Link>
                ) : (
                  <div className={styles.row}>{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </DashboardCard>
  )
}
