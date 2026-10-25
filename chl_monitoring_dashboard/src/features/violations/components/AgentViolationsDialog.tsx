import { Fact, Facts } from '@/features/verifications/components/VerificationDetailsDialog'
import { formatNumber } from '@/shared/lib/format'
import { Dialog } from '@/shared/ui/Dialog'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { searchTextOf } from '../violations-display'
import type { ViolationCase } from '../violations.schemas'
import type { RelatedKind } from '../related-records'
import { useCaseColumns } from './case-columns'
import styles from './ViolationCards.module.css'

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
  const columns = useCaseColumns('register', onOpen)
  const count = cases.length
  return (
    <Dialog
      title="Violations issued"
      subtitle={`${agent.name} · ${agent.id} · ${formatNumber(count)} ${count === 1 ? 'violation' : 'violations'} · ${periodText}`}
      wide
      onClose={onClose}
      footer={
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          Close
        </button>
      }
    >
      <Facts title="Agent">
        <Fact term="Name">{agent.name}</Fact>
        <Fact term="Agent ID">{agent.id}</Fact>
        <Fact term="Organization">{agent.organization}</Fact>
        <Fact term="Violations issued">{formatNumber(count)}</Fact>
      </Facts>

      <RegisterTable
        label={`Violations issued by ${agent.name}`}
        rows={cases}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
        pageSize={5}
      />
    </Dialog>
  )
}
