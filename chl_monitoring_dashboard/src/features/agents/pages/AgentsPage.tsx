import { useCallback, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { paths } from '@/config/paths'
import { useCurrentUser } from '@/features/auth/session-context'
import { useModuleLink } from '@/features/auth/use-module-link'
import { useAreas } from '@/features/geography/areas.queries'
import { scopeOptions, type ScopeOption } from '@/features/geography/scope-options'
import { OverviewFilterBar } from '@/features/overview/components/OverviewHeader'
import { periodLabel } from '@/features/overview/overview-period'
import { FILTER_PARAMS, useOverviewFilters } from '@/features/overview/use-overview-filters'
import { HeadlineFigures } from '@/shared/ui/HeadlineFigures'
import { PageHero, RefreshButton } from '@/shared/ui/PageHero'
import { StatePanel } from '@/shared/ui/StatePanel'
import { totalsOf } from '../agents-display'
import { agentPageLink } from '../agents-links'
import { useAgents, useAgentsMonitoring } from '../agents.queries'
import type { AgentsFilters } from '../agents.schemas'
import { AgentDetailsDialog } from '../components/AgentDetailsDialog'
import { AgentRegisterCard } from '../components/AgentRegisterCard'
import { OrganizationsCard } from '../components/OrganizationsCard'
import styles from './AgentsPage.module.css'

/**
 * Agents & organizations (SRD 5): the existing agents the user may see — who
 * they are, the scope CHL assigns them and what they recorded — by vendor or
 * organization. Each agent has their own page for their full activity. A
 * monitoring view: it never creates or administers agent accounts, and never
 * scores or ranks agents.
 */
export function AgentsPage() {
  const user = useCurrentUser()
  const areas = useAreas()
  const scopes = useMemo(() => scopeOptions(user, areas.data), [user, areas.data])
  const [params] = useSearchParams()
  const { search } = useLocation()

  // An agent named the old way ("/agents?agent=…") has their own page now.
  const requestedAgent = params.get(FILTER_PARAMS.agent)
  if (requestedAgent) return <Navigate replace to={agentPageLink(requestedAgent, search)} />

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
  const navigate = useNavigate()
  const { search } = useLocation()
  const agentList = useAgents()
  const filter = useOverviewFilters({
    scopes,
    fallbackScope,
    areasPending,
    agents: agentList.data,
  })
  const { scope, filters, setOrganization } = filter
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

  // The agent whose details are open in a popup, from the register's actions.
  const [detailsFor, setDetailsFor] = useState<string | null>(null)
  const detailsAgent = detailsFor ? (inView.find((agent) => agent.id === detailsFor) ?? null) : null
  const agentLink = useCallback((agentId: string) => agentPageLink(agentId, search), [search])

  const scoped = (to: string) =>
    `${to}${to.includes('?') ? '&' : '?'}scope=${encodeURIComponent(scope.value)}`
  const periodText = periodLabel(filters.range, filters)

  return (
    <div className={styles.page}>
      <div>
        <PageHero
          title="Agents & organizations"
          lede="Each agent’s recorded verification and enforcement activity, by vendor or organization."
          section="Enforcement"
          icons="agents"
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
          people={{
            organizations: filter.organizations,
            organization: filters.organization,
            onOrganizationChange: setOrganization,
            // Each agent has a page of their own: the register opens it, so no agent filter here.
            agents: [],
            agentId: null,
            onAgentChange: () => {},
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
            agentLink={agentLink}
            onViewDetails={setDetailsFor}
          />

          {detailsAgent && (
            <AgentDetailsDialog
              agent={detailsAgent}
              periodText={periodText}
              onClose={() => setDetailsFor(null)}
              onShowActivity={() => {
                setDetailsFor(null)
                void navigate(agentLink(detailsAgent.id))
              }}
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
