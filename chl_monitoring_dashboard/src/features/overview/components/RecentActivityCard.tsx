import { useMemo } from 'react'
import { paths } from '@/config/paths'
import { formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions, type RowAction } from '@/shared/ui/RowActions'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { ACTION_STATUS_TONES, OUTCOME_STYLES } from '../overview-display'
import {
  ACTION_STATUS_LABELS,
  METHOD_TAGS,
  OUTCOME_LABELS,
  type ActivityRecord,
} from '../overview.schemas'
import { useModuleLink } from '../use-module-link'
import styles from './RecentActivityCard.module.css'

const searchText = (row: ActivityRecord) =>
  [
    row.plate,
    row.reference,
    row.method ? METHOD_TAGS[row.method] : '',
    row.result ? OUTCOME_LABELS[row.result] : '',
    row.agent.name,
    row.agent.id,
    ACTION_STATUS_LABELS[row.actionStatus],
    row.location.name,
    row.location.area,
    row.location.code,
  ].join(' ')

/** "Recent activity": the latest timed records, as a searchable register. */
export function RecentActivityCard({ records }: { records: readonly ActivityRecord[] }) {
  const link = useModuleLink()

  const columns = useMemo<Column<ActivityRecord>[]>(
    () => [
      {
        key: 'plate',
        header: 'Vehicle Plate',
        render: (row) => (
          <span className={styles.stack}>
            <span className={styles.plate}>{row.plate}</span>
            <span className={styles.sub}>{row.reference}</span>
          </span>
        ),
        sortValue: (row) => row.plate,
      },
      {
        key: 'method',
        header: 'Verification method',
        render: (row) =>
          row.method ? (
            <span className={styles.tag}>{METHOD_TAGS[row.method]}</span>
          ) : (
            <span className={styles.missing}>Not supplied</span>
          ),
        sortValue: (row) => (row.method ? METHOD_TAGS[row.method] : ''),
      },
      {
        key: 'result',
        header: 'Verification result',
        render: (row) =>
          row.result ? (
            <StatusLabel {...OUTCOME_STYLES[row.result]}>{OUTCOME_LABELS[row.result]}</StatusLabel>
          ) : (
            <span className={styles.missing}>Not supplied</span>
          ),
        sortValue: (row) => (row.result ? OUTCOME_LABELS[row.result] : ''),
      },
      {
        key: 'agent',
        header: 'Agent',
        render: (row) => (
          <span className={styles.stack}>
            <span className={styles.agent}>{row.agent.name}</span>
            <span className={styles.sub}>{row.agent.id}</span>
          </span>
        ),
        sortValue: (row) => row.agent.name,
      },
      {
        key: 'recordedAt',
        header: 'Date and time (WAT)',
        render: (row) => (
          <time dateTime={row.recordedAt}>{formatShortDateTime(row.recordedAt)}</time>
        ),
        sortValue: (row) => new Date(row.recordedAt).getTime(),
      },
      {
        key: 'actionStatus',
        header: 'Action status',
        render: (row) => (
          <StatusLabel tone={ACTION_STATUS_TONES[row.actionStatus]}>
            {ACTION_STATUS_LABELS[row.actionStatus]}
          </StatusLabel>
        ),
        sortValue: (row) => ACTION_STATUS_LABELS[row.actionStatus],
      },
      {
        key: 'location',
        header: 'Location',
        render: (row) => (
          <span className={styles.stack}>
            <span>{row.location.name}</span>
            <span className={styles.sub}>
              {row.location.area} · {row.location.code}
            </span>
          </span>
        ),
        sortValue: (row) => row.location.name,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => {
          const actions = [
            {
              label: 'View verification',
              to: link('verifications', `${paths.verifications}?ref=${row.reference}`),
            },
            {
              label: 'View vehicle history',
              to: link('verifications', `${paths.verifications}?plate=${row.plate}`),
            },
            {
              label: 'View agent',
              to: link('agents', `${paths.agents}?agent=${row.agent.id}`),
            },
          ].filter((action): action is RowAction => action.to !== undefined)
          return actions.length > 0 ? (
            <RowActions label={`Actions for ${row.plate}, ${row.reference}`} actions={actions} />
          ) : null
        },
      },
    ],
    [link],
  )

  return (
    <DashboardCard
      title="Recent activity"
      subtitle="Latest timed records · verification method and result appear only where supplied"
      icon="overview/card-recent.svg"
      bodyClassName={styles.body}
    >
      <RegisterTable
        label="Recent activity"
        rows={records}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchText}
      />
    </DashboardCard>
  )
}
