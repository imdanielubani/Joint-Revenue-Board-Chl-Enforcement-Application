import { useMemo } from 'react'
import { useAuditRelated } from '@/features/audit/use-audit-related'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import type { TripRelated } from '@/features/trips/components/TripRelatedDialog'
import { PillLabel } from '@/features/verifications/components/RecordsPanel'
import { provenancePill, syncPill } from '@/features/verifications/verifications-display'
import type { VerificationEntry } from '@/features/verifications/verifications.schemas'
import { formatDelay, formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { LabeledSelect } from '@/shared/ui/LabeledSelect'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions, type RowAction, type RowCommand } from '@/shared/ui/RowActions'
import { applySyncFilters, FILTER_OPTIONS, searchTextOf } from '../sync-display'
import type { SyncFilterKey, SyncRegisterFilters } from '../use-sync-view'
import styles from './SyncRegister.module.css'

/**
 * The synchronization register (document 13): the records CHL received in the
 * area and period, newest first, with where each came from, when it was
 * recorded and received, and the synchronization status stored with it.
 */
export function SyncRegister({
  records,
  subtitle,
  filters,
  onFilterChange,
  onOpen,
  onRelated,
}: {
  records: readonly VerificationEntry[]
  /** The area and period: "Lagos · Last 14 days". */
  subtitle: string
  /** Each filter's value; null for "All". */
  filters: SyncRegisterFilters
  onFilterChange(key: SyncFilterKey, value: string | null): void
  /** Opens the record's details. */
  onOpen(record: VerificationEntry): void
  /** Opens a record it leads to in its own popup on the page. */
  onRelated(related: TripRelated): void
}) {
  const relatedOf = useAuditRelated()
  const columns = useMemo<Column<VerificationEntry>[]>(
    () => [
      {
        key: 'recorded',
        header: 'Recorded (WAT)',
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
        render: (row) => <span className={cells.plate}>{row.plate}</span>,
        sortValue: (row) => row.plate,
      },
      {
        key: 'source',
        header: 'Recorded source',
        render: (row) => <PillLabel pill={provenancePill(row.provenance)} />,
        sortValue: (row) => provenancePill(row.provenance).label,
      },
      {
        key: 'received',
        header: 'Received by CHL',
        render: (row) =>
          row.receivedAt ? (
            <Stack
              main={formatShortDateTime(row.receivedAt)}
              sub={formatDelay(row.recordedAt, row.receivedAt)}
            />
          ) : (
            <span className={cells.sub}>Not supplied</span>
          ),
        sortValue: (row) => (row.receivedAt ? Date.parse(row.receivedAt) : 0),
      },
      {
        key: 'sync',
        header: 'Synchronization',
        render: (row) => <PillLabel pill={syncPill(row)} />,
        sortValue: (row) => syncPill(row).label,
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
    [onOpen, onRelated, relatedOf],
  )
  const rows = useMemo(() => applySyncFilters(records, filters), [records, filters])
  const select = (key: SyncFilterKey, label: string) => (
    <LabeledSelect
      label={label}
      value={filters[key]}
      options={FILTER_OPTIONS[key]}
      onChange={(value) => onFilterChange(key, value)}
    />
  )
  return (
    <DashboardCard
      title="Synchronization register"
      subtitle={subtitle}
      icon="verifications/card-register.svg"
      bodyClassName={styles.body}
    >
      <div className={styles.selects}>
        {select('source', 'Recorded source')}
        {select('sync', 'Synchronization')}
      </div>
      <RegisterTable
        key={Object.values(filters).join('|')}
        label="Received records"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.reference}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}
