import { useMemo } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router'
import { paths } from '@/config/paths'
import { useCurrentUser } from '@/features/auth/session-context'
import { useAreas } from '@/features/geography/areas.queries'
import { EnforcementFootprintCard } from '@/features/geography/components/GeographyCards'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { CasesCard, RepeatVehiclesCard } from '@/features/overview/components/AttentionCards'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { isApiError } from '@/shared/api/api-error'
import { MaskIcon } from '@/shared/ui/MaskIcon'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { StatePanel } from '@/shared/ui/StatePanel'
import { organizationLabel } from '../agents-display'
import { agentsListLink } from '../agents-links'
import { useAgentActivity, useAgents } from '../agents.queries'
import type { AgentsFilters } from '../agents.schemas'
import { EnforcementActivityCard, VerificationActivityCard } from '../components/AgentActivityCards'
import { AgentLocationsCard } from '../components/AgentLocationsCard'
import { AgentIdentityCard, PerformanceOverviewCard } from '../components/AgentProfileCards'
import styles from './AgentPage.module.css'

/**
 * One agent's page (SRD 5): their identity and assigned scope, the documented
 * metrics, their verification and enforcement activity, where they recorded
 * it, and what still needs follow-up — for the area and period chosen.
 * Read-only: the agent's account is administered in CHL.
 */
export function AgentPage() {
  const { recordId } = useParams()
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])

  if (!recordId) return <Navigate replace to={paths.agents} />
  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there is no agent activity to show. Ask your administrator to assign your areas."
      />
    )
  }
  return (
    <AgentContent
      agentId={recordId}
      scopes={scopes}
      fallbackScope={first}
      areasPending={areas.isPending}
    />
  )
}

function AgentContent({
  agentId,
  scopes,
  fallbackScope,
  areasPending,
}: {
  agentId: string
  scopes: readonly ScopeOption[]
  /** The area shown when the address names none, or one the user may not see. */
  fallbackScope: ScopeOption
  /** True until CHL's area tree has loaded; until then only the user's own areas are known. */
  areasPending: boolean
}) {
  const { search } = useLocation()
  // The area and period only: this page is about one agent already.
  const filter = useOverviewFilters({ scopes, fallbackScope, areasPending, agents: [] })
  const { scope, filters } = filter
  const period: AgentsFilters = {
    scope: filters.scope,
    range: filters.range,
    from: filters.from,
    to: filters.to,
  }

  const activity = useAgentActivity(agentId, period, { enabled: !filter.waiting })
  const data = activity.data
  // The agent's name and organization from the list of agents, until their activity arrives.
  const listed = useAgents().data?.find((agent) => agent.id === agentId)
  const name = data?.agent.name ?? listed?.name ?? agentId
  const organization = data ? data.agent.organization : listed ? listed.organization : undefined
  const notFound = isApiError(activity.error) && activity.error.status === 404
  const backToList = agentsListLink(search)
  const periodText = periodLabel(filters.range, filters)

  return (
    <div className={styles.page}>
      <div>
        <Link className={styles.back} to={backToList}>
          <MaskIcon src="agents/back-arrow.svg" size={16} />
          Back to all agents
        </Link>
        <PageHero
          title={name}
          lede={[
            agentId,
            organization === undefined ? null : organizationLabel(organization),
            'Recorded verification and enforcement activity',
          ]
            .filter(Boolean)
            .join(' · ')}
          section="Enforcement"
          icons="agents"
          actions={
            <RefreshButton
              refreshing={activity.isFetching && !activity.isPending}
              onRefresh={() => void activity.refetch()}
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
          checkedAt={activity.dataUpdatedAt}
          latestReceivedAt={data?.latestReceivedAt}
        />
      </div>

      {filter.waiting || activity.isPending ? (
        <StatePanel kind="loading" message={`Loading ${name}’s activity…`} />
      ) : notFound ? (
        <StatePanel
          kind="empty"
          message={`${name} has no assignment or recorded activity in ${scope.name}, or is not visible to your account. Choose another area, or go back to all agents.`}
        />
      ) : !data ? (
        <StatePanel kind="error" error={activity.error} onRetry={() => void activity.refetch()} />
      ) : (
        <>
          {activity.isError && (
            <p className={styles.stale} role="status">
              The latest figures could not be loaded; these are from the last successful check.
            </p>
          )}
          <div className={styles.profileRow}>
            <AgentIdentityCard agent={data.agent} />
            <PerformanceOverviewCard agent={data.agent} periodText={periodText} />
          </div>
          <VerificationActivityCard activity={data} />
          <EnforcementActivityCard activity={data} />
          <div className={styles.splitRow}>
            <EnforcementFootprintCard
              title="Activity by location"
              subtitle="Enforcement points and the GPS recorded with the agent’s verifications"
              points={data.locations}
              verifications={data.records.verifications}
              selectedId={null}
              agentId={agentId}
              emptyText="The agent recorded no activity at an enforcement location in this period."
            />
            <AgentLocationsCard locations={data.locations} />
          </div>
          <div className={styles.pairRow}>
            <CasesCard
              cases={data.cases}
              title="Unresolved cases"
              subtitle="Follow-up: the agent’s violations not yet resolved, escalated included"
              scope={scope.value}
              agentId={agentId}
            />
            <RepeatVehiclesCard
              repeat={data.repeatVehicles}
              title="Repeat-vehicle reports"
              subtitle="Follow-up: alerts for vehicles the agent reported"
              scope={scope.value}
              agentId={agentId}
            />
          </div>
          <p className={styles.note}>
            Read-only: the agent’s account, assignments and organization are managed in CHL. Counts
            of recorded activity — no scores, rankings, attendance, shifts or payroll. Only records
            CHL has received are counted.
          </p>
        </>
      )}
    </div>
  )
}
