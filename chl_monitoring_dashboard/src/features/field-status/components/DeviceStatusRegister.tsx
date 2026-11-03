import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { paths } from '@/config/paths'
import { organizationLabel } from '@/features/agents/agents-display'
import { useModuleLink } from '@/features/auth/use-module-link'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { FILTER_PARAMS } from '@/features/overview/use-overview-filters'
import { PillLabel } from '@/features/verifications/components/RecordsPanel'
import { formatDelay, formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { LabeledSelect } from '@/shared/ui/LabeledSelect'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions, type RowAction } from '@/shared/ui/RowActions'
import {
  applyFieldStatusFilters,
  FILTER_OPTIONS,
  gpsPill,
  internetPill,
  rfidPill,
  searchTextOf,
} from '../field-status-display'
import type { DeviceStatus } from '../field-status.schemas'
import type { FieldStatusFilterKey, FieldStatusRegisterFilters } from '../use-field-status-view'
import styles from './DeviceStatusRegister.module.css'

/**
 * The device status register (document 13, Agent Device Status): each agent's
 * last-reported RFID reader, internet and GPS status, when and where it was
 * reported, and when CHL received it. Last reported, never current.
 */
export function DeviceStatusRegister({
  devices,
  subtitle,
  filters,
  onFilterChange,
}: {
  devices: readonly DeviceStatus[]
  /** The area and period: "Lagos · Last 14 days". */
  subtitle: string
  /** Each filter's value; null for "All". */
  filters: FieldStatusRegisterFilters
  onFilterChange(key: FieldStatusFilterKey, value: string | null): void
}) {
  const link = useModuleLink()
  const [params] = useSearchParams()
  const columns = useMemo<Column<DeviceStatus>[]>(() => {
    // The agent's attempts over the page's area and period.
    const historyOf = (agentId: string) => {
      const query = new URLSearchParams()
      for (const key of [
        FILTER_PARAMS.scope,
        FILTER_PARAMS.range,
        FILTER_PARAMS.from,
        FILTER_PARAMS.to,
      ]) {
        const value = params.get(key)
        if (value) query.set(key, value)
      }
      query.set(FILTER_PARAMS.agent, agentId)
      return `${paths.history}?${query}`
    }
    return [
      {
        key: 'agent',
        header: 'Agent',
        render: (row) => <Stack main={row.agent.name} sub={row.agent.id} />,
        sortValue: (row) => row.agent.name,
      },
      {
        key: 'organization',
        header: 'Vendor / organization',
        render: (row) => organizationLabel(row.organization),
        sortValue: (row) => row.organization ?? '',
      },
      {
        key: 'reported',
        header: 'Last reported (WAT)',
        render: (row) => (
          <Stack
            main={formatShortDateTime(row.reportedAt)}
            sub={
              row.location ? `${row.location.name} · ${row.location.area}` : 'Location not supplied'
            }
          />
        ),
        sortValue: (row) => Date.parse(row.reportedAt),
      },
      {
        key: 'rfid',
        header: 'RFID reader',
        render: (row) => <PillLabel pill={rfidPill(row.rfidReader)} />,
        sortValue: (row) => rfidPill(row.rfidReader).label,
      },
      {
        key: 'internet',
        header: 'Internet',
        render: (row) => <PillLabel pill={internetPill(row.internet)} />,
        sortValue: (row) => internetPill(row.internet).label,
      },
      {
        key: 'gps',
        header: 'GPS',
        render: (row) => <PillLabel pill={gpsPill(row.gps)} />,
        sortValue: (row) => gpsPill(row.gps).label,
      },
      {
        key: 'received',
        header: 'Received by CHL',
        render: (row) =>
          row.receivedAt ? (
            <Stack
              main={formatShortDateTime(row.receivedAt)}
              sub={formatDelay(row.reportedAt, row.receivedAt)}
            />
          ) : (
            <span className={cells.sub}>Not supplied</span>
          ),
        sortValue: (row) => (row.receivedAt ? Date.parse(row.receivedAt) : 0),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => {
          const actions = [
            { label: 'View agent', to: link('agents', paths.agent(row.agent.id)) },
            { label: 'Verification history', to: link('history', historyOf(row.agent.id)) },
          ].flatMap((item): RowAction[] => (item.to ? [{ label: item.label, to: item.to }] : []))
          return actions.length ? (
            <RowActions label={`Actions for ${row.agent.name}`} actions={actions} />
          ) : null
        },
      },
    ]
  }, [link, params])
  const rows = useMemo(() => applyFieldStatusFilters(devices, filters), [devices, filters])
  const select = (key: FieldStatusFilterKey, label: string) => (
    <LabeledSelect
      label={label}
      value={filters[key]}
      options={FILTER_OPTIONS[key]}
      onChange={(value) => onFilterChange(key, value)}
    />
  )
  return (
    <DashboardCard
      title="Device status register"
      subtitle={subtitle}
      icon="verifications/card-register.svg"
      bodyClassName={styles.body}
    >
      <div className={styles.selects}>
        {select('rfid', 'RFID reader')}
        {select('internet', 'Internet')}
        {select('gps', 'GPS')}
      </div>
      <RegisterTable
        key={Object.values(filters).join('|')}
        label="Last-reported device status"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.agent.id}
        searchText={searchTextOf}
      />
    </DashboardCard>
  )
}
