import { useMemo } from 'react'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { PillLabel } from '@/features/violations/components/PillLabel'
import { formatNumber, formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import {
  followUpPill,
  involvedAgents,
  involvedLocations,
  searchTextOf,
} from '../repeat-alerts-display'
import type { RepeatAlert } from '../repeat-alerts.schemas'
import styles from './AlertRegister.module.css'

/**
 * The alert register: each vehicle reported three qualifying times, its
 * reports, the agents and locations involved, its follow-up, and whether the
 * supervisory process sent a notification for it.
 */
export function AlertRegister({
  alerts,
  subtitle,
}: {
  alerts: readonly RepeatAlert[]
  subtitle: string
}) {
  const columns = useMemo<Column<RepeatAlert>[]>(
    () => [
      {
        key: 'vehicle',
        header: 'Vehicle',
        render: (row) => (
          <span className={styles.vehicle}>
            <span className={cells.plate}>{row.plate}</span>
            <span className={cells.sub}>{row.vehicleType ?? 'Vehicle type not supplied'}</span>
          </span>
        ),
        sortValue: (row) => row.plate,
      },
      {
        key: 'reports',
        header: 'Qualifying reports',
        align: 'end',
        render: (row) => formatNumber(row.reports),
        sortValue: (row) => row.reports,
      },
      {
        key: 'agents',
        header: 'Agents',
        align: 'end',
        render: (row) => formatNumber(involvedAgents(row).length),
        sortValue: (row) => involvedAgents(row).length,
      },
      {
        key: 'locations',
        header: 'Locations',
        align: 'end',
        render: (row) => formatNumber(involvedLocations(row).length),
        sortValue: (row) => involvedLocations(row).length,
      },
      {
        key: 'last',
        header: 'Last reported (WAT)',
        render: (row) => <Stack main={formatShortDateTime(row.lastReportedAt)} sub={row.area} />,
        sortValue: (row) => Date.parse(row.lastReportedAt),
      },
      {
        key: 'followUp',
        header: 'Follow-up',
        render: (row) => <PillLabel pill={followUpPill(row.followUp)} />,
        sortValue: (row) => followUpPill(row.followUp).label,
      },
      {
        key: 'notification',
        header: 'Notification',
        render: (row) =>
          row.notification ? (
            <Stack
              main={`Sent ${formatShortDateTime(row.notification.receivedAt)}`}
              sub={row.notification.read ? 'Read' : 'Unread'}
            />
          ) : (
            <span className={cells.sub}>Not sent</span>
          ),
        sortValue: (row) => (row.notification ? Date.parse(row.notification.receivedAt) : 0),
      },
    ],
    [],
  )
  return (
    <DashboardCard
      title="Alert register"
      subtitle={subtitle}
      icon="overview/card-repeat.svg"
      bodyClassName={styles.body}
    >
      <RegisterTable
        label="Repeat vehicle alerts"
        rows={alerts}
        columns={columns}
        rowKey={(row) => row.plate}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}
