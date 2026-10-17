import { useMemo } from 'react'
import { paths } from '@/config/paths'
import { useAgents } from '@/features/agents/agents.queries'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { downloadCsv } from '@/shared/lib/csv'
import { formatDateTime } from '@/shared/lib/format'
import { StatePanel } from '@/shared/ui/StatePanel'
import { useToast } from '@/shared/ui/toast/toast-context'
import { AttentionCardsRow, InsightCardsRow } from '../components/CardRows'
import { KpiGrid } from '../components/KpiGrid'
import { OutcomesCard } from '../components/OutcomesCard'
import { OverviewFilterBar, OverviewHero, ScopeStrip } from '../components/OverviewHeader'
import { PerformanceCard } from '../components/PerformanceCard'
import { RecentActivityCard } from '../components/RecentActivityCard'
import { VerificationActivityCard } from '../components/VerificationActivityCard'
import { useOverview } from '../overview.queries'
import {
  actionStatusLabel,
  methodTag,
  outcomeLabel,
  sourceLabel,
  syncStatusLabel,
} from '../overview-display'
import type { Overview } from '../overview.schemas'
import { coversSeveralLocations, scopeOptions, type ScopeOption } from '../scope-options'
import { useModuleLink } from '../use-module-link'
import { periodLabel } from '../overview-period'
import { useOverviewFilters } from '../use-overview-filters'
import styles from './OverviewPage.module.css'

/** The Overview: the user's enforcement operations at a glance, for one area and period. */
export function OverviewPage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])

  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there is nothing to report. Ask your administrator to assign your areas."
      />
    )
  }
  return <OverviewContent scopes={scopes} fallbackScope={first} areasPending={areas.isPending} />
}

function OverviewContent({
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
  const link = useModuleLink()
  const { showToast } = useToast()
  const agents = useAgents()
  const filter = useOverviewFilters({ scopes, fallbackScope, areasPending, agents: agents.data })
  const { scope, filters } = filter
  const range = filters.range

  const query = useOverview(filters, { enabled: !filter.waiting })
  const overview = query.data

  const exportRecords = (data: Overview) => {
    downloadCsv(`overview-records-${data.period.from}-to-${data.period.to}.csv`, [
      [
        'Vehicle plate',
        'Reference',
        'Verification method',
        'Verification result',
        'Agent',
        'Agent ID',
        'Date and time (WAT)',
        'Action status',
        'Location',
        'Area',
        'Location code',
        'Checked',
        'Sync status',
        'Received by CHL (WAT)',
      ],
      ...data.recentActivity.map((record) => [
        record.plate,
        record.reference,
        record.method ? methodTag(record.method) : 'Not supplied',
        record.result ? outcomeLabel(record.result) : 'Not supplied',
        record.agent.name,
        record.agent.id,
        formatDateTime(record.recordedAt),
        actionStatusLabel(record.actionStatus),
        record.location.name,
        record.location.area,
        record.location.code,
        record.source ? sourceLabel(record.source) : 'Not supplied',
        record.syncStatus ? syncStatusLabel(record.syncStatus) : 'Not supplied',
        record.receivedAt ? formatDateTime(record.receivedAt) : 'Not supplied',
      ]),
    ])
    showToast({
      title: 'Records exported',
      lines: [`${data.recentActivity.length} records saved as a CSV file.`],
      key: 'overview-export',
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <OverviewHero
            refreshing={query.isFetching && !query.isPending}
            onRefresh={() => void query.refetch()}
            onExport={overview ? () => exportRecords(overview) : undefined}
          />
          <OverviewFilterBar
            scopes={scopes}
            scope={scope.value}
            onScopeChange={filter.setScope}
            range={range}
            onRangeChange={filter.setRange}
            period={filters}
            onCustomPeriodChange={filter.setCustomPeriod}
            people={{
              organizations: filter.organizations,
              organization: filters.organization,
              onOrganizationChange: filter.setOrganization,
              agents: filter.agentOptions,
              agentId: filters.agentId,
              onAgentChange: filter.setAgent,
              onClear: filter.clearPeopleFilters,
            }}
            checkedAt={query.dataUpdatedAt}
            latestReceivedAt={overview?.latestReceivedAt}
          />
        </div>
        {overview && (
          <ScopeStrip
            scopeName={scope.name}
            periodText={periodLabel(range, filters)}
            focus={
              filter.agent
                ? `Agent: ${filter.agent.name}`
                : filters.organization
                  ? `Organization: ${filters.organization}`
                  : undefined
            }
            reportingLocations={overview.reportingLocations}
            locationsLink={link('geography', paths.geography)}
          />
        )}
      </div>

      {query.isPending ? (
        <StatePanel kind="loading" message="Loading the overview…" />
      ) : !overview ? (
        <StatePanel kind="error" error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <p className={styles.stale} role="status">
              The latest figures could not be loaded; these are from the last successful check.
            </p>
          )}
          <KpiGrid kpis={overview.kpis} />
          <div className={styles.activityRow}>
            <VerificationActivityCard
              daily={overview.dailyVerifications}
              previous={overview.previousDailyVerifications}
              total={overview.kpis.totalVerifications}
            />
            <OutcomesCard outcomes={overview.outcomes} />
          </div>
          <PerformanceCard
            agents={overview.agents}
            locations={overview.locations}
            showLocations={coversSeveralLocations(scope.level)}
          />
          <InsightCardsRow overview={overview} />
          <AttentionCardsRow overview={overview} />
          <RecentActivityCard records={overview.recentActivity} />
        </>
      )}
    </div>
  )
}
