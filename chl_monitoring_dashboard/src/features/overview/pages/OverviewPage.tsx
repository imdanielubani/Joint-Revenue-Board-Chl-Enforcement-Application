import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { paths } from '@/config/paths'
import { useCurrentUser } from '@/features/auth/session-context'
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
import { OVERVIEW_RANGES, type Overview, type OverviewRange } from '../overview.schemas'
import { coversSeveralLocations, scopeOptions, type ScopeOption } from '../scope-options'
import { useModuleLink } from '../use-module-link'
import styles from './OverviewPage.module.css'

const DEFAULT_RANGE: OverviewRange = '14d'

/** The Overview: the user's enforcement operations at a glance, for one area and period. */
export function OverviewPage() {
  const user = useCurrentUser()
  const scopes = useMemo(() => scopeOptions(user), [user])

  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there is nothing to report. Ask your administrator to assign your areas."
      />
    )
  }
  return (
    <OverviewContent
      scopes={scopes}
      fallbackScope={first}
      showLocations={coversSeveralLocations(user)}
    />
  )
}

function OverviewContent({
  scopes,
  fallbackScope,
  showLocations,
}: {
  scopes: readonly ScopeOption[]
  /** The area shown when the address names none, or one the user may not see. */
  fallbackScope: ScopeOption
  showLocations: boolean
}) {
  const link = useModuleLink()
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // The area and period live in the address, so a refresh or a shared link keeps them.
  const requestedScope = searchParams.get('scope')
  const scope = scopes.find((option) => option.value === requestedScope) ?? fallbackScope
  const requestedRange = searchParams.get('range')
  const range = OVERVIEW_RANGES.find((option) => option === requestedRange) ?? DEFAULT_RANGE

  const setFilter = (key: 'scope' | 'range', value: string) =>
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params)
        next.set(key, value)
        return next
      },
      { replace: true },
    )

  const query = useOverview({ scope: scope.value, range })
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
            onScopeChange={(value) => setFilter('scope', value)}
            range={range}
            onRangeChange={(value) => setFilter('range', value)}
            period={overview?.period}
            checkedAt={query.dataUpdatedAt}
          />
        </div>
        {overview && (
          <ScopeStrip
            scopeName={scope.name}
            range={range}
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
            showLocations={showLocations}
          />
          <InsightCardsRow overview={overview} />
          <AttentionCardsRow overview={overview} />
          <RecentActivityCard records={overview.recentActivity} />
        </>
      )}
    </div>
  )
}
