import { useId, useMemo, type ReactNode } from 'react'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { Fact, Facts } from '@/features/verifications/components/VerificationDetailsDialog'
import sections from '@/features/verifications/components/VerificationCards.module.css'
import { PillLabel } from '@/features/violations/components/PillLabel'
import buttons from '@/features/violations/components/ViolationCards.module.css'
import { actionLabel, statusPill } from '@/features/violations/violations-display'
import type { ViolationCase } from '@/features/violations/violations.schemas'
import { formatDateTime, formatNumber, formatShortDateTime } from '@/shared/lib/format'
import type { Column } from '@/shared/ui/DataTable'
import { Dialog } from '@/shared/ui/Dialog'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions } from '@/shared/ui/RowActions'
import links from '@/features/payments/components/PaymentCards.module.css'
import type { TripRelated } from '@/features/trips/components/TripRelatedDialog'
import { useAlertRelated } from '../use-alert-related'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import {
  followUpPill,
  involvedAgents,
  involvedLocations,
  recordedActions,
  type InvolvedAgent,
  type InvolvedLocation,
  type RecordedAction,
} from '../repeat-alerts-display'
import type { RepeatAlert } from '../repeat-alerts.schemas'
import styles from './AlertDialog.module.css'

/** A titled part of the popup. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className={sections.dialogSection} aria-labelledby={id}>
      <h3 id={id} className={sections.dialogHeading}>
        {title}
      </h3>
      {children}
    </section>
  )
}

const reportSearch = (item: ViolationCase) =>
  [item.id, item.category, item.agent.name, item.agent.id, item.location.name].join(' ')
const agentSearch = (item: InvolvedAgent) => `${item.id} ${item.name}`
const actionSearch = (item: RecordedAction) =>
  [actionLabel(item.action.action), item.case.id, item.action.actor?.name ?? ''].join(' ')
const locationSearch = (item: InvolvedLocation) => `${item.name} ${item.area} ${item.code}`

/** How many qualifying reports, and when the last was recorded: shared by agents and locations. */
const reportsColumn: Column<{ reports: number }> = {
  key: 'reports',
  header: 'Qualifying reports',
  align: 'end',
  render: (row) => formatNumber(row.reports),
  sortValue: (row) => row.reports,
}
const lastColumn: Column<{ lastReportedAt: string }> = {
  key: 'last',
  header: 'Last reported (WAT)',
  render: (row) => formatShortDateTime(row.lastReportedAt),
  sortValue: (row) => Date.parse(row.lastReportedAt),
}

/**
 * A repeat-vehicle alert in a popup on the page (SRD 11.1): the vehicle as the
 * alert counts it, then the related reports, oldest first. Cancelled reports
 * are listed but do not count towards the alert.
 */
