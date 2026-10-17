import { useId } from 'react'
import { Link } from 'react-router'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatPeriod } from '@/shared/lib/dates'
import { formatClock } from '@/shared/lib/format'
import {
  OVERVIEW_RANGES,
  RANGE_LABELS,
  type Overview,
  type OverviewRange,
} from '../overview.schemas'
import type { ScopeOption } from '../scope-options'
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

interface FilterBarProps {
  scopes: readonly ScopeOption[]
  scope: string
  onScopeChange(scope: string): void
  range: OverviewRange
  onRangeChange(range: OverviewRange): void
  period: Overview['period'] | undefined
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
  checkedAt,
}: FilterBarProps) {
  const scopeId = useId()
  const rangeId = useId()
  return (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <img src={assetUrl('overview/scope-globe.svg')} alt="" width={17} height={17} />
        <label className="visually-hidden" htmlFor={scopeId}>
          Monitoring scope
        </label>
        <span className={styles.selectWrap}>
          <select
            id={scopeId}
            className={`${styles.select} ${styles.scopeSelect}`}
            value={scope}
            onChange={(event) => onScopeChange(event.target.value)}
          >
            {scopes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
        {period && <span className={styles.period}>{formatPeriod(period.from, period.to)}</span>}
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

interface ScopeStripProps {
  scopeName: string
  range: OverviewRange
  reportingLocations: number
  /** The geographical monitoring page, when the user may open it. */
  locationsLink?: string
}

/** "Monitoring & corporate dashboard": what the figures below cover. */
export function ScopeStrip({
  scopeName,
  range,
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
          {scopeName} scope · {RANGE_LABELS[range]} · {locations}.
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
