import { useId, useState } from 'react'
import { Link } from 'react-router'
import type { Agent } from '@/features/agents/agents.api'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatPeriod, lagosDay } from '@/shared/lib/dates'
import { formatClock } from '@/shared/lib/format'
import { MaskIcon } from '@/shared/ui/MaskIcon'
import { customPeriodProblem, type Period } from '../overview-period'
import { OVERVIEW_RANGES, RANGE_LABELS, type OverviewRange } from '../overview.schemas'
import type { ScopeOption } from '../scope-options'
import { AreaPicker } from './AreaPicker'
import styles from './OverviewHeader.module.css'

interface HeroProps {
  refreshing: boolean
  onRefresh(): void
  /** Absent while there is nothing to export. */
  onExport?: () => void
}

/** The green banner: the page's name and its Refresh and Export records buttons. */
export function OverviewHero({ refreshing, onRefresh, onExport }: HeroProps) {
  const titleId = useId()
  return (
    <section className={styles.hero} aria-labelledby={titleId}>
      <span className={styles.rings} aria-hidden="true" />
      <img
        className={styles.watermark}
        src={assetUrl('overview/hero-watermark.svg')}
        alt=""
        width={160}
        height={160}
      />
      <div className={styles.heroText}>
        <p className={styles.eyebrow}>
          <img src={assetUrl('overview/hero-crumb.svg')} alt="" width={18} height={18} />
          <span>JRB CHL</span>
          <span className={styles.slash} aria-hidden="true">
            /
          </span>
          <span>Workspace</span>
        </p>
        <h2 id={titleId} className={styles.heroTitle}>
          Operational overview
        </h2>
        <p className={styles.heroLede}>Your enforcement operations, connected in one place.</p>
      </div>
      <div className={styles.heroActions}>
        <button
          type="button"
          className={`${styles.heroButton} ${styles.refresh}`}
          onClick={onRefresh}
          disabled={refreshing}
          aria-busy={refreshing}
        >
          <img
            className={refreshing ? styles.spinning : undefined}
            src={assetUrl('overview/refresh.svg')}
            alt=""
            width={17}
            height={17}
          />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        <button
          type="button"
          className={`${styles.heroButton} ${styles.export}`}
          onClick={onExport}
          disabled={!onExport}
        >
          <img src={assetUrl('overview/export.svg')} alt="" width={17} height={17} />
          Export records
        </button>
      </div>
    </section>
  )
}

/** The agent and organization filters. */
export interface PeopleFilter {
  organizations: readonly string[]
  organization: string | null
  onOrganizationChange(organization: string | null): void
  /** The agents to choose from: those of the chosen organization, if any. */
  agents: readonly Agent[]
  agentId: string | null
  onAgentChange(agentId: string | null): void
  onClear(): void
}

interface FilterBarProps {
  scopes: readonly ScopeOption[]
  scope: string
  onScopeChange(scope: string): void
  range: OverviewRange
  onRangeChange(range: OverviewRange): void
  /** The days reported on: shown beside a preset, editable for a custom range. */
  period: Period
  onCustomPeriodChange(period: Period): void
  people: PeopleFilter
  /** When the figures on screen were fetched (ms); 0 before the first answer. */
  checkedAt: number
}

