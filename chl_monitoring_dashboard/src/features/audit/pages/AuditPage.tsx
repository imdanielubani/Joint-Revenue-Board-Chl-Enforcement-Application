import { useMemo, useState } from 'react'
import { useAgents } from '@/features/agents/agents.queries'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { TripRelatedDialog, type TripRelated } from '@/features/trips/components/TripRelatedDialog'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { syncStateOf } from '@/features/verifications/verifications-display'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { downloadCsv } from '@/shared/lib/csv'
import { HeroButton, PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { useToast } from '@/shared/ui/toast/toast-context'
import { StatePanel } from '@/shared/ui/StatePanel'
import { applyAuditFilters } from '../audit-display'
import { auditCsvRows } from '../audit-export'
import { useAuditTrail } from '../audit.queries'
import { AuditEntryDialog } from '../components/AuditEntryDialog'
import { AuditRegister } from '../components/AuditRegister'
import { useAuditView } from '../use-audit-view'
import styles from './AuditPage.module.css'

/**
 * The complete audit trail (SRD 28, document 12.2): every recorded
 * verification attempt, successful or not, with its audit fields. Read-only:
 * no audit record is edited or deleted here.
 */
export function AuditPage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])
  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there is no audit trail to show. Ask your administrator to assign your areas."
      />
    )
  }
  return <AuditContent scopes={scopes} fallbackScope={first} areasPending={areas.isPending} />
}

function AuditContent({
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
  const agentList = useAgents()
  const filter = useOverviewFilters({ scopes, fallbackScope, areasPending, agents: agentList.data })
  const { scope, filters } = filter
  const page = useAuditView()
  const query = useAuditTrail(filters, { enabled: !filter.waiting })
  const data = query.data
  const subtitle = `${scope.name} · ${periodLabel(filters.range, filters)}`
  const entries = useMemo(() => data?.entries ?? [], [data])
  const counts = useMemo(
    () => ({
      unsuccessful: entries.filter((entry) => entry.attempt === 'unsuccessful').length,
      violations: entries.filter((entry) => entry.actionTaken === 'violation_issued').length,
      pending: entries.filter((entry) => syncStateOf(entry) === 'upload_pending').length,
      agents: new Set(entries.map((entry) => entry.agent.id)).size,
    }),
    [entries],
  )
  const open = entries.find((entry) => entry.reference === page.entryReference) ?? null
  // A record an entry leads to, open in its own popup in place of the entry.
  const [related, setRelated] = useState<TripRelated | null>(null)
  const { showToast } = useToast()

  /** Saves the entries the register shows, every audit field, as a CSV file. */
  const exportEntries = () => {
    const rows = applyAuditFilters(entries, page.filters)
    downloadCsv(`audit-trail-${filters.from}-to-${filters.to}.csv`, auditCsvRows(rows))
    showToast({
      title: 'Audit trail exported',
      lines: [`${rows.length} audit entries saved as a CSV file.`],
      key: 'audit-export',
    })
  }

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Audit trail"
          lede={`Every verification attempt recorded in ${scope.name}, successful or not, with its agent, method, result, location and what followed. Read-only: no audit record is edited or deleted here.`}
          section="Monitoring"
          icons="audit"
          actions={
            <>
              <RefreshButton
                refreshing={query.isFetching && !query.isPending}
                onRefresh={() => void query.refetch()}
              />
              <HeroButton
                variant="solid"
                icon="overview/export.svg"
                onClick={exportEntries}
                disabled={!data || entries.length === 0}
              >
                Export records
              </HeroButton>
            </>
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
          latestReceivedAt={data?.latestReceivedAt}
        />
      </div>

      {filter.waiting || query.isPending ? (
        <StatePanel kind="loading" message="Loading the audit trail…" />
      ) : !data ? (
        <StatePanel kind="error" error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <p className={styles.stale} role="status">
              The latest audit trail could not be loaded; this is from the last successful check.
            </p>
          )}
          <HeadlineFigures
            items={[
              {
                label: 'Verification attempts',
                value: entries.length,
                icon: 'overview/kpi-scan.svg',
                note: `Successful and unsuccessful · ${counts.agents} agents`,
              },
              {
                label: 'Unsuccessful attempts',
                value: counts.unsuccessful,
                icon: 'verifications/kpi-unavailable.svg',
                note: 'CHL could not complete the request',
                to: page.linkTo({ attempt: 'unsuccessful' }),
              },
              {
                label: 'Violations issued',
                value: counts.violations,
                icon: 'overview/kpi-violation.svg',
                note: 'The action taken after the verification',
                to: page.linkTo({ action: 'violation_issued' }),
              },
              {
                label: 'Upload pending',
                value: counts.pending,
                icon: 'verifications/kpi-pending.svg',
                note: 'Evidence still uploading from the device',
                to: page.linkTo({ sync: 'upload_pending' }),
              },
            ]}
          />
          {entries.length === 0 ? (
            <StatePanel
              kind="empty"
              message={`No verification attempts were recorded in ${scope.name} in this period.`}
            />
          ) : (
            <AuditRegister
              entries={entries}
              subtitle={`Every recorded verification attempt, newest first · ${subtitle}`}
              filters={page.filters}
              onFilterChange={page.setFilter}
              onOpen={(entry) => {
                setRelated(null)
                page.openEntry(entry.reference)
              }}
              onRelated={(next) => {
                page.openEntry(null)
                setRelated(next)
              }}
            />
          )}

          {open && (
            <AuditEntryDialog
              key={open.reference}
              entry={open}
              onRelated={(next) => {
                page.openEntry(null)
                setRelated(next)
              }}
              onClose={() => page.openEntry(null)}
            />
          )}
          {related && (
            <TripRelatedDialog
              key={JSON.stringify(related)}
              related={related}
              filters={filters}
              periodText={periodLabel(filters.range, filters)}
              onClose={() => setRelated(null)}
            />
          )}
          {page.entryReference && !open && (
            <p className={styles.stale} role="status">
              {page.entryReference} is not in the audit trail for this area and period. Choose
              another area or period to find it.
            </p>
          )}
        </>
      )}
    </div>
  )
}
