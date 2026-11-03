import { useId } from 'react'
import { Link, useSearchParams } from 'react-router'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { FILTER_PARAMS } from '@/features/overview/use-overview-filters'
import { outcomeLabel, outcomeStyle } from '@/features/overview/overview-display'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber } from '@/shared/lib/format'
import { Dialog } from '@/shared/ui/Dialog'
import type { AgentSummary } from '../agents.schemas'
import { AgentIdentityDetails, AgentMetricTiles } from './AgentProfileCards'
import styles from './AgentCards.module.css'

/**
 * "Agent details": the popup the register's "View details" opens — the agent's
 * identity and assigned scope, their documented metrics and verification
 * results for the period, and ways to their full activity on the page and to
 * their recorded verification attempts in the verification history.
 */
export function AgentDetailsDialog({
  agent,
  periodText,
  onClose,
  onShowActivity,
}: {
  agent: AgentSummary
  /** "Last 14 days", or the dates of a custom range. */
  periodText: string
  onClose(): void
  /** Opens the agent's records, locations and follow-up below the register. */
  onShowActivity(): void
}) {
  const metricsId = useId()
  const resultsId = useId()
  const results = agent.metrics.outcomes.filter((entry) => entry.count > 0)
  const [params] = useSearchParams()
  // The agent's attempts over the page's area and period, where the user may open the history.
  const history = new URLSearchParams()
  for (const key of [
    FILTER_PARAMS.scope,
    FILTER_PARAMS.range,
    FILTER_PARAMS.from,
    FILTER_PARAMS.to,
  ]) {
    const value = params.get(key)
    if (value) history.set(key, value)
  }
  history.set(FILTER_PARAMS.agent, agent.id)
  const historyLink = useModuleLink()('history', `${paths.history}?${history}`)
  return (
    <Dialog
      title="Agent details"
      subtitle={`${agent.name} · ${agent.id} · ${periodText}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Close
          </button>
          {historyLink && (
            <Link className={`${styles.secondaryButton} ${styles.linkButton}`} to={historyLink}>
              Verification history
            </Link>
          )}
          <button type="button" className={styles.primaryButton} onClick={onShowActivity}>
            Show full activity
          </button>
        </>
      }
    >
      <AgentIdentityDetails agent={agent} />

      <section className={styles.dialogSection} aria-labelledby={metricsId}>
        <h3 id={metricsId} className={styles.dialogHeading}>
          Documented metrics
        </h3>
        <AgentMetricTiles agent={agent} />
      </section>

      <section className={styles.dialogSection} aria-labelledby={resultsId}>
        <h3 id={resultsId} className={styles.dialogHeading}>
          Verification results
        </h3>
        {results.length === 0 ? (
          <p className={styles.small}>No verifications recorded in this period.</p>
        ) : (
          <ul className={styles.resultList}>
            {results.map((entry) => {
              const style = outcomeStyle(entry.outcome)
              return (
                <li key={entry.outcome} className={styles.resultItem}>
                  {style.icon && <img src={assetUrl(style.icon)} alt="" width={13} height={13} />}
                  {outcomeLabel(entry.outcome)}
                  <span className={styles.chipCount}>{formatNumber(entry.count)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className={styles.small}>
        Read-only: accounts, assignments and organizations are managed in CHL. Counts of recorded
        activity — no scores, rankings, attendance, shifts or payroll.
      </p>
    </Dialog>
  )
}