/** The area and period the page reports on, and when its figures were last checked. */
export function OverviewFilterBar({
  scopes,
  scope,
  onScopeChange,
  range,
  onRangeChange,
  period,
  onCustomPeriodChange,
  people,
  checkedAt,
}: FilterBarProps) {
  const rangeId = useId()
  const organizationId = useId()
  const agentId = useId()
  const filtered = people.agentId !== null || people.organization !== null
  return (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <img src={assetUrl('overview/scope-globe.svg')} alt="" width={17} height={17} />
        <AreaPicker options={scopes} value={scope} onChange={onScopeChange} />

        <span className={styles.divider} aria-hidden="true" />

        <img src={assetUrl('overview/calendar.svg')} alt="" width={17} height={17} />
        <label className="visually-hidden" htmlFor={rangeId}>
          Date range
        </label>
        <span className={styles.selectWrap}>
          <select
            id={rangeId}
            className={`${styles.select} ${styles.rangeSelect}`}
            value={range}
            onChange={(event) => onRangeChange(event.target.value as OverviewRange)}
          >
            {OVERVIEW_RANGES.map((option) => (
              <option key={option} value={option}>
                {RANGE_LABELS[option]}
              </option>
            ))}
          </select>
          <img
            className={styles.chevron}
            src={assetUrl('overview/filter-chevron.svg')}
            alt=""
            width={13}
            height={13}
          />
        </span>
        {range === 'custom' ? (
          <CustomRange value={period} onChange={onCustomPeriodChange} />
        ) : (
          <span className={styles.period}>{formatPeriod(period.from, period.to)}</span>
        )}

        {people.agents.length > 0 && (
          <>
            <span className={styles.divider} aria-hidden="true" />
            <MaskIcon className={styles.peopleIcon} src="overview/kpi-agents.svg" size={17} />
            {people.organizations.length > 0 && (
              <>
                <label className="visually-hidden" htmlFor={organizationId}>
                  Organization
                </label>
                <span className={styles.selectWrap}>
                  <select
                    id={organizationId}
                    className={
                      people.organization
                        ? `${styles.select} ${styles.activeSelect}`
                        : `${styles.select} ${styles.rangeSelect}`
                    }
                    value={people.organization ?? ''}
                    onChange={(event) => people.onOrganizationChange(event.target.value || null)}
                  >
                    <option value="">All organizations</option>
                    {people.organizations.map((organization) => (
                      <option key={organization} value={organization}>
                        {organization}
                      </option>
                    ))}
                  </select>
                  <img
                    className={styles.chevron}
                    src={assetUrl('overview/filter-chevron.svg')}
                    alt=""
                    width={13}
                    height={13}
                  />
                </span>
              </>
            )}
            <label className="visually-hidden" htmlFor={agentId}>
              Agent
            </label>
            <span className={styles.selectWrap}>
              <select
                id={agentId}
                className={
                  people.agentId
                    ? `${styles.select} ${styles.activeSelect}`
                    : `${styles.select} ${styles.rangeSelect}`
                }
                value={people.agentId ?? ''}
                onChange={(event) => people.onAgentChange(event.target.value || null)}
              >
                <option value="">All agents</option>
                {people.agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} · {agent.id}
                  </option>
                ))}
              </select>
              <img
                className={styles.chevron}
                src={assetUrl('overview/filter-chevron.svg')}
                alt=""
                width={13}
                height={13}
              />
            </span>
            {filtered && (
              <button type="button" className={styles.clearFilters} onClick={people.onClear}>
                Clear
              </button>
            )}
          </>
        )}
      </div>
      {checkedAt > 0 && (
        <p className={styles.checked}>
          <span className={styles.checkedDot} aria-hidden="true" />
          Last checked {formatClock(checkedAt)}
        </p>
      )}
    </div>
  )
}

/**
 * From and to dates for a custom range. A date is only applied once the pair
 * makes sense; until then the problem is said under the fields.
 */
function CustomRange({ value, onChange }: { value: Period; onChange(period: Period): void }) {
  const fromId = useId()
  const toId = useId()
  const [draft, setDraft] = useState(value)
  // When the applied dates change from outside (the address, a preset), show them.
  const [applied, setApplied] = useState(value)
  if (applied.from !== value.from || applied.to !== value.to) {
    setApplied(value)
    setDraft(value)
  }
  const today = lagosDay()
  const problem = customPeriodProblem(draft.from, draft.to, today)

  const change = (next: Period) => {
    setDraft(next)
    if (customPeriodProblem(next.from, next.to, today) === null) onChange(next)
  }

  return (
    <span className={styles.customRange}>
      <label className="visually-hidden" htmlFor={fromId}>
        From
      </label>
      <input
        id={fromId}
        type="date"
        className={styles.dateInput}
        value={draft.from}
        max={draft.to || today}
        aria-invalid={problem !== null}
        onChange={(event) => change({ ...draft, from: event.target.value })}
      />
      <span aria-hidden="true">–</span>
      <label className="visually-hidden" htmlFor={toId}>
        To
      </label>
      <input
        id={toId}
        type="date"
        className={styles.dateInput}
        value={draft.to}
        min={draft.from || undefined}
        max={today}
        aria-invalid={problem !== null}
        onChange={(event) => change({ ...draft, to: event.target.value })}
      />
      {problem && (
        <span className={styles.rangeProblem} role="alert">
          {problem}
        </span>
      )}
    </span>
  )
}

interface ScopeStripProps {
  scopeName: string
  /** "Last 14 days", or the dates of a custom range. */
  periodText: string
  /** What else narrows the figures: "Agent: Tunde Okafor", "Organization: Zone 1". */
  focus?: string | undefined
  reportingLocations: number
  /** The geographical monitoring page, when the user may open it. */
  locationsLink?: string
}

/** "Monitoring & corporate dashboard": what the figures below cover. */
export function ScopeStrip({
  scopeName,
  periodText,
  focus,
  reportingLocations,
  locationsLink,
}: ScopeStripProps) {
  const locations = `${reportingLocations} reporting enforcement location${reportingLocations === 1 ? '' : 's'}`
  return (
    <div className={styles.strip}>
      <span className={styles.stripIcon}>
        <img src={assetUrl('overview/strip-shield.svg')} alt="" width={21} height={21} />
      </span>
      <div className={styles.stripText}>
        <p className={styles.stripTitle}>Monitoring &amp; corporate dashboard</p>
        <p className={styles.stripMeta}>
          {scopeName} scope · {periodText} · {focus ? `${focus} · ` : ''}
          {locations}.
        </p>
      </div>
      {locationsLink && (
        <Link className={styles.stripLink} to={locationsLink}>
          Explore locations
          <img src={assetUrl('overview/strip-arrow.svg')} alt="" width={16} height={16} />
        </Link>
      )}
      <span className={styles.stripGrid} aria-hidden="true" />
    </div>
  )
}
