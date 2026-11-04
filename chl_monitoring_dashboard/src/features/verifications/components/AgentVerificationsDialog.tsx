import { useMemo } from 'react'
import { useModuleLink } from '@/features/auth/use-module-link'
import { verificationColumns } from '@/features/geography/components/record-columns'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { formatDateTime, formatNumber } from '@/shared/lib/format'
import type { Column } from '@/shared/ui/DataTable'
import { Dialog } from '@/shared/ui/Dialog'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions } from '@/shared/ui/RowActions'
import { searchTextOf } from '../verifications-display'
import type { VerificationEntry } from '../verifications.schemas'
import { Fact, Facts } from './VerificationDetailsDialog'
import styles from './VerificationCards.module.css'

/** The agent's verifications: the cells other modules show, the reference as plain text. */
function useColumns(onOpen: (entry: VerificationEntry) => void): Column<VerificationEntry>[] {
  const link = useModuleLink()
  return useMemo(() => {
    const shared = verificationColumns(link, (row) => onOpen(row as VerificationEntry))
    const column = (key: string): Column<VerificationEntry> => {
      const found = shared.find((entry) => entry.key === key)
      if (!found) throw new Error(`No shared verification column "${key}"`)
      return found
    }
    return [
      {
        key: 'reference',
        header: 'Reference',
        render: (row) => <span className={cells.plate}>{row.reference}</span>,
        sortValue: (row) => row.reference,
      },
      // The headings the verification register uses.
      column('plate'),
      { ...column('method'), header: 'Method' },
      { ...column('outcome'), header: 'Outcome' },
      column('recorded'),
      {
        key: 'location',
        header: 'Location',
        render: (row) => (
          <Stack
            main={row.location.name}
            sub={[row.location.area, row.location.code].filter(Boolean).join(' · ')}
          />
        ),
        sortValue: (row) => `${row.location.area} ${row.location.name}`,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => (
          <RowActions
            label={`Actions for ${row.reference}`}
            actions={[{ label: 'View details', onSelect: () => onOpen(row) }]}
          />
        ),
      },
    ]
  }, [link, onOpen])
}

/**
 * "Verifications": an agent and every verification they recorded in the area
 * and period, as the vehicle's verifications popup shows a plate's.
 */
export function AgentVerificationsDialog({
  agent,
  records,
  periodText,
  onClose,
  onOpen,
}: {
  agent: { id: string; name: string; organization: string }
  /** The agent's verifications, newest first. */
  records: readonly VerificationEntry[]
  /** "Last 30 days", or the dates of a custom range. */
  periodText: string
  onClose(): void
  /** Opens one of the verifications. */
  onOpen(entry: VerificationEntry): void
}) {
  const columns = useColumns(onOpen)
  const count = records.length
  const [latest] = records
  return (
    <Dialog
      title="Verifications"
      subtitle={`${agent.name} · ${agent.id} · ${formatNumber(count)} ${count === 1 ? 'verification' : 'verifications'} · ${periodText}`}
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
        <Fact term="Verifications">{formatNumber(count)}</Fact>
        <Fact term="Last verified">
          {latest ? formatDateTime(latest.recordedAt) : 'None recorded'}
        </Fact>
      </Facts>

      {count === 0 ? (
        <p className={styles.small}>{agent.name} recorded no verifications in this period.</p>
      ) : (
        <RegisterTable
          label={`Verifications by ${agent.name}`}
          rows={records}
          columns={columns}
          rowKey={(row) => row.id}
          searchText={searchTextOf}
          pageSize={5}
        />
      )}
    </Dialog>
  )
}
