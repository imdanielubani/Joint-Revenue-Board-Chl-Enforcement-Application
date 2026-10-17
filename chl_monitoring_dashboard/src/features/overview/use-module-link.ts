import { useCallback } from 'react'
import type { ModuleKey } from '@/features/auth/auth.schemas'
import { useCurrentUser } from '@/features/auth/session-context'

/**
 * Links from the Overview into the modules. A module the user may not open
 * gets no link (undefined), so its figure shows without leading to a refusal.
 */
export function useModuleLink() {
  const { modules } = useCurrentUser()
  return useCallback(
    (module: ModuleKey, to: string): string | undefined =>
      modules.includes(module) ? to : undefined,
    [modules],
  )
}
