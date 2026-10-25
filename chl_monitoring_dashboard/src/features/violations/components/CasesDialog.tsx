import type { ReactNode } from 'react'
import { Facts } from '@/features/verifications/components/VerificationDetailsDialog'
import { Dialog } from '@/shared/ui/Dialog'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { searchTextOf } from '../violations-display'
import type { ViolationCase } from '../violations.schemas'
import type { RelatedKind } from '../related-records'
import { useCaseColumns } from './case-columns'
import styles from './ViolationCards.module.css'

/**
 * A popup listing violations: who or what they belong to, then the cases in the
 * violation register's own columns and row actions.
 */
export function CasesDialog({
  title,
  subtitle,
  factsTitle,
  facts,
  tableLabel,
  cases,
  onClose,
  onOpen,
}: {
  title: string
  subtitle: string
  /** "Agent", "Vehicle". */
  factsTitle: string
  /** The facts, as `<Fact>` rows. */
  facts: ReactNode
  tableLabel: string
  /** The violations, newest first. */
  cases: readonly ViolationCase[]
  onClose(): void
  /** Opens a case, or with `related`, its evidence, verification, agent or payment. */
  onOpen(item: ViolationCase, related?: RelatedKind): void
}) {
  const columns = useCaseColumns('register', onOpen)
  return (
    <Dialog
      title={title}
      subtitle={subtitle}
      wide
      onClose={onClose}
      footer={
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          Close
        </button>
      }
    >
      <Facts title={factsTitle}>{facts}</Facts>
      <RegisterTable
        label={tableLabel}
        rows={cases}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
        pageSize={5}
      />
    </Dialog>
  )
}
