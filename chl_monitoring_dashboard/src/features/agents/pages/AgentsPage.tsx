import type { UseQueryResult } from '@tanstack/react-query'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type Ref } from 'react'
import { paths } from '@/config/paths'
import { useCurrentUser } from '@/features/auth/session-context'
import { useModuleLink } from '@/features/auth/use-module-link'
import { useAreas } from '@/features/geography/areas.queries'
import { EnforcementFootprintCard } from '@/features/geography/components/GeographyCards'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { CasesCard, RepeatVehiclesCard } from '@/features/overview/components/AttentionCards'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { useOverviewFilters } from '@/features/overview/use-overview-filters'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { StatePanel } from '@/shared/ui/StatePanel'
import { totalsOf } from '../agents-display'
import { useAgentActivity, useAgents, useAgentsMonitoring } from '../agents.queries'
import type { AgentActivity, AgentsFilters, AgentSummary } from '../agents.schemas'
import { EnforcementActivityCard, VerificationActivityCard } from '../components/AgentActivityCards'
import { AgentDetailsDialog } from '../components/AgentDetailsDialog'
import { AgentLocationsCard } from '../components/AgentLocationsCard'
import { AgentIdentityCard, PerformanceOverviewCard } from '../components/AgentProfileCards'
import { AgentRegisterCard } from '../components/AgentRegisterCard'
import { OrganizationsCard } from '../components/OrganizationsCard'
import styles from './AgentsPage.module.css'

/**
 * Agents & organizations (SRD 5): the existing agents the user may see — who
 * they are, the scope CHL assigns them, what they recorded and what still needs
 * follow-up. A monitoring view: it never creates or administers agent accounts,
 * and never scores or ranks agents.
 */
export function AgentsPage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])

  const [first] = scopes
  if (!first) {
    return (
      <StatePanel
        kind="empty"
        message="No areas are assigned to your account in CHL yet, so there are no agents to show. Ask your administrator to assign your areas."
      />
    )
  }
  return <AgentsContent scopes={scopes} fallbackScope={first} areasPending={areas.isPending} />
}

function AgentsContent({
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
  const agentList = useAgents()
  const filter = useOverviewFilters({
    scopes,
    fallbackScope,
    areasPending,
    agents: agentList.data,
  })
  const { scope, filters, setAgent, setOrganization } = filter
  const period: AgentsFilters = {
    scope: filters.scope,
    range: filters.range,
    from: filters.from,
    to: filters.to,
  }

  const query = useAgentsMonitoring(period, { enabled: !filter.waiting })
  const monitoring = query.data
  // The organization filter narrows the agents in view; the figures are theirs.
  const inView = useMemo(
    () =>
      (monitoring?.agents ?? []).filter(
        (agent) => !filters.organization || agent.organization === filters.organization,
      ),
    [monitoring, filters.organization],
  )
  const totals = totalsOf(inView)
  const selected = filters.agentId
    ? (inView.find((agent) => agent.id === filters.agentId) ?? null)
    : null
  // The chosen agent's records, once they are known to be in the area.
  const activity = useAgentActivity(selected?.id ?? null, period, { enabled: !filter.waiting })

  // The agent whose details are open in a popup, from the register's actions.
  const [detailsFor, setDetailsFor] = useState<string | null>(null)
  const detailsAgent = detailsFor ? (inView.find((agent) => agent.id === detailsFor) ?? null) : null

  // A name chosen in the register brings its activity into view.
  const detailRef = useRef<HTMLElement>(null)
  const scrollPending = useRef(false)
  const selectAgent = useCallback(
    (agentId: string) => {
      scrollPending.current = true
      setAgent(agentId)
    },
    [setAgent],
  )
  useEffect(() => {
    if (!scrollPending.current || !detailRef.current) return
    scrollPending.current = false
    detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [filters.agentId, monitoring])

  const scoped = (to: string) =>
    `${to}${to.includes('?') ? '&' : '?'}scope=${encodeURIComponent(scope.value)}`
  const refreshing =
    (query.isFetching && !query.isPending) || (activity.isFetching && !activity.isPending)
  const refresh = () => {
    void query.refetch()
    if (selected) void activity.refetch()
  }
  const periodText = periodLabel(filters.range, filters)

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Agents & organizations"
          lede="Each agent’s recorded verification and enforcement activity, by vendor or organization."
          section="Enforcement"
          icons="agents"
          actions={<RefreshButton refreshing={refreshing} onRefresh={refresh} />}
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
            onOrganizationChange: setOrganization,
            agents: filter.agentOptions,
            agentId: filters.agentId,
            onAgentChange: setAgent,
            onClear: filter.clearPeopleFilters,
          }}
          checkedAt={query.dataUpdatedAt}
          latestReceivedAt={monitoring?.latestReceivedAt}
        />
      </div>

      {filter.waiting || query.isPending ? (
        <StatePanel kind="loading" message="Loading agents…" />
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
                label: 'Agents in view',
                value: totals.agents,
                icon: 'overview/kpi-agents.svg',
                note: `${totals.active} with recorded activity`,
              },
              {
                label: 'Verifications',
                value: totals.verifications,
                icon: 'overview/kpi-scan.svg',
                note: 'Outcomes, not unique trips',
                to: link('verifications', scoped(paths.verifications)),
              },
              {
                label: 'Violations issued',
                value: totals.violationsIssued,
                icon: 'overview/kpi-violation.svg',
                note: `${totals.evidenceSubmitted} with evidence submitted`,
                to: link('violations', scoped(paths.violations)),
              },
              {
                label: 'Unresolved cases',
                value: totals.unresolved,
                icon: 'overview/kpi-unresolved.svg',
                note: `${totals.escalated} escalated within this total`,
                to: link('violations', scoped(`${paths.violations}?status=unresolved`)),
              },
            ]}
          />

          <AgentRegisterCard
            agents={inView}
            scope={scope.value}
            scopeName={scope.name}
            selectedId={selected?.id ?? null}
            onSelect={selectAgent}
            onViewDetails={setDetailsFor}
          />

          {detailsAgent && (
            <AgentDetailsDialog
              agent={detailsAgent}
              periodText={periodText}
              onClose={() => setDetailsFor(null)}
              onShowActivity={() => {
                setDetailsFor(null)
                selectAgent(detailsAgent.id)
              }}
            />
          )}

          {filters.agentId && (
            <SelectedAgent
              ref={detailRef}
              agentId={filters.agentId}
              agentName={filter.agent?.name ?? filters.agentId}
              agent={selected}
              activity={activity}
              scope={scope.value}
              scopeName={scope.name}
              periodText={periodText}
              onClose={() => setAgent(null)}
            />
          )}

          <OrganizationsCard
            agents={monitoring.agents}
            selected={filters.organization}
            onSelect={setOrganization}
          />

          <p className={styles.note}>
            This module monitors existing agents; it does not create or administer their accounts.
            Only records CHL has received are counted — uploads still pending on a device are not.
          </p>
        </>
      )}
    </div>
  )
}

