import { methodLabel, outcomeLabel } from '@/features/overview/overview-display'
import { VERIFICATION_METHODS } from '@/features/overview/overview.schemas'
import {
  actionPill,
  attemptPill,
  OUTCOME_ORDER,
  SYNC_LABELS,
  SYNC_STATES,
  syncStateOf,
} from '@/features/verifications/verifications-display'
import { ACTIONS_TAKEN, ATTEMPT_STATUSES } from '@/features/verifications/verifications.schemas'
import type { AuditEntry } from './audit.schemas'
import type { AuditRegisterFilters } from './use-audit-view'

/** The filter value for entries CHL supplied no value for. */
export const NOT_SUPPLIED = 'not_supplied'

const notSupplied = { value: NOT_SUPPLIED, label: 'Not supplied' }

/** The register's filters' choices, "Not supplied" last where CHL may leave the field empty. */
export const FILTER_OPTIONS = {
  method: VERIFICATION_METHODS.map((value) => ({ value, label: methodLabel(value) })),
  result: OUTCOME_ORDER.map((value) => ({ value, label: outcomeLabel(value) })),
  attempt: [
    ...ATTEMPT_STATUSES.map((value) => ({ value, label: attemptPill(value).label })),
    notSupplied,
  ],
  action: [
    ...ACTIONS_TAKEN.map((value) => ({ value, label: actionPill(value).label })),
    notSupplied,
  ],
  sync: SYNC_STATES.map((value) => ({ value, label: SYNC_LABELS[value] })),
} as const

/** The entries the register's filters let through; null lets everything through. */
export function applyAuditFilters(
  entries: readonly AuditEntry[],
  filters: AuditRegisterFilters,
): AuditEntry[] {
  const is = (wanted: string | null, value: string | null) =>
    wanted === null || wanted === (value ?? NOT_SUPPLIED)
  return entries.filter(
    (entry) =>
      is(filters.method, entry.method) &&
      is(filters.result, entry.result) &&
      is(filters.attempt, entry.attempt) &&
      is(filters.action, entry.actionTaken) &&
      is(filters.sync, syncStateOf(entry)),
  )
}

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
