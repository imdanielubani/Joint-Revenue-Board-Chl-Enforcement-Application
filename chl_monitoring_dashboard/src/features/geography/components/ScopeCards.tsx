import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import type { GeoLevel } from '@/features/auth/auth.schemas'
import { useModuleLink } from '@/features/auth/use-module-link'
import { outcomeLabel, plural } from '@/features/overview/overview-display'
import type { Overview } from '@/features/overview/overview.schemas'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import { areaTitle, type Area } from '../areas'
import { MONITORING_SCOPES } from '../monitoring-scopes'
import type { ScopeOption } from '../scope-options'
import styles from './ScopeCards.module.css'

/* ------------------------------------------------------------ Monitoring scope */

/**
 * "Monitoring scope": the eight levels, each listing the areas CHL configures
 * at that level within the user's own, with the area each sits under. One is
 * chosen at a time; every level shows the same features of the same data.
 */
export function ScopeSelectorCard({
  scopes,
  areas,
  current,
  onScopeChange,
}: {
  /** The areas the user may look at. */
  scopes: readonly ScopeOption[]
  /** CHL's area tree, for the area each one sits under. */
  areas: readonly Area[]
  current: ScopeOption
  onScopeChange(scope: string): void
}) {
  const idBase = useId()
  const [level, setLevel] = useState<GeoLevel>(current.level)
  const byId = new Map(areas.map((area) => [area.id, area]))
  const atLevel = scopes.filter((option) => option.level === level)
  const scope = MONITORING_SCOPES.find((entry) => entry.level === level)

  return (
    <DashboardCard
      title="Monitoring scope"
      subtitle="Levels and areas as CHL configures them, within your assigned areas"
      icon="geography/card-scope.svg"
    >
      <SegmentedTabs<GeoLevel>
        idBase={idBase}
        label="Monitoring scope level"
        tabs={MONITORING_SCOPES.map((entry) => ({
          id: entry.level,
          label: entry.label,
          count: scopes.filter((option) => option.level === entry.level).length,
        }))}
        value={level}
        onChange={setLevel}
        className={styles.levels}
      />
      <div id={panelId(idBase)} role="tabpanel" aria-labelledby={tabId(idBase, level)}>
        {atLevel.length === 0 ? (
          <p className={styles.empty}>
            {level === 'national'
              ? 'Consolidated national visibility is for authorized users; your assigned areas are within it.'
              : `CHL has no ${scope?.plural ?? 'areas'} configured within your areas.`}
          </p>
        ) : (
          <ul className={styles.choices}>
            {atLevel.map((option) => {
              const parentId = byId.get(option.value)?.parentId
              const parent = parentId ? byId.get(parentId) : undefined
              const chosen = option.value === current.value
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    className={chosen ? `${styles.choice} ${styles.chosen}` : styles.choice}
                    aria-pressed={chosen}
                    onClick={() => onScopeChange(option.value)}
                  >
                    <span className={styles.choiceName}>{option.name}</span>
                    {parent && <span className={styles.small}>in {areaTitle(parent)}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </DashboardCard>
  )
}

/* ------------------------------------------------------------ Features within the scope */

/** One feature of the scope: its name, its figures, and where its records are. */
function Feature({
  title,
  children,
  records,
}: {
  title: string
  children: ReactNode
  /** The underlying records; absent when the user may not open them. */
  records?: { label: string; to: string | undefined } | undefined
}) {
  return (
    <section className={styles.feature} aria-label={title}>
      <h4 className={styles.featureTitle}>{title}</h4>
      <div className={styles.featureBody}>{children}</div>
      {records?.to && (
        <Link className={styles.featureLink} to={records.to}>
          {records.label}
          <img src={assetUrl('overview/kpi-arrow.svg')} alt="" width={14} height={14} />
        </Link>
      )}
    </section>
  )
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <p className={styles.figure}>
      <strong>{formatNumber(value)}</strong>
      <span>{label}</span>
    </p>
  )
}

/** How many agents' rows the agent-activity feature lists. */
const TOP_AGENTS = 3

/**
 * "Activity in …": the features available within every scope, in the
 * document's order (SRD 4), each with a way into its records.
 */
export function ScopeFeaturesCard({
  scopeName,
  scopeId,
  periodText,
  overview,
  locations,
}: {
  scopeName: string
  scopeId: string
  periodText: string
  overview: Overview
  /** Enforcement points in the scope; the map below shows their recorded positions. */
  locations: { total: number; reporting: number }
}) {
  const link = useModuleLink()
  const scoped = (module: Parameters<typeof link>[0], to: string) =>
    link(module, `${to}${to.includes('?') ? '&' : '?'}scope=${encodeURIComponent(scopeId)}`)
  const { kpis, payments } = overview
  const outcomes = overview.outcomes.filter((entry) => entry.count > 0)
  const agents = [...overview.agents]
    .sort((a, b) => b.verifications - a.verifications)
    .slice(0, TOP_AGENTS)

  const records = [
    { label: 'Verification records', to: scoped('verifications', paths.verifications) },
    { label: 'Violations & cases', to: scoped('violations', paths.violations) },
    { label: 'Payments & compliance', to: scoped('payments', paths.payments) },
    { label: 'Agents & organizations', to: scoped('agents', paths.agents) },
    { label: 'Evidence records', to: scoped('evidence', paths.evidence) },
  ].filter((entry) => entry.to)

  return (
    <DashboardCard
      title={`Activity in ${scopeName}`}
      subtitle={`${periodText} · the same underlying data as every other view`}
      icon="overview/card-activity.svg"
      bodyClassName={styles.featuresBody}
    >
      <Feature
        title="Verification totals and outcomes"
        records={{ label: 'Open verifications', to: scoped('verifications', paths.verifications) }}
      >
        <Figure value={kpis.totalVerifications} label="verifications" />
        {outcomes.length === 0 ? (
          <p className={styles.small}>No verifications in this period.</p>
        ) : (
          <ul className={styles.lines}>
            {outcomes.map((entry) => (
              <li key={entry.outcome}>
                <span>{outcomeLabel(entry.outcome)}</span>
                <strong>{formatNumber(entry.count)}</strong>
              </li>
            ))}
          </ul>
        )}
      </Feature>

      <Feature
        title="Agent activity"
        records={{ label: 'Open agents', to: scoped('agents', paths.agents) }}
      >
        <Figure value={kpis.agentsWithActivity} label="agents with recorded activity" />
        {agents.length > 0 && (
          <ul className={styles.lines}>
            {agents.map((agent) => (
              <li key={agent.agentId}>
                <span>{agent.name}</span>
                <strong>{plural(agent.verifications, 'verification')}</strong>
              </li>
            ))}
          </ul>
        )}
      </Feature>

      <Feature
        title="Violations issued"
        records={{ label: 'Open violations', to: scoped('violations', paths.violations) }}
      >
        <Figure value={kpis.violationsIssued} label="violations issued" />
        <p className={styles.small}>By {plural(kpis.agentsWithViolations, 'agent')}</p>
      </Feature>

      <Feature
        title="Unresolved and escalated cases"
        records={{
          label: 'Open cases',
          to: scoped('violations', `${paths.violations}?status=unresolved`),
        }}
      >
        <Figure value={kpis.unresolvedViolations} label="unresolved" />
        <Figure value={kpis.escalatedViolations} label="escalated" />
      </Feature>

      <Feature
        title="Repeat-vehicle alerts"
        records={{
          label: 'Open alerts',
          to: scoped('violations', `${paths.violations}?view=repeat-vehicles`),
        }}
      >
        <Figure value={kpis.openRepeatAlerts} label="open alerts" />
        <Figure value={kpis.repeatVehiclesWithoutFollowUp} label="without follow-up" />
      </Feature>

      <Feature
        title="Related payment / compliance status"
        records={{ label: 'Open payments', to: scoped('payments', paths.payments) }}
      >
        <Figure value={payments.received} label="payments received" />
        <Figure value={payments.pending} label="pending" />
        <p className={styles.small}>
          {plural(payments.tripActivatedOnPaid, 'trip')} activated after payment — a separate
          outcome from payment
        </p>
      </Feature>

      <Feature title="Enforcement locations and recorded GPS positions">
        <Figure value={locations.total} label="enforcement points" />
        <p className={styles.small}>
          {locations.reporting} reporting in this period. Their recorded GPS positions are on the
          map below — not live tracking.
        </p>
      </Feature>

      <Feature title="Access to underlying records">
        {records.length === 0 ? (
          <p className={styles.small}>Your role does not open the underlying records.</p>
        ) : (
          <ul className={styles.recordLinks}>
            {records.map((entry) => (
              <li key={entry.label}>
                <Link className={styles.recordLink} to={entry.to!}>
                  {entry.label}
                  <img
                    src={assetUrl('overview/arrow-up-right.svg')}
                    alt=""
                    width={14}
                    height={14}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.small}>Filtered to {scopeName}.</p>
      </Feature>
    </DashboardCard>
  )
}
