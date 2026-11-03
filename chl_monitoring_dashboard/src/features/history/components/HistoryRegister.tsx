import { useMemo } from 'react'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import {
  actionStatusLabel,
  actionStatusTone,
  outcomeLabel,
  outcomeStyle,
} from '@/features/overview/overview-display'
import { PillLabel } from '@/features/verifications/components/RecordsPanel'
import {
  actionPill,
  attemptPill,
  pendingActions,
} from '@/features/verifications/verifications-display'
import type { VerificationEntry } from '@/features/verifications/verifications.schemas'
import { formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { paymentStatusText, searchTextOf } from '../history-display'
import styles from './HistoryRegister.module.css'

const none = (text = 'None') => <span className={cells.sub}>{text}</span>

/**
 * The history register (document 12.1): the recorded verification attempts in
 * the area and period, newest first, with whether each was completed, the
 * action taken, the linked violation, the payment request generated and what
 * is still pending.
 */
export function HistoryRegister({
  records,
  subtitle,
}: {
  records: readonly VerificationEntry[]
  /** The area and period: "Lagos · Last 14 days". */
  subtitle: string
}) {
  const columns = useMemo<Column<VerificationEntry>[]>(
    () => [
      {
        key: 'recorded',
        header: 'Date and time (WAT)',
        render: (row) => <Stack main={formatShortDateTime(row.recordedAt)} sub={row.reference} />,
        sortValue: (row) => Date.parse(row.recordedAt),
      },
      {
        key: 'agent',
        header: 'Agent',
        render: (row) => <Stack main={row.agent.name} sub={row.agent.id} />,
        sortValue: (row) => row.agent.name,
      },
      {
        key: 'vehicle',
        header: 'Vehicle',
        render: (row) => (
          <span className={styles.vehicle}>
            <span className={cells.plate}>{row.plate}</span>
            <span className={cells.sub}>{row.vehicle.id ?? 'Not resolved by CHL'}</span>
          </span>
        ),
        sortValue: (row) => row.plate,
      },
      {
        key: 'result',
        header: 'Result',
        render: (row) =>
          row.result ? (
            <StatusLabel {...outcomeStyle(row.result)}>{outcomeLabel(row.result)}</StatusLabel>
          ) : (
            none('Not supplied')
          ),
        sortValue: (row) => (row.result ? outcomeLabel(row.result) : ''),
      },
      {
        key: 'completion',
        header: 'Completion status',
        render: (row) => <PillLabel pill={attemptPill(row.attempt)} />,
        sortValue: (row) => attemptPill(row.attempt).label,
      },
      {
        key: 'action',
        header: 'Action taken',
        render: (row) => <PillLabel pill={actionPill(row.actionTaken)} />,
        sortValue: (row) => actionPill(row.actionTaken).label,
      },
      {
        key: 'violation',
        header: 'Linked violation',
        render: (row) =>
          row.violation ? (
            <span className={styles.stack}>
              <Stack main={row.violation.id} sub={row.violation.category} />
              <StatusLabel tone={actionStatusTone(row.violation.status)}>
                {actionStatusLabel(row.violation.status)}
              </StatusLabel>
            </span>
          ) : (
            none()
          ),
        sortValue: (row) => row.violation?.id ?? '',
      },
      {
        key: 'payment',
        header: 'Payment request',
        render: (row) =>
          row.payment ? (
            <Stack main={row.payment.id} sub={paymentStatusText(row.payment)} />
          ) : (
            none()
          ),
        sortValue: (row) => row.payment?.id ?? '',
      },
      {
        key: 'pending',
        header: 'Pending actions',
        render: (row) => {
          const pending = pendingActions(row)
          return pending.length ? (
            <span className={styles.pending}>{pending.join(' · ')}</span>
          ) : (
            none()
          )
        },
        sortValue: (row) => pendingActions(row).join(' '),
      },
    ],
    [],
  )
  return (
    <DashboardCard
      title="History register"
      subtitle={subtitle}
      icon="verifications/card-register.svg"
      bodyClassName={styles.body}
    >
      <RegisterTable
        label="Verification history"
        rows={records}
        columns={columns}
        rowKey={(row) => row.reference}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}
