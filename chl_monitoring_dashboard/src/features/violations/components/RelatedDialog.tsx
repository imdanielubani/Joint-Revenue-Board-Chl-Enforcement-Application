import { useLocation, useNavigate } from 'react-router'
import { paths } from '@/config/paths'
import { agentPageLink } from '@/features/agents/agents-links'
import { useAgentsMonitoring } from '@/features/agents/agents.queries'
import { AgentDetailsDialog } from '@/features/agents/components/AgentDetailsDialog'
import { EvidenceViewer } from '@/features/evidence/components/EvidenceViewer'
import { useEvidenceMonitoring } from '@/features/evidence/evidence.queries'
import type { OverviewFilters } from '@/features/overview/overview.schemas'
import { VerificationDetailsDialog } from '@/features/verifications/components/VerificationDetailsDialog'
import { useVerificationsMonitoring } from '@/features/verifications/verifications.queries'
import { Dialog } from '@/shared/ui/Dialog'
import { StatePanel } from '@/shared/ui/StatePanel'
import type { ViolationCase } from '../violations.schemas'
import styles from './ViolationCards.module.css'

/** The records a case links to, opened in their own module's popup on this page. */
export type RelatedKind = 'evidence' | 'verification' | 'agent'

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

function AgentPopup({ item, filters, periodText, onClose }: RelatedProps & { periodText: string }) {
  const navigate = useNavigate()
  const { search } = useLocation()
  const query = useAgentsMonitoring({
    scope: filters.scope,
    range: filters.range,
    from: filters.from,
    to: filters.to,
  })
  const agent = query.data?.agents.find((entry) => entry.id === item.agent.id)
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
      message={`${item.agent.name} (${item.agent.id}) was not found among the agents in this area and period.`}
      onClose={onClose}
    />
  )
}

/**
 * A case's evidence, verification or agent, in the same popup its own module
 * shows, so the case need not be left to see them.
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
  return <AgentPopup {...props} periodText={periodText} />
}
