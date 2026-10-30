import { useCallback } from 'react'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import type { TripRelated } from '@/features/trips/components/TripRelatedDialog'
import type { AuditEntry } from './audit.schemas'

/** A record an entry leads to: opened in its own popup on the page, or on its module's page. */
export type AuditLink = { label: string; related: TripRelated } | { label: string; to: string }

/**
 * The records an audit entry connects to (document 12.3): the verification and
 * the vehicle's verifications, the trip, the violation's case, evidence and
 * demand notice, the agent and the enforcement location. Each only where the
 * entry has one and the user may open its module.
 */
export function useAuditRelated() {
  const link = useModuleLink()
  return useCallback(
    (entry: AuditEntry): AuditLink[] => {
      const can = (module: Parameters<typeof link>[0], to: string) => link(module, to) !== undefined
      const items: (AuditLink | null)[] = [
        can('verifications', paths.verifications)
          ? {
              label: 'Verification details',
              related: { kind: 'verification', reference: entry.reference },
            }
          : null,
        can('verifications', paths.verifications)
          ? { label: 'Vehicle verifications', related: { kind: 'vehicle', plate: entry.plate } }
          : null,
        entry.tripId && can('trips', paths.trips)
          ? { label: 'Open the trip', to: `${paths.trips}?trip=${entry.tripId}` }
          : null,
        entry.violation && can('violations', paths.violations)
          ? { label: 'View case', related: { kind: 'case', violationId: entry.violation.id } }
          : null,
        entry.violation && can('evidence', paths.evidence)
          ? {
              label: 'View evidence',
              related: { kind: 'evidence', violationId: entry.violation.id },
            }
          : null,
        entry.payment && can('payments', paths.payments)
          ? {
              label: 'View demand notice',
              related: { kind: 'payment', noticeId: entry.payment.id },
            }
          : null,
        can('agents', paths.agents)
          ? { label: 'View agent', related: { kind: 'agent', agent: entry.agent } }
          : null,
        can('geography', paths.geography)
          ? { label: 'Open the location', to: `${paths.geography}?scope=${entry.location.id}` }
          : null,
      ]
      return items.filter((item): item is AuditLink => item !== null)
    },
    [link],
  )
}
