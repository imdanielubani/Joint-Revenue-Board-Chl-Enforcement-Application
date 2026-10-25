import { Fact } from '@/features/verifications/components/VerificationDetailsDialog'
import { formatNumber } from '@/shared/lib/format'
import type { ViolationCase } from '../violations.schemas'
import type { RelatedKind } from '../related-records'
import { CasesDialog } from './CasesDialog'

/**
 * "Violations issued": an agent and every violation they issued in the area and
 * period, in the register's own columns and row actions.
 */
export function AgentViolationsDialog({
  agent,
  cases,
  periodText,
  onClose,
  onOpen,
}: {
  agent: { id: string; name: string; organization: string }
  /** The agent's violations, newest first. */
  cases: readonly ViolationCase[]
  /** "Last 30 days", or the dates of a custom range. */
  periodText: string
  onClose(): void
  /** Opens a case, or with `related`, its evidence, verification, agent or payment. */
  onOpen(item: ViolationCase, related?: RelatedKind): void
}) {
  const count = cases.length
  return (
    <CasesDialog
      title="Violations issued"
      subtitle={`${agent.name} · ${agent.id} · ${formatNumber(count)} ${count === 1 ? 'violation' : 'violations'} · ${periodText}`}
      factsTitle="Agent"
      facts={
        <>
          <Fact term="Name">{agent.name}</Fact>
          <Fact term="Agent ID">{agent.id}</Fact>
          <Fact term="Organization">{agent.organization}</Fact>
          <Fact term="Violations issued">{formatNumber(count)}</Fact>
        </>
      }
      tableLabel={`Violations issued by ${agent.name}`}
      cases={cases}
      onClose={onClose}
      onOpen={onOpen}
    />
  )
}
