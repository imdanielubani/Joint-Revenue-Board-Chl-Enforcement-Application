import { useCallback } from 'react'
import type { ModuleKey } from '@/features/auth/auth.schemas'
import { useCurrentUser } from '@/features/auth/session-context'

/** The records a case links to, opened in their own module's popup on the page. */
export type RelatedKind = 'evidence' | 'verification' | 'agent' | 'payment'

/** The module each related record belongs to: offered only to roles that may see it. */
const RELATED_MODULES = {
  evidence: 'evidence',
  verification: 'verifications',
  agent: 'agents',
  payment: 'payments',
} as const satisfies Record<RelatedKind, ModuleKey>

/** Whether the signed-in role may see a related record's module, as its links are offered. */
export function useCanSeeRelated() {
  const { modules } = useCurrentUser()
  return useCallback((kind: RelatedKind) => modules.includes(RELATED_MODULES[kind]), [modules])
}
