import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { plural, share } from '@/features/overview/overview-display'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber, formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { fieldReportLabel } from '../command-centre-display'
import type { CommandCentre, FeedItem } from '../command-centre.schemas'
import styles from './FieldCards.module.css'

/** How many field reports the card lists. */
const REPORT_LIMIT = 3

/** "Field reports": what agents reported, and their loaded / empty confirmations. */
export function FieldReportsCard({
  counts,
  feed,
  onSelect,
}: {
  counts: CommandCentre['counts']
  feed: readonly FeedItem[]
  /** Shows the report in the incident context. */
  onSelect(id: string): void
}) {
  const reports = feed.filter((item) => item.kind === 'field_report').slice(0, REPORT_LIMIT)
  const confirmed = counts.loaded + counts.empty

  return (
    <DashboardCard
      title="Field reports"
      subtitle="Reports and loaded / empty confirmations from agents"
      icon="overview/card-recent.svg"
      footer={<p className={styles.footer}>Submitted from the mobile application</p>}
    >
      <div className={styles.loadTop}>
        <div className={styles.loadFigure}>
          <strong>{formatNumber(counts.fieldReports)}</strong>
          <span>{counts.fieldReports === 1 ? 'report' : 'reports'}</span>
        </div>
        <div className={styles.loadSplit}>
          <p className={styles.loadLabel}>
            <span>Loaded {formatNumber(counts.loaded)}</span>
            <span>Empty {formatNumber(counts.empty)}</span>
          </p>
          <span className={styles.track} aria-hidden="true">
            <span
              className={styles.fill}
              style={{ width: `${share(counts.loaded, confirmed)}%` }}
            />
          </span>
          <p className={styles.small}>
            {confirmed === 0
              ? 'No loaded / empty confirmations in this window'
              : `${plural(confirmed, 'confirmation')} in this window`}
          </p>
        </div>
      </div>
      {reports.length === 0 ? (
        <p className={styles.empty}>No field reports were received in this window.</p>
      ) : (
        <ul className={styles.reports}>
          {reports.map((item) => (
            <li key={item.id}>
              <button type="button" className={styles.report} onClick={() => onSelect(item.id)}>
                <span className={styles.reportHead}>
                  <span className={styles.reportType}>
                    {item.report ? fieldReportLabel(item.report.type) : 'Field report'}
                  </span>
                  <time className={styles.small} dateTime={item.recordedAt}>
                    {formatShortDateTime(item.recordedAt)}
                  </time>
                </span>
                <span className={styles.reportSummary}>{item.report?.summary}</span>
                <span className={styles.small}>
                  {item.agent.name} · {item.location.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  )
}

/**
 * "Recorded locations": activity at each enforcement point in the window, and
 * when it last recorded anything. The GPS of recorded events, not live tracking.
 */
export function RecordedLocationsCard({ locations }: { locations: CommandCentre['locations'] }) {
  const link = useModuleLink()
  const sorted = [...locations].sort(
    (a, b) => b.events - a.events || (b.lastEventAt ?? '').localeCompare(a.lastEventAt ?? ''),
  )
  const busiest = sorted[0]?.events ?? 0

  return (
    <DashboardCard
      title="Recorded locations"
      subtitle="Where field events were recorded · not live tracking"
      icon="overview/card-location.svg"
      footer={{ label: 'Open geographical monitoring', to: link('geography', paths.geography) }}
    >
      {sorted.length === 0 ? (
        <p className={styles.empty}>No enforcement points in this area.</p>
      ) : (
        <ul className={styles.locations}>
          {sorted.map((location) => {
            const to = link('geography', `${paths.geography}?location=${location.id}`)
            const content = (
              <>
                <span className={styles.locationHead}>
                  <span className={styles.locationName}>{location.name}</span>
                  {to && (
                    <img
                      src={assetUrl('overview/arrow-up-right.svg')}
                      alt=""
                      width={14}
                      height={14}
                    />
                  )}
                </span>
                <span className={styles.small}>
                  {[location.area, location.code].filter(Boolean).join(' · ')}
                </span>
                <span className={styles.locationFigure}>
                  <strong>{formatNumber(location.events)}</strong>
                  <span>{location.events === 1 ? 'event' : 'events'} in this window</span>
                </span>
                <span className={styles.track} aria-hidden="true">
                  <span
                    className={styles.fill}
                    style={{ width: `${share(location.events, busiest)}%` }}
                  />
                </span>
                <span className={styles.small}>
                  {location.lastEventAt
                    ? `Last recorded ${formatShortDateTime(location.lastEventAt)}`
                    : 'Nothing recorded yet'}
                </span>
              </>
            )
            return (
              <li key={location.id}>
                {to ? (
                  <Link className={`${styles.location} ${styles.linked}`} to={to}>
                    {content}
                  </Link>
                ) : (
                  <div className={styles.location}>{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </DashboardCard>
  )
}
