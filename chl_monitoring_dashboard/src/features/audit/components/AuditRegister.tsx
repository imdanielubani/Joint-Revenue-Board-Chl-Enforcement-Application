import { useMemo } from 'react'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { methodLabel, outcomeLabel, outcomeStyle } from '@/features/overview/overview-display'
import { PillLabel } from '@/features/verifications/components/RecordsPanel'
import { actionPill, syncPill } from '@/features/verifications/verifications-display'
import { formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { organizationText, searchTextOf } from '../audit-display'
import type { AuditEntry } from '../audit.schemas'
import styles from './AuditRegister.module.css'

const notSupplied = (text = 'Not supplied') => <span className={cells.sub}>{text}</span>

/**
 * The audit register (SRD 28): every recorded verification attempt in the
 * area and period, newest first, with its agent, method, vehicle, result,
 * trip and violation, enforcement point, action taken and synchronization.
 */
export function AuditRegister({
  entries,
  subtitle,
}: {
  entries: readonly AuditEntry[]
  /** The area and period: "Lagos · Last 14 days". */
  subtitle: string
}) {
  const columns = useMemo<Column<AuditEntry>[]>(
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
        render: (row) => (
          <Stack main={row.agent.name} sub={`${row.agent.id} · ${organizationText(row)}`} />
        ),
        sortValue: (row) => row.agent.name,
      },
      {
        key: 'method',
        header: 'Method',
        render: (row) => (row.method ? methodLabel(row.method) : notSupplied()),
        sortValue: (row) => (row.method ? methodLabel(row.method) : ''),
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
            notSupplied()
          ),
        sortValue: (row) => (row.result ? outcomeLabel(row.result) : ''),
      },
      {
        key: 'trip',
        header: 'Trip / violation',
        render: (row) =>
          row.tripId || row.violation ? (
            <Stack main={row.tripId ?? 'No trip'} sub={row.violation?.id ?? 'No violation'} />
          ) : (
            notSupplied('None')
          ),
        sortValue: (row) => row.tripId ?? row.violation?.id ?? '',
      },
      {
        key: 'point',
        header: 'Enforcement point',
        render: (row) => (
          <Stack
            main={row.location.name}
            sub={[row.location.area, row.location.code].filter(Boolean).join(' · ')}
          />
        ),
        sortValue: (row) => row.location.name,
      },
      {
        key: 'action',
        header: 'Action taken',
        render: (row) => <PillLabel pill={actionPill(row.actionTaken)} />,
        sortValue: (row) => actionPill(row.actionTaken).label,
      },
      {
        key: 'sync',
        header: 'Synchronization',
        render: (row) => <PillLabel pill={syncPill(row)} />,
        sortValue: (row) => syncPill(row).label,
      },
    ],
    [],
  )
  return (
    <DashboardCard
      title="Audit register"
      subtitle={subtitle}
      icon="verifications/card-register.svg"
      bodyClassName={styles.body}
    >
      <RegisterTable
        label="Audit trail"
        rows={entries}
        columns={columns}
        rowKey={(row) => row.reference}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}
