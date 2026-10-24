import { useId, useMemo, useState } from 'react'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { assetUrl } from '@/shared/lib/asset-url'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { SegmentedTabs } from '@/shared/ui/SegmentedTabs'
import { StatePanel } from '@/shared/ui/StatePanel'
import { panelId, tabId } from '@/shared/ui/tab-ids'
import { TripDetailsDialog } from '../components/TripDetailsDialog'
import { TripRelatedDialog, type TripRelated } from '../components/TripRelatedDialog'
import { PostPaymentPanel, TripsPanel, VehiclesPanel } from '../components/TripPanels'
import cards from '../components/TripCards.module.css'
import { useTripsMonitoring } from '../trips.queries'
import type { Trip, TripsFilters, TripsMonitoring } from '../trips.schemas'
import { useTripsView, type TripsView } from '../use-trips-view'
import styles from './TripsPage.module.css'

/** The columns of Destination Detection: the trip, where it was going, and what CHL reported. */
const DETECTION_COLUMNS = ['reference', 'plate', 'destination', 'detection', 'status', 'actions']

/** The tab a plate from a link opens: where its vehicle's latest trip check falls. */
function viewForPlate(monitoring: TripsMonitoring | undefined, plate: string): TripsView {
  const vehicle = monitoring?.vehicles.find((entry) => entry.plate === plate)
  if (vehicle?.result === 'no_active_trip') return 'no-active'
  if (vehicle?.result === 'no_trip_history') return 'no-history'
  return 'active'
}

/**
 * Trip monitoring (SRD 7): a read-only view of trip information returned by
 * the existing CHL system. The dashboard never calculates trip validity,
 * expires a trip because a countdown reaches zero, or creates trips.
 */
export function TripsPage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])
  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there are no trips to show. Ask your administrator to assign your areas."
      />
    )
  }
  return <TripsContent scopes={scopes} fallbackScope={first} areasPending={areas.isPending} />
}

