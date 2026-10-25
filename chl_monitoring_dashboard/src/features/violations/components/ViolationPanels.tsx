import { actionStatusLabel, share } from '@/features/overview/overview-display'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber, formatPercent } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { LabeledSelect } from '@/shared/ui/LabeledSelect'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { isClosed, isUnresolved, searchTextOf, statusPill, type Pill } from '../violations-display'
import { STATUS_VIEWS, VIOLATION_CATEGORIES, type ViolationCase } from '../violations.schemas'
import { useCaseColumns, type CaseOpenProps } from './case-columns'
import { PillLabel } from './PillLabel'
import styles from './ViolationCards.module.css'

export { PillLabel }

interface PanelProps extends CaseOpenProps {
  cases: readonly ViolationCase[]
  subtitle: string
}

const option = (value: string) => ({ value, label: value })

/** 8.1 Violation Register: every violation received, by category and status, searchable. */
export function RegisterPanel({
  cases,
  subtitle,
  onOpen,
  category,
  status,
  plate,
  onCategoryChange,
  onStatusChange,
}: PanelProps & {
  category: string | null
  status: string | null
  /** A plate to search for first, from a link. */
  plate: string
  onCategoryChange(value: string | null): void
  onStatusChange(value: string | null): void
}) {
  const columns = useCaseColumns('register', onOpen)
  const known: readonly string[] = VIOLATION_CATEGORIES
  const categories = [
    ...VIOLATION_CATEGORIES.map(option),
    ...[...new Set(cases.map((item) => item.category))]
      .filter((c) => !known.includes(c))
      .map(option),
  ]
  const statuses = [...new Set([...STATUS_VIEWS, ...cases.map((item) => item.status)])].map(
    (value) => ({ value, label: actionStatusLabel(value) }),
  )
  const rows = cases.filter(
    (item) => (!category || item.category === category) && (!status || item.status === status),
  )
  return (
    <DashboardCard
      title="Violation Register"
      subtitle={subtitle}
      icon="overview/card-violations.svg"
      bodyClassName={styles.panelBody}
    >
      <div className={styles.selects}>
        <LabeledSelect
          label="Category"
          value={category}
          options={categories}
          onChange={onCategoryChange}
        />
        <LabeledSelect label="Status" value={status} options={statuses} onChange={onStatusChange} />
      </div>
      <RegisterTable
        key={`${category ?? ''}|${status ?? ''}`}
        label="Violations"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
        initialQuery={plate}
      />
    </DashboardCard>
  )
}

/** A category's colour in the distribution: the design's four, then the dashboard's own. */
const CATEGORY_COLORS = [
  'var(--share-1)',
  'var(--share-2)',
  'var(--share-3)',
  'var(--share-4)',
  'var(--amber)',
  'var(--status-danger-text)',
  'var(--etag-invalid)',
]
const colorOf = (index: number) => CATEGORY_COLORS[index] ?? 'var(--status-neutral-dot)'

/**
 * 8.2 Violation Categories: the documented categories as a distribution, each
 * sized by its violations; a category in the legend lists them in the register.
 */
