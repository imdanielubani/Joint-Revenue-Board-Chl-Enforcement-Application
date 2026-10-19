import { plural } from '@/features/overview/overview-display'
import { formatDateTime, formatNumber } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { assignedAreas, initials, organizationLabel, SCOPE_NOT_EXPOSED } from '../agents-display'
import type { AgentSummary } from '../agents.schemas'
import styles from './AgentCards.module.css'

/* ------------------------------------------------------------ Agent identity */

/** "Agent identity": who the agent is and where CHL assigns them, as CHL records it. */
export function AgentIdentityCard({ agent }: { agent: AgentSummary }) {
  const areas = assignedAreas(agent)
  return (
    <DashboardCard
      title="Agent identity"
      subtitle="As CHL records the agent"
      icon="agents/card-identity.svg"
      bodyClassName={styles.body}
      footer={
        <p className={styles.footer}>
          Read-only. Accounts, assignments and organizations are managed in CHL.
        </p>
      }
    >
      <div className={styles.identityHead}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(agent.name)}
        </span>
        <span className={styles.stack}>
          <span className={styles.identityName}>{agent.name}</span>
          <span className={styles.sub}>{agent.id}</span>
        </span>
      </div>
      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>Agent ID</dt>
          <dd>{agent.id}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Vendor / organization</dt>
          <dd>{organizationLabel(agent.organization)}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Assigned scope</dt>
          <dd>
            {agent.assignedScope === null ? (
              <span className={styles.muted}>{SCOPE_NOT_EXPOSED}</span>
            ) : areas.length === 0 ? (
              <span className={styles.muted}>None assigned</span>
            ) : (
              <span className={styles.chips}>
                {areas.map((area) => (
                  <span key={area.id} className={styles.areaChip}>
                    {area.title}
                  </span>
                ))}
              </span>
            )}
          </dd>
        </div>
        <div className={styles.fact}>
          <dt>Last recorded activity</dt>
          <dd>
            {agent.lastRecordedAt ? (
              `${formatDateTime(agent.lastRecordedAt)} WAT`
            ) : (
              <span className={styles.muted}>Nothing recorded in this area</span>
            )}
          </dd>
        </div>
        <div className={styles.fact}>
          <dt>Enforcement locations</dt>
          <dd>
            {plural(agent.metrics.enforcementLocations, 'location')} with activity in the period
          </dd>
        </div>
      </dl>
    </DashboardCard>
  )
}

/* ------------------------------------------------------------ Performance overview */

function Tile({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className={styles.tile}>
      <dt className={styles.tileLabel}>{label}</dt>
      <dd className={styles.tileValue}>{formatNumber(value)}</dd>
      <dd className={styles.tileNote}>{note}</dd>
    </div>
  )
}

/**
 * "Performance overview": the documented verification and enforcement metrics
 * for the agent, as counts. No score, rank or target: agent scoring is a
 * future extension.
 */
export function PerformanceOverviewCard({
  agent,
  periodText,
}: {
  agent: AgentSummary
  /** "Last 14 days", or the dates of a custom range. */
  periodText: string
}) {
  const { metrics } = agent
  const notices = metrics.demandNotices
  return (
    <DashboardCard
      title="Performance overview"
      subtitle={`Documented verification and enforcement metrics · ${periodText}`}
      icon="overview/card-performance.svg"
      bodyClassName={styles.body}
      footer={
        <p className={styles.footer}>
          Documented metrics only — counts of what was recorded. Agent performance scoring is a
          future extension, not part of this module.
        </p>
      }
    >
      <dl className={styles.tiles}>
        <Tile
          label="Verifications"
          value={metrics.verifications}
          note="Outcomes recorded, not unique trips"
        />
        <Tile
          label="Violations issued"
          value={metrics.violationsIssued}
          note="From the agent’s verifications"
        />
        <Tile
          label="Evidence submitted"
          value={metrics.evidenceSubmitted}
          note="Violations with photographs"
        />
        <Tile
          label="Demand notices"
          value={notices.issued}
          note={`${notices.paymentReceived} payment received · ${notices.paymentPending} pending`}
        />
        <Tile
          label="Unresolved cases"
          value={metrics.unresolved}
          note={`${metrics.escalated} escalated within this total`}
        />
        <Tile
          label="Repeat-vehicle alerts"
          value={metrics.repeatAlerts}
          note="Vehicles the agent reported"
        />
        <Tile
          label="Trip activation recorded"
          value={notices.tripActivatedOnPaid}
          note="On paid notices · separate from payment"
        />
        <Tile
          label="Enforcement locations"
          value={metrics.enforcementLocations}
          note="With recorded activity"
        />
      </dl>
    </DashboardCard>
  )
}
