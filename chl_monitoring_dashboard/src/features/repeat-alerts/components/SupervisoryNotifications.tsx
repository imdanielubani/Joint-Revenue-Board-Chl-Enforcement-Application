import { useMemo } from 'react'
import { useModuleLink } from '@/features/auth/use-module-link'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { readPill } from '@/features/notifications/notifications-display'
import { formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions, type RowAction, type RowCommand } from '@/shared/ui/RowActions'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { notificationHref } from '../repeat-alerts-display'
import type { RepeatAlert } from '../repeat-alerts.schemas'
import styles from './AlertRegister.module.css'

type Sent = RepeatAlert & { notification: NonNullable<RepeatAlert['notification']> }

const searchTextOf = (row: Sent) => `${row.plate} ${row.area} Repeat vehicle ${row.plate}`

/**
 * "Supervisory notifications" (SRD 11.1): the repeat-vehicle notifications the
 * central supervisory process sent for the alerts listed, latest first, each
 * leading to its alert and to the notification itself.
 */
export function SupervisoryNotifications({
  alerts,
  subtitle,
  onOpen,
}: {
  alerts: readonly RepeatAlert[]
  subtitle: string
  /** Opens the alert in its popup. */
  onOpen(alert: RepeatAlert): void
}) {
  const link = useModuleLink()
  const rows = useMemo(
    () =>
      alerts
        .filter((alert): alert is Sent => alert.notification !== null)
        .sort(
          (a, b) => Date.parse(b.notification.receivedAt) - Date.parse(a.notification.receivedAt),
        ),
    [alerts],
  )
  const columns = useMemo<Column<Sent>[]>(
    () => [
      {
        key: 'notification',
        header: 'Notification',
        render: (row) => <Stack main={`Repeat vehicle ${row.plate}`} sub="Repeat-vehicle alert" />,
        sortValue: (row) => row.plate,
      },
      {
        key: 'plate',
        header: 'Plate',
        render: (row) => <span className={cells.plate}>{row.plate}</span>,
        sortValue: (row) => row.plate,
      },
      {
        key: 'reports',
        header: 'Qualifying reports',
        align: 'end',
        render: (row) => row.reports,
        sortValue: (row) => row.reports,
      },
      {
        key: 'received',
        header: 'Received (WAT)',
        render: (row) => (
          <Stack main={formatShortDateTime(row.notification.receivedAt)} sub={row.area} />
        ),
        sortValue: (row) => Date.parse(row.notification.receivedAt),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => {
          const pill = readPill(row.notification.read)
          return <StatusLabel tone={pill.tone}>{pill.label}</StatusLabel>
        },
        sortValue: (row) => Number(row.notification.read),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => {
          const open = link('notifications', notificationHref(row.notification.id))
          const actions: (RowAction | RowCommand)[] = [
            { label: 'View alert', onSelect: () => onOpen(row) },
            ...(open ? [{ label: 'Open notification', to: open }] : []),
          ]
          return <RowActions label={`Actions for ${row.notification.id}`} actions={actions} />
        },
      },
    ],
    [link, onOpen],
  )
  return (
    <DashboardCard
      title="Supervisory notifications"
      subtitle={subtitle}
      icon="overview/card-recent.svg"
      bodyClassName={styles.body}
    >
      <RegisterTable
        label="Supervisory notifications"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.notification.id}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}