export function CategoriesPanel({
  cases,
  subtitle,
  periodText,
  onShow,
}: Omit<PanelProps, 'onOpen'> & {
  /** "Last 30 days", in the header's chip. */
  periodText: string
  onShow(category: string): void
}) {
  const known: readonly string[] = VIOLATION_CATEGORIES
  const others = [...new Set(cases.map((item) => item.category))].filter((c) => !known.includes(c))
  const categories = [...VIOLATION_CATEGORIES, ...others].map((category, index) => ({
    category,
    count: cases.filter((item) => item.category === category).length,
    // Categories CHL returns outside the documented list are drawn grey.
    color: known.includes(category) ? colorOf(index) : colorOf(CATEGORY_COLORS.length),
  }))
  return (
    <DashboardCard
      title="Violation Categories"
      subtitle={subtitle}
      aside={periodText}
      bodyClassName={styles.distribution}
    >
      <p className={styles.distributionTotal}>
        <strong>{formatNumber(categories.length)}</strong> categories
      </p>
      <div className={styles.distributionBar} aria-hidden="true">
        {categories
          .filter((entry) => entry.count > 0)
          .map((entry) => (
            <span
              key={entry.category}
              className={styles.distributionSegment}
              style={{ flexGrow: entry.count, background: entry.color }}
              title={`${entry.category} · ${formatNumber(entry.count)}`}
            />
          ))}
      </div>
      <ul className={styles.distributionLegend}>
        {categories.map((entry) => (
          <li key={entry.category}>
            <button
              type="button"
              className={styles.legendItem}
              disabled={entry.count === 0}
              onClick={() => onShow(entry.category)}
              aria-label={`View ${entry.category} violations`}
            >
              <span className={styles.legendDot} style={{ background: entry.color }} />
              {entry.category} · {formatNumber(entry.count)}
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.small}>
        Tag-Vehicle Mismatch is a documented breach, not in the SRD’s initial category list.
        {others.length > 0 && ' Grey: a category CHL returned outside the documented list.'}
      </p>
    </DashboardCard>
  )
}

/** The colour of a status's share bar: its pill's text colour. */
const TONE_COLORS: Record<Pill['tone'], string> = {
  success: 'var(--status-success-text)',
  warning: 'var(--status-warning-text)',
  amber: 'var(--status-amber-text)',
  danger: 'var(--status-danger-text)',
  info: 'var(--card-title)',
  neutral: 'var(--status-neutral-dot)',
}

/**
 * 8.3 Status Views: a tile for Payment Pending, Resolved, Escalated, Cancelled
 * and any other state CHL returns, with its count and share; a tile lists its
 * violations in the register.
 */
export function StatusesPanel({
  cases,
  subtitle,
  onShow,
}: Omit<PanelProps, 'onOpen'> & { onShow(status: string): void }) {
  const known: readonly string[] = STATUS_VIEWS
  const others = [...new Set(cases.map((item) => item.status))].filter((s) => !known.includes(s))
  return (
    <DashboardCard
      title="Status Views"
      subtitle={subtitle}
      icon="overview/card-payment.svg"
      bodyClassName={styles.statusBody}
    >
      <ul className={styles.statusTiles}>
        {[...STATUS_VIEWS, ...others].map((status) => {
          const pill = statusPill(status)
          const count = cases.filter((item) => item.status === status).length
          return (
            <li key={status}>
              <button
                type="button"
                className={styles.statusTile}
                disabled={count === 0}
                onClick={() => onShow(status)}
                aria-label={`View ${pill.label} violations`}
              >
                <span className={styles.statusTileHead}>
                  <PillLabel pill={pill} />
                  <img
                    className={styles.statusTileArrow}
                    src={assetUrl('overview/tile-arrow.svg')}
                    alt=""
                    width={12}
                    height={12}
                  />
                </span>
                <span className={styles.statusTileValue}>{formatNumber(count)}</span>
                <span className={styles.statusTileShare}>
                  {formatPercent(count, cases.length)} of violations
                </span>
                <span className={styles.statusTrack} aria-hidden="true">
                  <span
                    className={styles.statusFill}
                    style={{
                      width: `${share(count, cases.length)}%`,
                      background: TONE_COLORS[pill.tone],
                    }}
                  />
                </span>
                {!known.includes(status) && (
                  <span className={styles.statusTileNote}>Another state returned by CHL</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </DashboardCard>
  )
}

/** 8.4 Unresolved Cases: outstanding violations, their recorded actions and pending follow-up. */
export function UnresolvedPanel({
  cases,
  subtitle,
  onOpen,
  repeatOnly,
}: PanelProps & { repeatOnly: boolean }) {
  const columns = useCaseColumns('unresolved', onOpen)
  const rows = cases.filter((item) => isUnresolved(item) && (!repeatOnly || item.repeatAlert))
  return (
    <DashboardCard
      title={repeatOnly ? 'Unresolved Cases · repeat-vehicle alerts' : 'Unresolved Cases'}
      subtitle={subtitle}
      icon="overview/card-repeat.svg"
      bodyClassName={styles.panelBody}
    >
      <RegisterTable
        label="Unresolved cases"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}

/** 8.5 Closure and Cancellation History: how each case was closed or cancelled, and by whom. */
export function HistoryPanel({ cases, subtitle, onOpen }: PanelProps) {
  const columns = useCaseColumns('history', onOpen)
  // The most recently closed or cancelled first.
  const rows = cases
    .filter(isClosed)
    .sort((a, b) => Date.parse(b.closure?.at ?? '') - Date.parse(a.closure?.at ?? ''))
  return (
    <DashboardCard
      title="Closure and Cancellation History"
      subtitle={subtitle}
      icon="overview/card-recent.svg"
      bodyClassName={styles.panelBody}
    >
      <RegisterTable
        label="Closed and cancelled cases"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}
