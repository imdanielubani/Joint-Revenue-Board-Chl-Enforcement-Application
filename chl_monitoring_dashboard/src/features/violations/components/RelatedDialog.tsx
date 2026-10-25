import { useLocation, useNavigate } from 'react-router'
import { paths } from '@/config/paths'
import { agentPageLink } from '@/features/agents/agents-links'
import { useAgentsMonitoring } from '@/features/agents/agents.queries'
import { AgentDetailsDialog } from '@/features/agents/components/AgentDetailsDialog'
import { EvidenceViewer } from '@/features/evidence/components/EvidenceViewer'
import { useEvidenceMonitoring } from '@/features/evidence/evidence.queries'
import type { OverviewFilters } from '@/features/overview/overview.schemas'
import { NoticePopup } from '@/features/payments/components/NoticePopup'
import { VerificationDetailsDialog } from '@/features/verifications/components/VerificationDetailsDialog'
import { useVerificationsMonitoring } from '@/features/verifications/verifications.queries'
import { Dialog } from '@/shared/ui/Dialog'
import { StatePanel } from '@/shared/ui/StatePanel'
import type { ViolationCase } from '../violations.schemas'
import type { RelatedKind } from '../related-records'
import styles from './ViolationCards.module.css'

export type { RelatedKind }

export interface Related {
  kind: RelatedKind
  item: ViolationCase
}

interface RelatedProps {
  item: ViolationCase
  /** The area, period and people the case was found in: the popup's record is looked up there too. */
  filters: OverviewFilters
  onClose(): void
}

/** While the record loads, or when it cannot be found: a popup saying so. */
function Placeholder({
  title,
  loading,
  message,
  onClose,
}: {
  title: string
  loading: boolean
  message: string
  onClose(): void
}) {
  return (
    <Dialog
      title={title}
      onClose={onClose}
      footer={
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          Close
        </button>
      }
    >
      {loading ? (
        <StatePanel kind="loading" message="Loading…" />
      ) : (
        <p className={styles.small}>{message}</p>
      )}
    </Dialog>
  )
}

function EvidencePopup({ item, filters, onClose }: RelatedProps) {
  const query = useEvidenceMonitoring(filters)
  const entry = query.data?.records.find((record) => record.violation.id === item.id)
  if (entry) return <EvidenceViewer entry={entry} startGroup={null} onClose={onClose} />
  return (
    <Placeholder
      title={`Evidence for ${item.id}`}
      loading={query.isPending}
      message="No evidence for this violation was found in this area and period."
      onClose={onClose}
    />
  )
}

function VerificationPopup({ item, filters, onClose }: RelatedProps) {
  const navigate = useNavigate()
  const query = useVerificationsMonitoring(filters)
  const entry = query.data?.records.find(
    (record) => record.reference === item.verification.reference,
  )
  if (entry) {
    return (
      <VerificationDetailsDialog
        entry={entry}
        onClose={onClose}
        onVehicle={(plate) => void navigate(`${paths.verifications}?plate=${plate}`)}
      />
    )
  }
  return (
    <Placeholder
      title="Verification details"
      loading={query.isPending}
      message={`Verification ${item.verification.reference} was not found in this area and period.`}
      onClose={onClose}
    />
  )
}

/** An agent's details, in the popup Agents & organizations shows, looked up in the area and period. */
export function AgentPopup({
  agent: wanted,
  filters,
  periodText,
  onClose,
}: {
  agent: { id: string; name: string }
  filters: Pick<OverviewFilters, 'scope' | 'range' | 'from' | 'to'>
  /** "Last 30 days", for the agent's details. */
  periodText: string
  onClose(): void
}) {
  const navigate = useNavigate()
  const { search } = useLocation()
  const query = useAgentsMonitoring({
    scope: filters.scope,
    range: filters.range,
    from: filters.from,
    to: filters.to,
  })
  const agent = query.data?.agents.find((entry) => entry.id === wanted.id)
  if (agent) {
    return (
      <AgentDetailsDialog
        agent={agent}
        periodText={periodText}
        onClose={onClose}
        onShowActivity={() => void navigate(agentPageLink(agent.id, search))}
      />
    )
  }
  return (
    <Placeholder
      title="Agent details"
      loading={query.isPending}
      message={`${wanted.name} (${wanted.id}) was not found among the agents in this area and period.`}
      onClose={onClose}
    />
  )
}

/**
 * A case's evidence, verification, agent or demand notice, in the same popup
 * its own module shows, so the case need not be left to see them.
 */
export function RelatedDialog({
  related,
  filters,
  periodText,
  onClose,
}: {
  related: Related
  filters: OverviewFilters
  /** "Last 30 days", for the agent's details. */
  periodText: string
  onClose(): void
}) {
  const props = { item: related.item, filters, onClose }
  if (related.kind === 'evidence') return <EvidencePopup {...props} />
  if (related.kind === 'verification') return <VerificationPopup {...props} />
  if (related.kind === 'payment') {
    return related.item.notice ? (
      <NoticePopup noticeId={related.item.notice.id} filters={filters} onClose={onClose} />
    ) : (
      <Placeholder
        title="Demand notice"
        loading={false}
        message={`No demand notice was issued for ${related.item.id}.`}
        onClose={onClose}
      />
    )
  }
  return (
    <AgentPopup
      agent={related.item.agent}
      filters={filters}
      periodText={periodText}
      onClose={onClose}
    />
  )
}
