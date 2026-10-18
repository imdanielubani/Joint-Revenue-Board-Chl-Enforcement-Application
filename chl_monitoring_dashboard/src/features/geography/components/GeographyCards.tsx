import { lazy, Suspense, useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { env } from '@/config/env'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { plural } from '@/features/overview/overview-display'
import { formatNumber, formatShortDateTime } from '@/shared/lib/format'
import { useRecordRegister } from '@/shared/lib/use-record-register'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import { DataTable, type Column } from '@/shared/ui/DataTable'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import { areaTitle, levelCaption, type Area } from '../areas'
import type { ChildArea, EnforcementPoint } from '../geography.schemas'
import type { MapPoint } from './EnforcementMap'
import styles from './GeographyCards.module.css'

/** Loaded only when the map is shown, with Leaflet. */
const EnforcementMap = lazy(() => import('./EnforcementMap'))

/* ------------------------------------------------------------ Scope trail */

/**
 * The scope's place in CHL's area tree, from the user's own area down: each
 * step above the current one moves the page there.
 */
export function ScopeTrail({
  trail,
  onScopeChange,
}: {
  /** From the user's own area to the scope, as the area tree has them. */
  trail: readonly Area[]
  onScopeChange(scope: string): void
}) {
  return (
    <nav aria-label="Monitoring scope" className={styles.trail}>
      <ol>
        {trail.map((area, index) => {
          const current = index === trail.length - 1
          return (
            <li key={area.id}>
              {current ? (
                <span aria-current="location" className={styles.trailCurrent}>
                  {areaTitle(area)}
                </span>
              ) : (
                <button
                  type="button"
                  className={styles.trailStep}
                  onClick={() => onScopeChange(area.id)}
                >
                  {areaTitle(area)}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/* ------------------------------------------------------------ Areas within */

/**
 * "Areas within …": the areas directly under the scope in CHL's configuration,
 * each with the same figures as the scope. A name moves the page into it.
 */
export function AreasCard({
  scope,
  areas,
  onScopeChange,
}: {
  scope: Pick<Area, 'name' | 'level'>
  areas: readonly ChildArea[]
  onScopeChange(scope: string): void
}) {
  const columns = useMemo<Column<ChildArea>[]>(
    () => [
      {
        key: 'area',
        header: 'Area',
        minWidth: 200,
        render: (row) => (
          <span className={styles.stack}>
            <button
              type="button"
              className={styles.areaButton}
              onClick={() => onScopeChange(row.id)}
            >
              {areaTitle(row)}
            </button>
            <span className={styles.small}>{levelCaption(row.level)}</span>
          </span>
        ),
        sortValue: (row) => row.name,
      },
      {
        key: 'verifications',
        header: 'Verifications',
        align: 'end',
        render: (row) => (
          <span className={styles.stack}>
            <strong>{formatNumber(row.verifications)}</strong>
            <span className={styles.small}>
              {formatNumber(row.activeTrip)} active · {formatNumber(row.noActiveTrip)} no active
              trip
            </span>
          </span>
        ),
        sortValue: (row) => row.verifications,
      },
      {
        key: 'agents',
        header: 'Agents',
        align: 'end',
        render: (row) => formatNumber(row.agents),
        sortValue: (row) => row.agents,
      },
      {
        key: 'violations',
        header: 'Violations',
        align: 'end',
        render: (row) => formatNumber(row.violations),
        sortValue: (row) => row.violations,
      },
      {
        key: 'unresolved',
        header: 'Unresolved',
        align: 'end',
        render: (row) => (
          <span className={styles.stack}>
            <strong>{formatNumber(row.unresolved)}</strong>
            <span className={styles.small}>{formatNumber(row.escalated)} escalated</span>
          </span>
        ),
        sortValue: (row) => row.unresolved,
      },
      {
        key: 'repeat',
        header: 'Repeat alerts',
        align: 'end',
        render: (row) => formatNumber(row.repeatAlerts),
        sortValue: (row) => row.repeatAlerts,
      },
      {
        key: 'payments',
        header: 'Payments',
        align: 'end',
        render: (row) => (
          <span className={styles.stack}>
            <strong>{formatNumber(row.payments.received)} received</strong>
            <span className={styles.small}>{formatNumber(row.payments.pending)} pending</span>
          </span>
        ),
        sortValue: (row) => row.payments.received,
      },
      {
        key: 'locations',
        header: 'Enforcement points',
        align: 'end',
        render: (row) => (
          <span className={styles.stack}>
            <strong>{formatNumber(row.locations)}</strong>
            <span className={styles.small}>{formatNumber(row.reportingLocations)} reporting</span>
          </span>
        ),
        sortValue: (row) => row.locations,
      },
    ],
    [onScopeChange],
  )
  const table = useRecordRegister({
    rows: areas,
    columns,
    searchText: (row) => row.name,
    pageSize: 50,
  })

  return (
    <DashboardCard
      title={`Areas within ${areaTitle(scope)}`}
      subtitle="As CHL configures them · the same figures as the whole · choose one to look inside"
      icon="overview/card-location.svg"
      footer={
        <p className={styles.footer}>
          {areas.length === 0
            ? 'Nothing is configured under this area.'
            : `${plural(areas.length, 'area')} directly under ${areaTitle(scope)}, as CHL configures them.`}
        </p>
      }
    >
      {areas.length === 0 ? (
        <p className={styles.empty}>
          {scope.level === 'enforcement_point'
            ? 'This is an enforcement point: its activity is shown on this page.'
            : `CHL has no areas configured under ${areaTitle(scope)}.`}
        </p>
      ) : (
        <DataTable
          label={`Areas within ${areaTitle(scope)}`}
          columns={columns}
          rows={table.pageRows}
          rowKey={(row) => row.id}
          sort={table.sort}
          onSort={table.toggleSort}
          emptyMessage="No areas."
        />
      )}
    </DashboardCard>
  )
}

/* ------------------------------------------------------------ Enforcement locations */

type PointView = 'map' | 'list'

/** The map is turned off when no tile address is configured; the list remains. */
const mapAvailable = env.mapTileUrl !== ''

/**
 * "Enforcement locations": the enforcement points in scope at the GPS where
 * their events were recorded, sized by verifications in the period. Not live.
 */
export function EnforcementPointsCard({
  points,
  canFocus,
  onScopeChange,
}: {
  points: readonly EnforcementPoint[]
  /** Whether the page may move to a point (it is within the user's areas). */
  canFocus(id: string): boolean
  onScopeChange(scope: string): void
}) {
  const link = useModuleLink()
  const navigate = useNavigate()
  const idBase = useId()
  const [view, setView] = useState<PointView>('map')

  // Busiest first: the list leads with it, and on the map smaller circles are drawn over it.
  const sorted = useMemo(
    () =>
      [...points].sort((a, b) => b.verifications - a.verifications || a.name.localeCompare(b.name)),
    [points],
  )
  const mapPoints = useMemo<MapPoint[]>(
    () =>
      sorted.map((point) => ({
        id: point.id,
        name: point.name,
        area: point.area,
        code: point.code,
        position: point.position,
        count: point.verifications,
        lastRecordedAt: point.lastRecordedAt,
      })),
    [sorted],
  )
  const recordsLink = (id: string) =>
    link('verifications', `${paths.verifications}?scope=${encodeURIComponent(id)}`)

  return (
    <DashboardCard
      title="Enforcement locations"
      subtitle="Recorded GPS positions of enforcement events · not live tracking"
      icon="overview/card-location.svg"
      footer={
        <p className={styles.footer}>
          {plural(points.length, 'enforcement point')} in this area ·{' '}
          {plural(points.filter((point) => point.verifications > 0).length, 'point')} with
          verifications in this period
        </p>
      }
    >
      {points.length === 0 ? (
        <p className={styles.empty}>No enforcement points are configured in this area.</p>
      ) : (
        <>
          {mapAvailable && (
            <SegmentedTabs<PointView>
              idBase={idBase}
              label="How to show enforcement locations"
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
                <EnforcementMap
                  points={mapPoints}
                  countText={(count) =>
                    `${formatNumber(count)} verification${count === 1 ? '' : 's'} in this period`
                  }
                  legend="Larger circles: more verifications in this period. Grey: none. Click a circle to look at that point."
                  primary={{
                    label: 'Look at this enforcement point',
                    run: (point) => onScopeChange(point.id),
                    enabled: (point) => canFocus(point.id),
                  }}
                  link={{
                    label: 'Open its verification records',
                    to: (point) => recordsLink(point.id),
                  }}
                  onNavigate={(to) => void navigate(to)}
                />
              </Suspense>
            ) : (
              <ul className={styles.points}>
                {sorted.map((point) => (
                  <li key={point.id} className={styles.point}>
                    <span className={styles.pointHead}>
                      <span className={styles.pointName}>{point.name}</span>
                      {canFocus(point.id) && (
                        <button
                          type="button"
                          className={styles.pointFocus}
                          onClick={() => onScopeChange(point.id)}
                        >
                          Look at it
                        </button>
                      )}
                    </span>
                    <span className={styles.small}>
                      {[point.area, point.code].filter(Boolean).join(' · ')}
                    </span>
                    <span className={styles.pointFigures}>
                      <strong>{formatNumber(point.verifications)}</strong> verifications ·{' '}
                      <strong>{formatNumber(point.violations)}</strong> violations ·{' '}
                      <strong>{formatNumber(point.agents)}</strong> agents
                    </span>
                    <span className={styles.small}>
                      {point.position
                        ? `GPS ${point.position.lat.toFixed(4)}, ${point.position.lng.toFixed(4)}`
                        : 'No recorded position'}
                      {' · '}
                      {point.lastRecordedAt
                        ? `last recorded ${formatShortDateTime(point.lastRecordedAt)}`
                        : 'nothing recorded yet'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </DashboardCard>
  )
}
