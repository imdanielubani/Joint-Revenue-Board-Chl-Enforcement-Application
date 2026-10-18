import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { Agent } from '@/features/agents/agents.api'
import { lagosDay } from '@/shared/lib/dates'
import { customPeriodProblem, presetPeriod, type Period } from './overview-period'
import {
  OVERVIEW_RANGES,
  type OverviewFilters,
  type OverviewRange,
  type PresetRange,
} from './overview.schemas'
import type { ScopeOption } from '@/features/geography/scope-options'

export const DEFAULT_RANGE: PresetRange = '14d'

/** The address parameters the Overview keeps its filters in. */
export const FILTER_PARAMS = {
  scope: 'scope',
  range: 'range',
  from: 'from',
  to: 'to',
  agent: 'agent',
  organization: 'org',
} as const
type FilterParam = (typeof FILTER_PARAMS)[keyof typeof FILTER_PARAMS]

interface Options {
  scopes: readonly ScopeOption[]
  /** The area shown when the address names none, or one the user may not see. */
  fallbackScope: ScopeOption
  /** True until CHL's area tree has loaded; until then only the user's own areas are known. */
  areasPending: boolean
  /** The agents the user may see; undefined while they load. */
  agents: readonly Agent[] | undefined
}

/**
 * The Overview's filters, kept in the address so a refresh or a shared link
 * keeps them. Values the user may not use (an area outside theirs, an agent
 * they cannot see) are ignored rather than trusted.
 */
export function useOverviewFilters({ scopes, fallbackScope, areasPending, agents }: Options) {
  const [params, setParams] = useSearchParams()

  const requestedScope = params.get(FILTER_PARAMS.scope)
  const found = scopes.find((option) => option.value === requestedScope)
  const scope = found ?? fallbackScope
  // An area deeper than the user's own is only known once the area tree arrives:
  // wait for it rather than briefly loading the wrong area.
  const waiting = !found && requestedScope !== null && areasPending

  // A custom period needs real dates, in order and not in the future; otherwise
  // the default period is shown.
  const today = lagosDay()
  const requestedRange = OVERVIEW_RANGES.find(
    (option) => option === params.get(FILTER_PARAMS.range),
  )
  const requestedFrom = params.get(FILTER_PARAMS.from) ?? ''
  const requestedTo = params.get(FILTER_PARAMS.to) ?? ''
  const customOk =
    requestedRange === 'custom' && customPeriodProblem(requestedFrom, requestedTo, today) === null
  const range: OverviewRange =
    requestedRange && (requestedRange !== 'custom' || customOk) ? requestedRange : DEFAULT_RANGE
  const period: Period =
    range === 'custom' ? { from: requestedFrom, to: requestedTo } : presetPeriod(range, today)

  const organizations = useMemo(
    () =>
      [...new Set((agents ?? []).flatMap((agent) => agent.organization ?? []))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [agents],
  )

  // Until the agents load, the address is trusted; once they have, unknown values are dropped.
  const requestedOrganization = params.get(FILTER_PARAMS.organization)
  const organization =
    requestedOrganization && (!agents || organizations.includes(requestedOrganization))
      ? requestedOrganization
      : null

  const agentOptions = useMemo(
    () => (agents ?? []).filter((agent) => !organization || agent.organization === organization),
    [agents, organization],
  )
  const requestedAgent = params.get(FILTER_PARAMS.agent)
  const agentId =
    requestedAgent && (!agents || agentOptions.some((agent) => agent.id === requestedAgent))
      ? requestedAgent
      : null

  const update = useCallback(
    (changes: Partial<Record<FilterParam, string | null>>) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value)
            else next.delete(key)
          }
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  const filters: OverviewFilters = { scope: scope.value, range, ...period, agentId, organization }

  return {
    filters,
    scope,
    /** True while the area named in the address cannot be checked yet. */
    waiting,
    organizations,
    agentOptions,
    agent: agents?.find((agent) => agent.id === agentId) ?? null,
    setScope: (value: string) => update({ [FILTER_PARAMS.scope]: value }),
    /** A preset period; "custom" keeps the current dates, to adjust from there. */
    setRange: (value: OverviewRange) =>
      update({
        [FILTER_PARAMS.range]: value,
        [FILTER_PARAMS.from]: value === 'custom' ? period.from : null,
        [FILTER_PARAMS.to]: value === 'custom' ? period.to : null,
      }),
    /** Dates the user picked; check them with customPeriodProblem first. */
    setCustomPeriod: (next: Period) =>
      update({
        [FILTER_PARAMS.range]: 'custom',
        [FILTER_PARAMS.from]: next.from,
        [FILTER_PARAMS.to]: next.to,
      }),
    setAgent: (value: string | null) => update({ [FILTER_PARAMS.agent]: value }),
    /** A new organization also clears an agent who is not in it. */
    setOrganization: (value: string | null) => {
      const keepsAgent =
        !value || !agentId || agents?.find((agent) => agent.id === agentId)?.organization === value
      update({
        [FILTER_PARAMS.organization]: value,
        ...(keepsAgent ? {} : { [FILTER_PARAMS.agent]: null }),
      })
    },
    clearPeopleFilters: () =>
      update({ [FILTER_PARAMS.agent]: null, [FILTER_PARAMS.organization]: null }),
  }
}
