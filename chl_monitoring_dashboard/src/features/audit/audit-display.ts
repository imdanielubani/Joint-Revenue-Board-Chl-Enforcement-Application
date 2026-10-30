import { outcomeLabel } from '@/features/overview/overview-display'
import type { AuditEntry } from './audit.schemas'

/** "Tunde Okafor · JRB-AG-0142". */
export const agentText = (entry: AuditEntry) => `${entry.agent.name} · ${entry.agent.id}`

/** The agent's organization, or why there is none to show. */
export const organizationText = (entry: AuditEntry) =>
  entry.organization ?? 'No organization recorded'

/** The text the audit register's search matches. */
export function searchTextOf(entry: AuditEntry): string {
  return [
    entry.reference,
    entry.plate,
    entry.vehicle.id ?? '',
    entry.agent.name,
    entry.agent.id,
    entry.organization ?? '',
    entry.location.name,
    entry.location.area,
    entry.location.code,
    entry.result ? outcomeLabel(entry.result) : '',
    entry.tripId ?? '',
    entry.violation?.id ?? '',
  ].join(' ')
}
