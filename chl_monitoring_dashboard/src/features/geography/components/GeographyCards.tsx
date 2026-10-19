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
import { outcomeLabel } from '@/features/overview/overview-display'
import { formatShortDateTime } from '@/shared/lib/format'
import type { EnforcementPoint, VerificationRecord } from '../geography.schemas'
import type { MapEvent, MapPoint } from './EnforcementMap'
import styles from './GeographyCards.module.css'

/** Loaded only when the map is shown, with Leaflet. */
const EnforcementMap = lazy(() => import('./EnforcementMap'))

/** The map is turned off when no tile address is configured; the list beside it remains. */
const mapAvailable = env.mapTileUrl !== ''

/** What the map's circles are sized by. */
export type MarkerMetric = 'verifications' | 'violations'

/** An enforcement location as the footprint map needs it. */
export type FootprintPoint = Pick<
  EnforcementPoint,
  'id' | 'name' | 'area' | 'code' | 'position' | 'verifications' | 'violations' | 'lastRecordedAt'
>

/* ------------------------------------------------------------ Enforcement footprint */

/**
 * "Enforcement footprint": the enforcement locations in view at their recorded
 * positions. Where the page can focus on a location, choosing one does so.
 */
export function EnforcementFootprintCard({
  title = 'Enforcement footprint',
  subtitle = 'Select a location to focus metrics and underlying records',
  points,
  verifications,
  selectedId,
  onSelect,
  agentId,
}: {
  title?: string
  subtitle?: string
  points: readonly FootprintPoint[]
  /** The verifications in the period, whose recorded GPS the map can show. */
  verifications: readonly VerificationRecord[]
  /** The location the page is focused on, if it is one. */
  selectedId: string | null
  /** Focuses the page on a location; absent where the page cannot. */
  onSelect?: ((id: string) => void) | undefined
  /** The agent the page shows: a location's records are narrowed to theirs. */
  agentId?: string | undefined
}) {
  const link = useModuleLink()
  const navigate = useNavigate()
  const idBase = useId()
  const [metric, setMetric] = useState<MarkerMetric>('verifications')
  const [fitRequest, setFitRequest] = useState(0)
  const [showEvents, setShowEvents] = useState(false)

  // Each verification where its device said it was, when the user asks to see them.
  const located = useMemo(() => verifications.filter((record) => record.position), [verifications])
  const events = useMemo<MapEvent[]>(
    () =>
      showEvents
        ? located.map((record) => ({
            id: record.id,
            lat: record.position!.lat,
            lng: record.position!.lng,
            label: [
              record.reference,
              record.result ? outcomeLabel(record.result) : null,
              formatShortDateTime(record.recordedAt),
            ]
              .filter(Boolean)
              .join(' · '),
          }))
        : [],
    [showEvents, located],
  )

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
      title={title}
      subtitle={subtitle}
      icon="overview/card-location.svg"
      bodyClassName={styles.footprintBody}
      footer={
        <p className={styles.footer}>
          Circles show each enforcement location’s recorded position; “Event GPS” adds where each
          verification’s device said it was. Recorded positions, never continuous tracking. Map
          boundaries are not CHL enforcement boundaries.
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
          {mapAvailable && located.length > 0 && (
            <button
              type="button"
              className={showEvents ? `${styles.fit} ${styles.fitOn}` : styles.fit}
              aria-pressed={showEvents}
              onClick={() => setShowEvents((shown) => !shown)}
            >
              <span className={`${styles.dot} ${styles.event}`} aria-hidden="true" />
              Event GPS
            </button>
          )}
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
            events={events}
            countText={(count) => `${formatNumber(count)} ${metric} in this period`}
            primary={
              onSelect
                ? { label: 'Focus on this location', run: (point) => onSelect(point.id) }
                : undefined
            }
            link={{
              label: 'Open its verification records',
              to: (point) =>
                link(
                  'verifications',
                  `${paths.verifications}?scope=${encodeURIComponent(point.id)}${agentId ? `&agent=${encodeURIComponent(agentId)}` : ''}`,
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
        {onSelect && (
          <span>
            <span className={`${styles.dot} ${styles.selected}`} aria-hidden="true" />
            Selected
          </span>
        )}
        {showEvents && (
          <span>
            <span className={`${styles.dot} ${styles.event}`} aria-hidden="true" />
            Recorded event GPS · {plural(located.length, 'verification')}
          </span>
        )}
        <span className={styles.legendEnd}>Location snapshots · not live tracking</span>
      </div>
    </DashboardCard>
  )
}

/* ------------------------------------------------------------ Locations in view */

/**
 * "Locations in view": the current scope, and the locations in view
 * to choose from; a location focuses the page on it.
 */
export function LocationsInViewCard({
  scopeName,
  points,
  permitted,
  selectedId,
  onSelect,
}: {
  scopeName: string
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
