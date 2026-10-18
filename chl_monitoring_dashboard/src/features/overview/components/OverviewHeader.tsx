import { useId, useState } from 'react'
import type { Agent } from '@/features/agents/agents.api'
import { AreaPicker } from '@/features/geography/components/AreaPicker'
import type { ScopeOption } from '@/features/geography/scope-options'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatPeriod, lagosDay } from '@/shared/lib/dates'
import { FilterBar, FilterDivider, FilterNote, FilterSelect } from '@/shared/ui/FilterBar'
import { FreshnessLine } from '@/shared/ui/FreshnessLine'
import { MaskIcon } from '@/shared/ui/MaskIcon'
import { HeroButton, PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { SummaryStrip } from '@/shared/ui/SummaryStrip'
import { customPeriodProblem, type Period } from '../overview-period'
import { OVERVIEW_RANGES, RANGE_LABELS, type OverviewRange } from '../overview.schemas'
import styles from './OverviewHeader.module.css'

interface HeroProps {
  refreshing: boolean
  onRefresh(): void
  /** Absent while there is nothing to export. */
  onExport?: () => void
}

/** The green banner: the page's name and its Refresh and Export records buttons. */
export function OverviewHero({ refreshing, onRefresh, onExport }: HeroProps) {
  return (
    <PageHero
      title="Operational overview"
      lede="Your enforcement operations, connected in one place."
      section="Workspace"
      actions={
        <>
          <RefreshButton refreshing={refreshing} onRefresh={onRefresh} />
          <HeroButton
            variant="solid"
            icon="overview/export.svg"
            onClick={onExport}
            disabled={!onExport}
          >
            Export records
          </HeroButton>
        </>
      }
    />
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
  /** When CHL last received a field record for these figures; null when none came. */
  latestReceivedAt: string | null | undefined
}

const RANGE_OPTIONS = OVERVIEW_RANGES.map((value) => ({ value, label: RANGE_LABELS[value] }))

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
  latestReceivedAt,
}: FilterBarProps) {
  const filtered = people.agentId !== null || people.organization !== null
  return (
    <FilterBar end={<FreshnessLine checkedAt={checkedAt} latestReceivedAt={latestReceivedAt} />}>
      <img src={assetUrl('overview/scope-globe.svg')} alt="" width={17} height={17} />
      <AreaPicker options={scopes} value={scope} onChange={onScopeChange} />

      <FilterDivider />

      <img src={assetUrl('overview/calendar.svg')} alt="" width={17} height={17} />
      <FilterSelect
        label="Date range"
        value={range}
        options={RANGE_OPTIONS}
        onChange={onRangeChange}
      />
      {range === 'custom' ? (
        <CustomRange value={period} onChange={onCustomPeriodChange} />
      ) : (
        <FilterNote>{formatPeriod(period.from, period.to)}</FilterNote>
      )}

      {people.agents.length > 0 && (
        <>
          <FilterDivider />
          <MaskIcon className={styles.peopleIcon} src="overview/kpi-agents.svg" size={17} />
          {people.organizations.length > 0 && (
            <FilterSelect
              label="Organization"
              value={people.organization ?? ''}
              active={people.organization !== null}
              options={[
                { value: '', label: 'All organizations' },
                ...people.organizations.map((organization) => ({
                  value: organization,
                  label: organization,
                })),
              ]}
              onChange={(value) => people.onOrganizationChange(value || null)}
            />
          )}
          <FilterSelect
            label="Agent"
            value={people.agentId ?? ''}
            active={people.agentId !== null}
            options={[
              { value: '', label: 'All agents' },
              ...people.agents.map((agent) => ({
                value: agent.id,
                label: `${agent.name} · ${agent.id}`,
              })),
            ]}
            onChange={(value) => people.onAgentChange(value || null)}
          />
          {filtered && (
            <button type="button" className={styles.clearFilters} onClick={people.onClear}>
              Clear
            </button>
          )}
        </>
      )}
    </FilterBar>
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
  locationsLink?: string | undefined
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
    <SummaryStrip
      title="Monitoring & corporate dashboard"
      meta={`${scopeName} scope · ${periodText} · ${focus ? `${focus} · ` : ''}${locations}.`}
      link={locationsLink ? { label: 'Explore locations', to: locationsLink } : undefined}
    />
  )
}