function TripsContent({
  scopes,
  fallbackScope,
  areasPending,
}: {
  scopes: readonly ScopeOption[]
  /** The area shown when the address names none, or one the user may not see. */
  fallbackScope: ScopeOption
  /** True until CHL's area tree has loaded; until then only the user's own areas are known. */
  areasPending: boolean
}) {
  const tabsId = useId()
  // The area and period only: trips are not narrowed by agent or organization.
  const filter = useOverviewFilters({ scopes, fallbackScope, areasPending, agents: [] })
  const { scope, filters } = filter
  const period: TripsFilters = {
    scope: filters.scope,
    range: filters.range,
    from: filters.from,
    to: filters.to,
  }

  const query = useTripsMonitoring(period, { enabled: !filter.waiting })
  const monitoring = query.data
  const page = useTripsView((plate) => viewForPlate(monitoring, plate))
  // A row's verification or case, open in its own popup on this page.
  const [related, setRelated] = useState<TripRelated | null>(null)
  const scopeText = `${scope.name} · ${periodLabel(filters.range, filters)}`

  const sections = useMemo(() => {
    const trips = monitoring?.trips ?? []
    const vehicles = monitoring?.vehicles ?? []
    const byReference = new Map(trips.map((trip) => [trip.reference, trip]))
    const tripsOf = (references: (string | null)[]) =>
      references.flatMap((reference) => {
        const trip = reference ? byReference.get(reference) : undefined
        return trip ? [trip] : []
      })
    const noActive = vehicles.filter((vehicle) => vehicle.result === 'no_active_trip')
    return {
      byReference,
      active: tripsOf(
        vehicles
          .filter((vehicle) => vehicle.result === 'active_trip')
          .map((vehicle) => vehicle.activeTripReference),
      ),
      noActive,
      previous: tripsOf(noActive.map((vehicle) => vehicle.previousTripReference)),
      noHistory: vehicles.filter((vehicle) => vehicle.result === 'no_trip_history'),
      detected: trips.filter((trip) => trip.destinationDetection !== null),
      payments: monitoring?.postPayment ?? [],
    }
  }, [monitoring])

  const open: Trip | null = page.trip ? (sections.byReference.get(page.trip) ?? null) : null
  const activated = sections.payments.filter((payment) => payment.tripActivated).length
  const panel = {
    initialQuery: page.plate,
    onOpenTrip: page.openTrip,
    onRelated: setRelated,
  }

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Trip monitoring"
          lede="A read-only view of trip information returned by the existing CHL system."
          section="Enforcement"
          icons="trips"
          actions={
            <RefreshButton
              refreshing={query.isFetching && !query.isPending}
              onRefresh={() => void query.refetch()}
            />
          }
        />
        <OverviewFilterBar
          scopes={scopes}
          scope={scope.value}
          onScopeChange={filter.setScope}
          range={filters.range}
          onRangeChange={filter.setRange}
          period={filters}
          onCustomPeriodChange={filter.setCustomPeriod}
          checkedAt={query.dataUpdatedAt}
          latestReceivedAt={monitoring?.latestReceivedAt}
        />
      </div>

      {filter.waiting || query.isPending ? (
        <StatePanel kind="loading" message="Loading trips…" />
      ) : !monitoring ? (
        <StatePanel kind="error" error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <p className={styles.stale} role="status">
              The latest figures could not be loaded; these are from the last successful check.
            </p>
          )}
          <HeadlineFigures
            items={[
              {
                label: 'Active trips',
                value: sections.active.length,
                icon: 'overview/kpi-check.svg',
                note: 'Verified vehicles with a current CHL trip',
                to: page.linkTo('active'),
              },
              {
                label: 'No active trip',
                value: sections.noActive.length,
                icon: 'overview/kpi-doc.svg',
                note: 'CHL returned no active trip',
                to: page.linkTo('no-active'),
              },
              {
                label: 'No trip history',
                value: sections.noHistory.length,
                icon: 'overview/kpi-unresolved.svg',
                note: 'Vehicles with no recorded CHL trips',
                to: page.linkTo('no-history'),
              },
              {
                label: 'Trips activated after payment',
                value: activated,
                icon: 'overview/payment-trip.svg',
                note: `Of ${sections.payments.length} confirmed ${sections.payments.length === 1 ? 'payment' : 'payments'}`,
                to: page.linkTo('post-payment'),
              },
            ]}
          />

          <section className={styles.views} aria-label="Trip monitoring submodules">
            <div id={tabsId} className={styles.tabsAnchor}>
              <SegmentedTabs<TripsView>
                idBase={tabsId}
                label="Trip monitoring submodules"
                tabs={[
                  { id: 'active', label: 'Active Trip Details', count: sections.active.length },
                  { id: 'no-active', label: 'No Active Trip', count: sections.noActive.length },
                  {
                    id: 'previous',
                    label: 'Most Recent Previous Trip',
                    count: sections.previous.length,
                  },
                  { id: 'no-history', label: 'No Trip History', count: sections.noHistory.length },
                  {
                    id: 'destination',
                    label: 'Destination Detection',
                    count: sections.detected.length,
                  },
                  {
                    id: 'post-payment',
                    label: 'Post-Payment Trip Status',
                    count: sections.payments.length,
                  },
                ]}
                value={page.view}
                onChange={page.setView}
              />
            </div>
            <div id={panelId(tabsId)} role="tabpanel" aria-labelledby={tabId(tabsId, page.view)}>
              {page.view === 'active' && (
                <TripsPanel
                  {...panel}
                  title="Active Trip Details"
                  subtitle={`The backend-authoritative current trip and its status · ${scopeText}`}
                  icon="overview/card-activity.svg"
                  label="Active trips"
                  trips={sections.active}
                />
              )}
              {page.view === 'no-active' && (
                <VehiclesPanel
                  {...panel}
                  title="No Active Trip"
                  subtitle={`Verified vehicles for which CHL returned no active trip · ${scopeText}`}
                  icon="overview/card-cases.svg"
                  label="Vehicles with no active trip"
                  vehicles={sections.noActive}
                  withPreviousTrip
                />
              )}
              {page.view === 'previous' && (
                <TripsPanel
                  {...panel}
                  title="Most Recent Previous Trip"
                  subtitle={`The most recent trip when no active trip exists · ${scopeText}`}
                  icon="overview/card-recent.svg"
                  label="Most recent previous trips"
                  trips={sections.previous}
                />
              )}
              {page.view === 'no-history' && (
                <VehiclesPanel
                  {...panel}
                  title="No Trip History"
                  subtitle={`Vehicles with no recorded CHL trips · ${scopeText}`}
                  icon="overview/card-repeat.svg"
                  label="Vehicles with no trip history"
                  vehicles={sections.noHistory}
                  withPreviousTrip={false}
                />
              )}
              {page.view === 'destination' && (
                <TripsPanel
                  {...panel}
                  title="Destination Detection"
                  subtitle={`Backend-reported destination detection and completion, where available · ${scopeText}`}
                  icon="overview/card-location.svg"
                  label="Destination detection"
                  trips={sections.detected}
                  only={DETECTION_COLUMNS}
                />
              )}
              {page.view === 'post-payment' && (
                <PostPaymentPanel
                  {...panel}
                  title="Post-Payment Trip Status"
                  subtitle={`Trip activation or updated compliance status following confirmed payment · ${scopeText}`}
                  icon="overview/card-payment.svg"
                  payments={sections.payments}
                />
              )}
            </div>
          </section>

          {open && <TripDetailsDialog trip={open} onClose={() => page.openTrip(null)} />}
          {related && (
            <TripRelatedDialog
              key={related.kind === 'case' ? related.violationId : related.reference}
              related={related}
              filters={period}
              periodText={periodLabel(filters.range, filters)}
              onClose={() => setRelated(null)}
            />
          )}
          {page.trip && !open && (
            <p className={styles.stale} role="status">
              Trip {page.trip} is not among the trips CHL returned for this area and period. Choose
              another area or period to find it.
            </p>
          )}

          <aside className={cards.note}>
            <img src={assetUrl('verifications/note-info.svg')} alt="" width={16} height={16} />
            <div>
              <p className={cards.noteTitle}>Read-only trip information returned by CHL.</p>
              <p className={cards.noteText}>
                The dashboard does not calculate its own trip validity, expire trips merely because
                a countdown reaches zero, or create trips independently. Each validity countdown is
                shown as CHL reported it, with the time it was reported.
              </p>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