/**
 * The chosen agent's identity, documented metrics and records, or why they are
 * not shown for this area.
 */
function SelectedAgent({
  ref,
  agentId,
  agentName,
  agent,
  activity,
  scope,
  scopeName,
  periodText,
  onClose,
}: {
  ref: Ref<HTMLElement>
  agentId: string
  agentName: string
  /** Null when the agent has no assignment or activity in the area. */
  agent: AgentSummary | null
  /** The agent's records and follow-up, loaded once they are known to be in the area. */
  activity: UseQueryResult<AgentActivity>
  /** The area's id, for links into the modules. */
  scope: string
  scopeName: string
  periodText: string
  onClose(): void
}) {
  const headingId = useId()
  return (
    <section ref={ref} className={styles.detail} aria-labelledby={headingId}>
      <div className={styles.detailHead}>
        <div>
          <p className={styles.eyebrow}>Selected agent</p>
          <h2 id={headingId} className={styles.detailTitle}>
            {agentName} <span className={styles.detailId}>· {agentId}</span>
          </h2>
        </div>
        <button type="button" className={styles.back} onClick={onClose}>
          Show all agents
        </button>
      </div>
      {agent ? (
        <>
          <div className={styles.profileRow}>
            <AgentIdentityCard agent={agent} />
            <PerformanceOverviewCard agent={agent} periodText={periodText} />
          </div>
          {activity.data ? (
            <>
              <VerificationActivityCard activity={activity.data} />
              <EnforcementActivityCard activity={activity.data} />
              <div className={styles.splitRow}>
                <EnforcementFootprintCard
                  title="Activity by location"
                  subtitle="Enforcement points and the GPS recorded with the agent’s verifications"
                  points={activity.data.locations}
                  verifications={activity.data.records.verifications}
                  selectedId={null}
                  agentId={agent.id}
                  emptyText="The agent recorded no activity at an enforcement location in this period."
                />
                <AgentLocationsCard locations={activity.data.locations} />
              </div>
              <div className={styles.pairRow}>
                <CasesCard
                  cases={activity.data.cases}
                  title="Unresolved cases"
                  subtitle="Follow-up: the agent’s violations not yet resolved, escalated included"
                  scope={scope}
                  agentId={agent.id}
                />
                <RepeatVehiclesCard
                  repeat={activity.data.repeatVehicles}
                  title="Repeat-vehicle reports"
                  subtitle="Follow-up: alerts for vehicles the agent reported"
                  scope={scope}
                  agentId={agent.id}
                />
              </div>
            </>
          ) : activity.isPending ? (
            <StatePanel kind="loading" message={`Loading ${agent.name}’s records…`} />
          ) : (
            <StatePanel
              kind="error"
              error={activity.error}
              onRetry={() => void activity.refetch()}
            />
          )}
        </>
      ) : (
        <StatePanel
          kind="empty"
          message={`${agentName} has no assignment or recorded activity in ${scopeName}. Choose another area, or another agent from the register.`}
        />
      )}
    </section>
  )
}
