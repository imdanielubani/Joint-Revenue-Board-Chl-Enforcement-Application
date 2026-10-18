import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import type { ScopeOption } from '@/features/geography/scope-options'
import { CC_WINDOWS, type CcWindow, type CommandCentreFilters } from './command-centre.schemas'

export const DEFAULT_WINDOW: CcWindow = '24h'

interface Options {
  scopes: readonly ScopeOption[]
  /** The area shown when the address names none, or one the user may not see. */
  fallbackScope: ScopeOption
  /** True until CHL's area tree has loaded; until then only the user's own areas are known. */
  areasPending: boolean
}

/**
 * The Command centre's area and window, kept in the address so a refresh or a
 * shared link keeps them. An area outside the user's own is ignored.
 */
export function useCommandCentreFilters({ scopes, fallbackScope, areasPending }: Options) {
  const [params, setParams] = useSearchParams()

  const requestedScope = params.get('scope')
  const found = scopes.find((option) => option.value === requestedScope)
  const scope = found ?? fallbackScope
  // An area deeper than the user's own is only known once the area tree arrives.
  const waiting = !found && requestedScope !== null && areasPending
  const window = CC_WINDOWS.find((option) => option === params.get('window')) ?? DEFAULT_WINDOW

  const update = useCallback(
    (key: 'scope' | 'window', value: string) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.set(key, value)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  const filters: CommandCentreFilters = { scope: scope.value, window }
  return {
    filters,
    scope,
    waiting,
    setScope: (value: string) => update('scope', value),
    setWindow: (value: CcWindow) => update('window', value),
  }
}
