import { useMemo } from 'react'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import {
  agentText,
  categoryLabel,
  readPill,
  searchTextOf,
  typeLabel,
} from '../notifications-display'
import type { Notification } from '../notifications.schemas'
import styles from './NotificationRegister.module.css'

const NOT_SUPPLIED = 'Not supplied'

/**
 * A register of notifications, latest first: what each says, its vehicle,
 * agent and location, when CHL received it, and whether the user has read it.
 */
export function NotificationRegister({
  title,
  subtitle,
  label,
  notifications,
  showCategory,
}: {
  title: string
  subtitle: string
  /** The table's accessible name. */
  label: string
  notifications: readonly Notification[]
  /** Shows each notification's group, where the register mixes them. */
  showCategory: boolean
}) {
  const columns = useMemo<Column<Notification>[]>(
    () => [
      {
        key: 'notification',
        header: 'Notification',
        render: (row) => <Stack main={row.title} sub={typeLabel(row.type)} />,
        sortValue: (row) => row.title,
      },
      ...(showCategory
        ? [
            {
              key: 'category',
              header: 'Group',
              render: (row: Notification) => categoryLabel(row.category),
              sortValue: (row: Notification) => categoryLabel(row.category),
            },
          ]
        : []),
      {
        key: 'plate',
        header: 'Plate',
        render: (row) =>
          row.plate ? (
            <span className={cells.plate}>{row.plate}</span>
          ) : (
            <span className={cells.sub}>{NOT_SUPPLIED}</span>
          ),
        sortValue: (row) => row.plate ?? '',
      },
      {
        key: 'agent',
        header: 'Agent',
        render: (row) => {
          const agent = agentText(row)
          return agent ? (
            <Stack main={agent.main} sub={agent.sub} />
          ) : (
            <span className={cells.sub}>{NOT_SUPPLIED}</span>
          )
        },
        sortValue: (row) => agentText(row)?.main ?? '',
      },
      {
        key: 'location',
        header: 'Location',
        render: (row) =>
          row.location ? (
            <Stack
              main={row.location.name}
              sub={[row.location.area, row.location.code].filter(Boolean).join(' · ')}
            />
          ) : (
            <span className={cells.sub}>{NOT_SUPPLIED}</span>
          ),
        sortValue: (row) => row.location?.name ?? '',
      },
      {
        key: 'received',
        header: 'Received (WAT)',
        render: (row) => formatShortDateTime(row.receivedAt),
        sortValue: (row) => Date.parse(row.receivedAt),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => {
          const pill = readPill(row.read)
          return <StatusLabel tone={pill.tone}>{pill.label}</StatusLabel>
        },
        sortValue: (row) => Number(row.read),
      },
    ],
    [showCategory],
  )
  return (
    <DashboardCard
      title={title}
      subtitle={subtitle}
      icon="overview/card-recent.svg"
      bodyClassName={styles.body}
    >
      <RegisterTable
        label={label}
        rows={notifications}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}
