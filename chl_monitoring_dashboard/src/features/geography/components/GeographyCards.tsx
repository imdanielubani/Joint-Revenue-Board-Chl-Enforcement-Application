import { lazy, Suspense, useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { env } from '@/config/env'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { plural } from '@/features/overview/overview-display'
import { assetUrl } from '@/shared/lib/asset-url'
import { formatNumber } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import type { EnforcementPoint } from '../geography.schemas'
import type { MapPoint } from './EnforcementMap'
import styles from './GeographyCards.module.css'

/** Loaded only when the map is shown, with Leaflet. */
const EnforcementMap = lazy(() => import('./EnforcementMap'))

/** The map is turned off when no tile address is configured; the list beside it remains. */
const mapAvailable = env.mapTileUrl !== ''

/** What the map's circles are sized by. */
export type MarkerMetric = 'verifications' | 'violations'

/* ------------------------------------------------------------ Enforcement footprint */

/**
 * "Enforcement footprint": the enforcement locations in view at their recorded
 * positions. Choosing one focuses the page's figures and records on it.
 */
export function EnforcementFootprintCard({
  points,
  selectedId,
  onSelect,
}: {
  points: readonly EnforcementPoint[]
  /** The location the page is focused on, if it is one. */
  selectedId: string | null
  onSelect(id: string): void
}) {
  const link = useModuleLink()
  const navigate = useNavigate()
  const idBase = useId()
  const [metric, setMetric] = useState<MarkerMetric>('verifications')
  const [fitRequest, setFitRequest] = useState(0)

  // Highest first: on the map, smaller circles are drawn over larger ones.
  const mapPoints = useMemo<MapPoint[]>(
    () =>
      [...points]
        .sort((a, b) => b[metric] - a[metric] || a.name.localeCompare(b.name))
        .map((point) => ({
          id: point.id,
          name: point.name,
          area: point.area,
          code: point.code,
          position: point.position,
          count: point[metric],
          lastRecordedAt: point.lastRecordedAt,
        })),
    [points, metric],
  )

  return (
    <DashboardCard
      title="Enforcement footprint"
      subtitle="Select a location to focus metrics and underlying records"
      icon="overview/card-location.svg"
      bodyClassName={styles.footprintBody}
      footer={
        <p className={styles.footer}>
          Markers show each enforcement location’s recorded position, not the GPS of every event and
          not continuous tracking. Map boundaries are not CHL enforcement boundaries.
        </p>
      }
    >
      <div className={styles.toolbar}>
        <SegmentedTabs<MarkerMetric>
          idBase={idBase}
          label="Marker values"
          tabs={[
            { id: 'verifications', label: 'Verifications' },
            { id: 'violations', label: 'Violations' },
          ]}
          value={metric}
          onChange={setMetric}
          className={styles.metricTabs}
        />
        <span className={styles.small}>Marker values show {metric}</span>
        <span className={styles.toolbarEnd}>
          <span className={styles.chip}>{plural(points.length, 'location')}</span>
          {mapAvailable && points.length > 0 && (
            <button
              type="button"
              className={styles.fit}
              onClick={() => setFitRequest((request) => request + 1)}
            >
              <img src={assetUrl('overview/scope-globe.svg')} alt="" width={14} height={14} />
              Fit locations
            </button>
          )}
        </span>
      </div>

      {points.length === 0 ? (
        <p className={styles.empty}>No enforcement locations are configured in this scope.</p>
      ) : mapAvailable ? (
        <Suspense fallback={<p className={styles.empty}>Loading the map…</p>}>
          <EnforcementMap
            points={mapPoints}
            selectedId={selectedId}
            fitRequest={fitRequest}
            countText={(count) => `${formatNumber(count)} ${metric} in this period`}
            primary={{ label: 'Focus on this location', run: (point) => onSelect(point.id) }}
            link={{
              label: 'Open its verification records',
              to: (point) =>
                link(
                  'verifications',
                  `${paths.verifications}?scope=${encodeURIComponent(point.id)}`,
                ),
            }}
            onNavigate={(to) => void navigate(to)}
          />
        </Suspense>
      ) : (
        <p className={styles.empty}>
          The map is turned off; choose a location from the list beside it.
        </p>
      )}

      <div className={styles.legend}>
        <span>
          <span className={`${styles.dot} ${styles.recorded}`} aria-hidden="true" />
          Recorded location
        </span>
        <span>
          <span className={`${styles.dot} ${styles.selected}`} aria-hidden="true" />
          Selected
        </span>
        <span className={styles.legendEnd}>Location snapshots · not live tracking</span>
      </div>
    </DashboardCard>
  )
}

/* ------------------------------------------------------------ Locations in view */

/**
 * "Locations in view": the current scope's figures, and the locations in view
 * to choose from; a location focuses the page on it.
 */
export function LocationsInViewCard({
  scopeName,
  figures,
  points,
  permitted,
  selectedId,
  onSelect,
}: {
  scopeName: string
  figures: { verifications: number; violations: number; unresolved: number }
  points: readonly EnforcementPoint[]
  /** How many locations the user may see in all. */
  permitted: number
  selectedId: string | null
  onSelect(id: string): void
}) {
  const searchId = useId()
  const [query, setQuery] = useState('')
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const shown = [...points]
    .sort((a, b) => b.verifications - a.verifications || a.name.localeCompare(b.name))
    .filter((point) => {
      const text = `${point.name} ${point.area} ${point.code}`.toLowerCase()
      return words.every((word) => text.includes(word))
    })

  return (
    <DashboardCard
      title="Locations in view"
      subtitle="Choose a point on the map or a location below"
      icon="overview/card-location.svg"
      bodyClassName={styles.inViewBody}
      footer={
        <p className={styles.footer}>
          {points.length} of {plural(permitted, 'permitted location')}
        </p>
      }
    >
      <div className={styles.current}>
        <p className={styles.eyebrow}>Current scope</p>
        <p className={styles.currentName}>{scopeName}</p>
        <dl className={styles.currentFigures}>
          <div>
            <dd>{formatNumber(figures.verifications)}</dd>
            <dt>Verifications</dt>
          </div>
          <div>
            <dd>{formatNumber(figures.violations)}</dd>
            <dt>Violations</dt>
          </div>
          <div>
            <dd>{formatNumber(figures.unresolved)}</dd>
            <dt>Unresolved</dt>
          </div>
        </dl>
      </div>

      <label className={styles.search} htmlFor={searchId}>
        <img src={assetUrl('overview/search.svg')} alt="" width={16} height={16} />
        <span className="visually-hidden">Find a location</span>
        <input
          id={searchId}
          type="search"
          placeholder="Find a location…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {shown.length === 0 ? (
        <p className={styles.empty}>No location matches “{query}”.</p>
      ) : (
        <ul className={styles.places}>
          {shown.map((point) => {
            const selected = point.id === selectedId
            return (
              <li key={point.id}>
                <button
                  type="button"
                  className={selected ? `${styles.place} ${styles.placeSelected}` : styles.place}
                  aria-pressed={selected}
                  onClick={() => onSelect(point.id)}
                >
                  <span className={styles.placeIcon}>
                    <img
                      src={assetUrl('overview/location-pin.svg')}
                      alt=""
                      width={16}
                      height={16}
                    />
                  </span>
                  <span className={styles.placeText}>
                    <span className={styles.placeName}>{point.name}</span>
                    <span className={styles.small}>{point.area}</span>
                  </span>
                  <span className={styles.placeCount}>
                    {formatNumber(point.verifications)}
                    <span className="visually-hidden"> verifications</span>
                  </span>
                  <img
                    src={assetUrl('overview/arrow-up-right.svg')}
                    alt=""
                    width={14}
                    height={14}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </DashboardCard>
  )
}
