import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { plural, share } from '@/features/overview/overview-display'
import type { AgentRow } from '@/features/overview/overview.schemas'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber, formatPercent } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import styles from './AgentActivityCard.module.css'

/** "TO" for Tunde Okafor. */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')

/**
 * "Agent activity" (SRD 4): what each agent recorded in the scope and period,
 * by recorded agent ID. Activity, not performance: no scores or rankings.
 */
export function AgentActivityCard({
  scopeId,
  agents,
}: {
  scopeId: string
  agents: readonly AgentRow[]
}) {
  const link = useModuleLink()
  const sorted = [...agents].sort(
    (a, b) => b.verifications - a.verifications || a.name.localeCompare(b.name),
  )
  const verifications = agents.reduce((sum, agent) => sum + agent.verifications, 0)
  const violations = agents.reduce((sum, agent) => sum + agent.violationsIssued, 0)
  const organizations = new Set(agents.map((agent) => agent.organization)).size
  const allAgents = link('agents', `${paths.agents}?scope=${encodeURIComponent(scopeId)}`)

  return (
    <DashboardCard
      title="Agent activity"
      subtitle="Recorded activity by agent ID in this scope and period · no scores or rankings"
      icon="overview/card-performance.svg"
      bodyClassName={styles.body}
      footer={{ label: 'Open agents & organizations', to: allAgents }}
    >
      <dl className={styles.summary}>
        <div>
          <dd>{formatNumber(agents.length)}</dd>
          <dt>Agents with activity</dt>
        </div>
        <div>
          <dd>{formatNumber(organizations)}</dd>
          <dt>{organizations === 1 ? 'Organization' : 'Organizations'}</dt>
        </div>
        <div>
          <dd>{formatNumber(verifications)}</dd>
          <dt>Verifications recorded</dt>
        </div>
        <div>
          <dd>{formatNumber(violations)}</dd>
          <dt>Violations issued</dt>
        </div>
      </dl>

      {sorted.length === 0 ? (
        <p className={styles.empty}>No agent recorded activity in this scope and period.</p>
      ) : (
        <ul className={styles.agents}>
          {sorted.map((agent) => {
            const to = link('agents', `${paths.agents}?agent=${encodeURIComponent(agent.agentId)}`)
            return (
              <li key={agent.agentId} className={styles.agent}>
                <span className={styles.head}>
                  <span className={styles.avatar} aria-hidden="true">
                    {initials(agent.name)}
                  </span>
                  <span className={styles.who}>
                    <span className={styles.name}>{agent.name}</span>
                    <span className={styles.small}>
                      {agent.agentId} · {agent.organization}
                    </span>
                  </span>
                  {to && (
                    <Link className={styles.open} to={to} aria-label={`Open ${agent.name}`}>
                      <img
                        src={assetUrl('overview/arrow-up-right.svg')}
                        alt=""
                        width={14}
                        height={14}
                      />
                    </Link>
                  )}
                </span>
                <dl className={styles.figures}>
                  <div>
                    <dd>{formatNumber(agent.verifications)}</dd>
                    <dt>Verifications</dt>
                  </div>
                  <div>
                    <dd>{formatNumber(agent.violationsIssued)}</dd>
                    <dt>Violations</dt>
                  </div>
                  <div>
                    <dd>{formatNumber(agent.unresolved)}</dd>
                    <dt>Unresolved</dt>
                  </div>
                  <div>
                    <dd>{formatNumber(agent.repeatAlerts)}</dd>
                    <dt>Repeat alerts</dt>
                  </div>
                </dl>
                <span className={styles.share}>
                  <span className={styles.track} aria-hidden="true">
                    <span
                      className={styles.fill}
                      style={{ width: `${share(agent.verifications, verifications)}%` }}
                    />
                  </span>
                  <span className={styles.small}>
                    {formatPercent(agent.verifications, verifications)} of this scope’s
                    verifications
                  </span>
                </span>
                <span className={styles.small}>
                  Recorded in {agent.locations || 'no recorded location'}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      <p className={styles.small}>
        {plural(agents.length, 'agent')} by recorded agent ID; an agent recording in several areas
        appears in each of them.
      </p>
    </DashboardCard>
  )
}
