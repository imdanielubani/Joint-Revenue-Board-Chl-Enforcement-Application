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
import { LabeledSelect } from '@/shared/ui/LabeledSelect'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions, type RowAction, type RowCommand } from '@/shared/ui/RowActions'
import { useAuditRelated } from '@/features/audit/use-audit-related'
import type { TripRelated } from '@/features/trips/components/TripRelatedDialog'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import {
  applyHistoryFilters,
  FILTER_OPTIONS,
  paymentStatusText,
  searchTextOf,
} from '../history-display'
import type { HistoryFilterKey, HistoryRegisterFilters } from '../use-history-view'
import styles from './HistoryRegister.module.css'

const none = (text = 'None') => <span className={cells.sub}>{text}</span>

/**
 * The history register (document 12.1): the recorded verification attempts in
 * the area and period, newest first, with whether each was completed, the
 * action taken, the linked violation, the payment request generated and what
 * is still pending; filtered by each of those.
 */
export function HistoryRegister({
  records,
  subtitle,
  filters,
  onFilterChange,
  onOpen,
  onRelated,
  onAgent,
}: {
  records: readonly VerificationEntry[]
  /** The area and period: "Lagos · Last 14 days". */
  subtitle: string
  /** Each filter's value; null for "All". */
  filters: HistoryRegisterFilters
  onFilterChange(key: HistoryFilterKey, value: string | null): void
  /** Opens the attempt's record details. */
  onOpen(record: VerificationEntry): void
  /** Opens a record the attempt leads to in its own popup on the page. */
  onRelated(related: TripRelated): void
  /** Narrows the history to the attempt's agent; absent when it is narrowed to them already. */
  onAgent?(agentId: string): void
}) {
  const relatedOf = useAuditRelated()
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
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => (
          <RowActions
            label={`Actions for ${row.reference}`}
            actions={[
              { label: 'Open record details', onSelect: () => onOpen(row) },
              ...(onAgent
                ? [{ label: 'Show this agent’s attempts', onSelect: () => onAgent(row.agent.id) }]
                : []),
              // The verification's own details are the record details above.
              ...relatedOf(row)
                .filter((item) => item.label !== 'Verification details')
                .map((item): RowCommand | RowAction =>
                  'to' in item
                    ? { label: item.label, to: item.to }
                    : { label: item.label, onSelect: () => onRelated(item.related) },
                ),
            ]}
          />
        ),
      },
    ],
    [onOpen, onRelated, onAgent, relatedOf],
  )
  const rows = useMemo(() => applyHistoryFilters(records, filters), [records, filters])
  const select = (key: HistoryFilterKey, label: string) => (
    <LabeledSelect
      label={label}
      value={filters[key]}
      options={FILTER_OPTIONS[key]}
      onChange={(value) => onFilterChange(key, value)}
    />
  )
  return (
    <DashboardCard
      title="History register"
      subtitle={subtitle}
      icon="verifications/card-register.svg"
      bodyClassName={styles.body}
    >
      <div className={styles.selects}>
        {select('completion', 'Completion status')}
        {select('action', 'Action taken')}
        {select('violation', 'Linked violation')}
        {select('payment', 'Payment request')}
        {select('pending', 'Pending actions')}
      </div>
      <RegisterTable
        key={Object.values(filters).join('|')}
        label="Verification history"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.reference}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}
