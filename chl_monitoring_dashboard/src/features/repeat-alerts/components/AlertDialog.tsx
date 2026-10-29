import { useId, useMemo, type ReactNode } from 'react'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { Fact, Facts } from '@/features/verifications/components/VerificationDetailsDialog'
import sections from '@/features/verifications/components/VerificationCards.module.css'
import { PillLabel } from '@/features/violations/components/PillLabel'
import buttons from '@/features/violations/components/ViolationCards.module.css'
import { statusPill } from '@/features/violations/violations-display'
import type { ViolationCase } from '@/features/violations/violations.schemas'
import { formatDateTime, formatNumber, formatShortDateTime } from '@/shared/lib/format'
import type { Column } from '@/shared/ui/DataTable'
import { Dialog } from '@/shared/ui/Dialog'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { followUpPill } from '../repeat-alerts-display'
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

/**
 * A repeat-vehicle alert in a popup on the page (SRD 11.1): the vehicle as the
 * alert counts it, then the related reports, oldest first. Cancelled reports
 * are listed but do not count towards the alert.
 */
export function AlertDialog({
  alert,
  periodText,
  onClose,
}: {
  alert: RepeatAlert
  /** "Last 14 days", or the dates of a custom range. */
  periodText: string
  onClose(): void
}) {
  const followUp = followUpPill(alert.followUp)
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
    ],
    [],
  )

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
      </div>
    </Dialog>
  )
}
