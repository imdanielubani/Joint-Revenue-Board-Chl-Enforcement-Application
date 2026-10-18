import { useMemo, useState } from 'react'
import { paths } from '@/config/paths'
import { useCurrentUser } from '@/features/auth/session-context'
import { useModuleLink } from '@/features/auth/use-module-link'
import { AreaPicker } from '@/features/geography/components/AreaPicker'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { CasesCard, RepeatVehiclesCard } from '@/features/overview/components/AttentionCards'
import { plural } from '@/features/overview/overview-display'
import { assetUrl } from '@/shared/lib/asset-url'
import { FilterBar, FilterDivider, FilterSelect } from '@/shared/ui/FilterBar'
import { FreshnessLine } from '@/shared/ui/FreshnessLine'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { StatePanel } from '@/shared/ui/StatePanel'
import { SummaryStrip } from '@/shared/ui/SummaryStrip'
import { ActivityFeedCard } from '../components/ActivityFeedCard'
import { inView, type FeedView } from '../command-centre-display'
import { FieldReportsCard, RecordedLocationsCard } from '../components/FieldCards'
import { IncidentContextCard } from '../components/IncidentContextCard'
import { useCommandCentre } from '../command-centre.queries'
import { CC_WINDOWS, CC_WINDOW_LABELS, type CommandCentre } from '../command-centre.schemas'
import { useCommandCentreFilters } from '../use-command-centre-filters'
import styles from './CommandCentrePage.module.css'

const WINDOW_OPTIONS = CC_WINDOWS.map((value) => ({ value, label: CC_WINDOW_LABELS[value] }))

/**
 * The Command centre (SRD 3): field activity as CHL receives it, the context of
 * any entry, and the cases needing attention. It monitors; it does not dispatch,
 * message agents or control their devices.
 */
export function CommandCentrePage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])

  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there is no activity to show. Ask your administrator to assign your areas."
      />
    )
  }
  return (
    <CommandCentreContent scopes={scopes} fallbackScope={first} areasPending={areas.isPending} />
  )
}

function CommandCentreContent({
  scopes,
  fallbackScope,
  areasPending,
}: {
  scopes: readonly ScopeOption[]
  fallbackScope: ScopeOption
  areasPending: boolean
}) {
  const filter = useCommandCentreFilters({ scopes, fallbackScope, areasPending })
  const query = useCommandCentre(filter.filters, { enabled: !filter.waiting })
  const data = query.data

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <PageHero
            title="Command centre"
            lede="Enforcement activity, field reports and cases needing attention, as CHL receives them."
            section="Workspace"
            actions={
              <RefreshButton
                refreshing={query.isFetching && !query.isPending}
                onRefresh={() => void query.refetch()}
              />
            }
          />
          <FilterBar
            end={
              <FreshnessLine
                checkedAt={query.dataUpdatedAt}
                latestReceivedAt={data?.latestReceivedAt}
              />
            }
          >
            <img src={assetUrl('overview/scope-globe.svg')} alt="" width={17} height={17} />
            <AreaPicker options={scopes} value={filter.scope.value} onChange={filter.setScope} />
            <FilterDivider />
            <img src={assetUrl('overview/calendar.svg')} alt="" width={17} height={17} />
            <FilterSelect
              label="Time window"
              value={filter.filters.window}
              options={WINDOW_OPTIONS}
              onChange={filter.setWindow}
            />
          </FilterBar>
        </div>
        {data && (
          <SummaryStrip
            title="Operational command centre"
            meta={`${filter.scope.name} scope · ${CC_WINDOW_LABELS[filter.filters.window]} · ${plural(data.locations.length, 'enforcement point')} · recorded activity, not live tracking.`}
          />
        )}
      </div>

      {query.isPending ? (
        <StatePanel kind="loading" message="Loading the command centre…" />
      ) : !data ? (
        <StatePanel kind="error" error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <p className={styles.stale} role="status">
              The latest activity could not be loaded; this is from the last successful check.
            </p>
          )}
          {/* Keyed by area and window, so a new choice starts from its own newest entry. */}
          <CommandCentreBody key={`${filter.filters.scope}|${filter.filters.window}`} data={data} />
        </>
      )}
    </div>
  )
}

function CommandCentreBody({ data }: { data: CommandCentre }) {
  const link = useModuleLink()
  const [view, setView] = useState<FeedView>('all')
  const [chosenId, setChosenId] = useState<string | null>(null)

  // The chosen entry while it is still in the feed and the tab; otherwise the newest shown.
  const visible = data.feed.filter((item) => inView(item, view))
  const selected = visible.find((item) => item.id === chosenId) ?? visible[0] ?? null

  const select = (id: string) => {
    const item = data.feed.find((entry) => entry.id === id)
    if (item && !inView(item, view)) setView('all')
    setChosenId(id)
  }

  return (
    <>
      <HeadlineFigures
        items={[
          {
            label: 'Activity received',
            value: data.counts.activity,
            icon: 'overview/kpi-scan.svg',
            note: 'Received by CHL in the selected window',
          },
          {
            label: 'Cases needing attention',
            value: data.cases.unresolved,
            icon: 'overview/kpi-unresolved.svg',
            note: 'Open now, whenever raised',
            to: link('violations', paths.violations),
          },
          {
            label: 'Escalated cases',
            value: data.cases.escalated,
            icon: 'overview/kpi-violation.svg',
            note: 'Escalated and still open',
            to: link('violations', `${paths.violations}?status=escalated`),
          },
          {
            label: 'Repeat vehicles without follow-up',
            value: data.repeatVehicles.withoutFollowUp,
            icon: 'overview/kpi-bell.svg',
            note: 'Three or more reports, none followed up',
            to: link('violations', `${paths.violations}?view=repeat-vehicles`),
          },
        ]}
      />

      <div className={styles.feedRow}>
        <ActivityFeedCard
          feed={data.feed}
          total={data.counts.activity}
          view={view}
          onViewChange={setView}
          selectedId={selected?.id ?? null}
          onSelect={select}
        />
        <IncidentContextCard item={selected} />
      </div>

      <div className={styles.row}>
        <CasesCard cases={data.cases} />
        <RepeatVehiclesCard repeat={data.repeatVehicles} />
        <FieldReportsCard counts={data.counts} feed={data.feed} onSelect={select} />
      </div>

      <RecordedLocationsCard locations={data.locations} />

      <p className={styles.footnote}>
        The Command centre shows what CHL has received from the field. It does not dispatch agents,
        send messages, control devices or show live positions; locations are where events were
        recorded. Records made offline appear when they reach CHL.
      </p>
    </>
  )
}
