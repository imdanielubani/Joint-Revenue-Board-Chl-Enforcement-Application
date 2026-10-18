import { lazy, Suspense, useId, useState } from 'react'
import { Link } from 'react-router'
import { env } from '@/config/env'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { plural, share } from '@/features/overview/overview-display'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber, formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import { fieldReportLabel, loadLabel } from '../command-centre-display'
import type { CommandCentre, FeedItem } from '../command-centre.schemas'
import styles from './FieldCards.module.css'

/** How many entries each card lists. */
const REPORT_LIMIT = 3
const LOAD_LIMIT = 5

type SelectEntry = (id: string) => void

/** "Field reports": vehicle, driver and situation reports and general notifications. */
export function FieldReportsCard({
  reports,
  onSelect,
}: {
  reports: CommandCentre['fieldReports']
  /** Shows the report in the incident context. */
  onSelect: SelectEntry
}) {
  const latest = reports.items.slice(0, REPORT_LIMIT)

  return (
    <DashboardCard
      title="Field reports"
      subtitle="Vehicle, driver and situation reports, and general notifications"
      icon="overview/card-recent.svg"
      footer={<p className={styles.footer}>Submitted from the mobile application</p>}
    >
      <div className={styles.summaryTop}>
        <div className={styles.figure}>
          <strong>{formatNumber(reports.total)}</strong>
          <span>{reports.total === 1 ? 'report' : 'reports'}</span>
        </div>
        <ul className={styles.types} aria-label="Reports by type">
          {reports.byType.map((entry) => (
            <li key={entry.type}>
              <span>{fieldReportLabel(entry.type)}</span>
              <strong>{formatNumber(entry.count)}</strong>
            </li>
          ))}
        </ul>
      </div>
      {latest.length === 0 ? (
        <p className={styles.empty}>No field reports were received in this window.</p>
      ) : (
        <ul className={styles.reports}>
          {latest.map((item) => (
            <li key={item.id}>
              <button type="button" className={styles.report} onClick={() => onSelect(item.id)}>
                <span className={styles.reportHead}>
                  <span className={styles.reportType}>
                    {item.report ? fieldReportLabel(item.report.type) : 'Field report'}
                  </span>
                  <ReceivedTime item={item} />
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

type LoadView = 'all' | 'loaded' | 'empty'

/** "Loaded / empty reports": agents' haulage-loaded or empty status, where recorded. */
export function LoadReportsCard({
  reports,
  onSelect,
}: {
  reports: CommandCentre['loadReports']
  onSelect: SelectEntry
}) {
  const idBase = useId()
  const [view, setView] = useState<LoadView>('all')
  const total = reports.loaded + reports.empty
  const items = reports.items
    .filter((item) => view === 'all' || item.load === view)
    .slice(0, LOAD_LIMIT)

  return (
    <DashboardCard
      title="Loaded / empty reports"
      subtitle="Haulage-loaded or empty status reported by agents, where recorded"
      icon="overview/card-payment.svg"
      footer={
        <p className={styles.footer}>
          {total === 0
            ? 'Nothing reported in this window'
            : `${plural(total, 'report')} in this window`}
        </p>
      }
    >
      <div className={styles.split}>
        <p className={styles.splitLabel}>
          <span>
            <span className={`${styles.dot} ${styles.loadedDot}`} aria-hidden="true" />
            Loaded {formatNumber(reports.loaded)}
          </span>
          <span>
            Empty {formatNumber(reports.empty)}
            <span className={`${styles.dot} ${styles.emptyDot}`} aria-hidden="true" />
          </span>
        </p>
        <span className={`${styles.track} ${styles.splitTrack}`} aria-hidden="true">
          <span className={styles.fill} style={{ width: `${share(reports.loaded, total)}%` }} />
        </span>
      </div>
      <SegmentedTabs<LoadView>
        idBase={idBase}
        label="Reports to show"
        tabs={[
          { id: 'all', label: 'All', count: total },
          { id: 'loaded', label: 'Loaded', count: reports.loaded },
          { id: 'empty', label: 'Empty', count: reports.empty },
        ]}
        value={view}
        onChange={setView}
      />
      <div id={panelId(idBase)} role="tabpanel" aria-labelledby={tabId(idBase, view)}>
        {items.length === 0 ? (
          <p className={styles.empty}>
            {view === 'all'
              ? 'No loaded or empty status was reported in this window.'
              : `No vehicle was reported ${view} in this window.`}
          </p>
        ) : (
          <ul className={styles.reports}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`${styles.report} ${styles.loadEntry}`}
                  onClick={() => onSelect(item.id)}
                >
                  <span className={styles.loadMain}>
                    <span className={styles.plate}>{item.plate}</span>
                    <span className={styles.small}>
                      {item.agent.name} · {item.location.name}
                    </span>
                    <ReceivedTime item={item} />
                  </span>
                  <StatusLabel tone={item.load === 'loaded' ? 'info' : 'neutral'}>
                    {loadLabel(item.load)}
                  </StatusLabel>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardCard>
  )
}

/** When CHL received the entry; for one made offline, when it was recorded too. */
function ReceivedTime({ item }: { item: FeedItem }) {
  const received = item.receivedAt ?? item.recordedAt
  return (
    <span className={styles.small}>
      <time dateTime={received}>{formatShortDateTime(received)}</time>
      {item.source === 'offline' && (
        <span className={styles.offline}>
          {' '}
          · offline, recorded{' '}
          <time dateTime={item.recordedAt}>{formatShortDateTime(item.recordedAt)}</time>
        </span>
      )}
    </span>
  )
}

type LocationView = 'map' | 'list'

/** The map is turned off when no tile address is configured; the list remains. */
const mapAvailable = env.mapTileUrl !== ''

/** Loaded only when the map is shown, with Leaflet. */
const LocationsMap = lazy(() => import('./LocationsMap'))

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
  const idBase = useId()
  const [view, setView] = useState<LocationView>('map')

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
        <>
          {mapAvailable && (
            <SegmentedTabs<LocationView>
              idBase={idBase}
              label="How to show locations"
              tabs={[
                { id: 'map', label: 'Map' },
                { id: 'list', label: 'List' },
              ]}
              value={view}
              onChange={setView}
              className={styles.viewTabs}
            />
          )}
          <div
            id={panelId(idBase)}
            role={mapAvailable ? 'tabpanel' : undefined}
            aria-labelledby={mapAvailable ? tabId(idBase, view) : undefined}
          >
            {mapAvailable && view === 'map' ? (
              <Suspense fallback={<p className={styles.empty}>Loading the map…</p>}>
                <LocationsMap locations={sorted} />
              </Suspense>
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
                        <span>
                          {location.events === 1 ? 'entry' : 'entries'} received in this window
                        </span>
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
          </div>
        </>
      )}
    </DashboardCard>
  )
}