export function AlertDialog({
  alert,
  periodText,
  onRelated,
  onClose,
}: {
  alert: RepeatAlert
  /** "Last 14 days", or the dates of a custom range. */
  periodText: string
  /** Opens a record the alert leads to in its own popup, in place of this one. */
  onRelated(related: TripRelated): void
  onClose(): void
}) {
  const followUp = followUpPill(alert.followUp)
  const { caseOf, agentOf, reportsOf } = useAlertRelated()
  const vehicleReports = reportsOf(alert)
  const reportColumns = useMemo<Column<ViolationCase>[]>(
    () => [
      {
        key: 'case',
        header: 'Case',
        render: (row) => <Stack main={row.id} sub={row.category} />,
        sortValue: (row) => row.id,
      },
      {
        key: 'recorded',
        header: 'Recorded (WAT)',
        render: (row) => formatShortDateTime(row.recordedAt),
        sortValue: (row) => Date.parse(row.recordedAt),
      },
      {
        key: 'agent',
        header: 'Agent',
        render: (row) => <Stack main={row.agent.name} sub={row.agent.id} />,
        sortValue: (row) => row.agent.name,
      },
      {
        key: 'location',
        header: 'Location',
        render: (row) => <Stack main={row.location.name} sub={row.location.area} />,
        sortValue: (row) => row.location.name,
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <PillLabel pill={statusPill(row.status)} />,
        sortValue: (row) => statusPill(row.status).label,
      },
      {
        key: 'counts',
        header: 'Counts towards alert',
        render: (row) =>
          row.status === 'cancelled' ? <span className={cells.sub}>No · cancelled</span> : 'Yes',
        sortValue: (row) => Number(row.status !== 'cancelled'),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => {
          const related = caseOf(row.id)
          return related ? (
            <RowActions
              label={`Actions for ${row.id}`}
              actions={[{ label: 'View case', onSelect: () => onRelated(related) }]}
            />
          ) : null
        },
      },
    ],
    [caseOf, onRelated],
  )
  const agentColumns = useMemo<Column<InvolvedAgent>[]>(
    () => [
      {
        key: 'agent',
        header: 'Agent',
        render: (row) => <Stack main={row.name} sub={row.id} />,
        sortValue: (row) => row.name,
      },
      reportsColumn,
      lastColumn,
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => {
          const related = agentOf({ id: row.id, name: row.name })
          return related ? (
            <RowActions
              label={`Actions for ${row.id}`}
              actions={[{ label: 'View agent', onSelect: () => onRelated(related) }]}
            />
          ) : null
        },
      },
    ],
    [agentOf, onRelated],
  )
  const locationColumns = useMemo<Column<InvolvedLocation>[]>(
    () => [
      {
        key: 'location',
        header: 'Location',
        render: (row) => (
          <Stack main={row.name} sub={[row.area, row.code].filter(Boolean).join(' · ')} />
        ),
        sortValue: (row) => row.name,
      },
      reportsColumn,
      lastColumn,
    ],
    [],
  )
  const actionColumns = useMemo<Column<RecordedAction>[]>(
    () => [
      {
        key: 'at',
        header: 'When (WAT)',
        render: (row) => formatShortDateTime(row.action.at),
        sortValue: (row) => Date.parse(row.action.at),
      },
      {
        key: 'action',
        header: 'Action',
        render: (row) => actionLabel(row.action.action),
        sortValue: (row) => actionLabel(row.action.action),
      },
      {
        key: 'case',
        header: 'Case',
        render: (row) => <Stack main={row.case.id} sub={row.case.category} />,
        sortValue: (row) => row.case.id,
      },
      {
        key: 'by',
        header: 'By',
        render: (row) =>
          row.action.actor ? (
            <Stack main={row.action.actor.name} sub={row.action.actor.role} />
          ) : (
            <span className={cells.sub}>Automatic step</span>
          ),
        sortValue: (row) => row.action.actor?.name ?? '',
      },
    ],
    [],
  )
  const agents = involvedAgents(alert)
  const locations = involvedLocations(alert)

  return (
    <Dialog
      title={`Repeat vehicle ${alert.plate}`}
      subtitle={`${formatNumber(alert.reports)} qualifying reports · ${followUp.label} · ${periodText}`}
      wide
      onClose={onClose}
      footer={
        <button type="button" className={buttons.secondaryButton} onClick={onClose}>
          Close
        </button>
      }
    >
      <div className={styles.body}>
        <Facts title="Vehicle">
          <Fact term="Plate">{alert.plate}</Fact>
          <Fact term="Vehicle ID">{alert.vehicleId ?? 'Not supplied'}</Fact>
          <Fact term="Vehicle type">{alert.vehicleType ?? 'Not supplied'}</Fact>
          <Fact term="Area">{alert.area}</Fact>
          <Fact term="Qualifying reports">{formatNumber(alert.reports)}</Fact>
          <Fact term="Follow-up">
            <StatusLabel tone={followUp.tone}>{followUp.label}</StatusLabel>
          </Fact>
          <Fact term="First reported">{formatDateTime(alert.firstReportedAt)}</Fact>
          <Fact term="Last reported">{formatDateTime(alert.lastReportedAt)}</Fact>
          <Fact term="Alert raised">{formatDateTime(alert.raisedAt)}</Fact>
        </Facts>

        <Section title="Related reports">
          <RegisterTable
            label={`Reports of ${alert.plate}`}
            rows={alert.cases}
            columns={reportColumns}
            rowKey={(row) => row.id}
            searchText={reportSearch}
            pageSize={5}
          />
        </Section>

        <div className={styles.pair}>
          <Section title="Involved agents">
            <RegisterTable
              label={`Agents who reported ${alert.plate}`}
              rows={agents}
              columns={agentColumns}
              rowKey={(row) => row.id}
              searchText={agentSearch}
              pageSize={5}
            />
          </Section>
          <Section title="Locations">
            <RegisterTable
              label={`Where ${alert.plate} was reported`}
              rows={locations}
              columns={locationColumns}
              rowKey={(row) => row.id}
              searchText={locationSearch}
              pageSize={5}
            />
          </Section>
        </div>

        <Section title="Cases and recorded actions">
          <RegisterTable
            label={`Actions recorded on the cases of ${alert.plate}`}
            rows={recordedActions(alert)}
            columns={actionColumns}
            rowKey={(row) => row.key}
            searchText={actionSearch}
            pageSize={8}
          />
        </Section>

        {vehicleReports && (
          <nav className={links.dialogLinks} aria-label="Related records">
            <button
              type="button"
              className={links.dialogLink}
              onClick={() => onRelated(vehicleReports)}
            >
              View vehicle reports
            </button>
          </nav>
        )}
      </div>
    </Dialog>
  )
}
