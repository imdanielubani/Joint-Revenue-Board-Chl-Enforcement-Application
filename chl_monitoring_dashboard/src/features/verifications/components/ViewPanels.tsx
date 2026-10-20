import { useMemo } from 'react'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { outcomeLabel, outcomeStyle, share } from '@/features/overview/overview-display'
import { formatDelay, formatNumber, formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions, type RowAction, type RowCommand } from '@/shared/ui/RowActions'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import {
  OUTCOME_ORDER,
  pendingActions,
  provenancePill,
  syncPill,
  syncStateOf,
  syncStatePill,
  SYNC_STATES,
  vehiclesOf,
  type VehicleSummary,
} from '../verifications-display'
import type { RegisterFilters } from '../verifications-filters'
import { PROVENANCES, type VerificationEntry } from '../verifications.schemas'
import { PillLabel } from './RecordsPanel'
import styles from './VerificationCards.module.css'

/* ------------------------------------------------------------ Vehicle identity (SRD 6.2) */

const vehicleSearchText = (row: VehicleSummary) =>
  [
    row.plate,
    row.vehicleId ?? '',
    row.type ?? '',
    ...row.trips,
    ...row.violations.map((v) => v.id),
  ].join(' ')

/**
 * "Vehicle identity": each plate verified in the period, the vehicle CHL
 * resolved it to (where it did), its type where CHL has one, and its related
 * verification, trip and violation records.
 */
export function VehiclesPanel({
  records,
  subtitle,
  initialPlate,
  onShowRecords,
  onOpen,
}: {
  records: readonly VerificationEntry[]
  subtitle: string
  /** A plate to look up first, from a link such as "Vehicle history". */
  initialPlate: string
  /** Lists the plate's verifications in the record register. */
  onShowRecords(plate: string): void
  onOpen(entry: VerificationEntry): void
}) {
  const link = useModuleLink()
  const vehicles = useMemo(() => vehiclesOf(records), [records])
  const columns = useMemo<Column<VehicleSummary>[]>(
    () => [
      {
        key: 'plate',
        header: 'Plate',
        render: (row) => (
          <button
            type="button"
            className={styles.reference}
            onClick={() => onShowRecords(row.plate)}
          >
            {row.plate}
          </button>
        ),
        sortValue: (row) => row.plate,
      },
      {
        key: 'vehicle',
        header: 'Vehicle ID',
        render: (row) => <span className={styles.muted}>{row.vehicleId ?? 'Not resolved'}</span>,
        sortValue: (row) => row.vehicleId ?? '',
      },
      {
        key: 'type',
        header: 'Vehicle type',
        render: (row) => <span className={styles.muted}>{row.type ?? 'Not supplied'}</span>,
        sortValue: (row) => row.type ?? '',
      },
      {
        key: 'verifications',
        header: 'Verifications',
        align: 'end',
        render: (row) => formatNumber(row.verifications.length),
        sortValue: (row) => row.verifications.length,
      },
      {
        key: 'latest',
        header: 'Latest outcome',
        render: (row) =>
          row.latest.result ? (
            <StatusLabel {...outcomeStyle(row.latest.result)}>
              {outcomeLabel(row.latest.result)}
            </StatusLabel>
          ) : (
            <span className={styles.muted}>Not supplied</span>
          ),
        sortValue: (row) => (row.latest.result ? outcomeLabel(row.latest.result) : ''),
      },
      {
        key: 'trips',
        header: 'Related trips',
        render: (row) => (
          <span className={styles.muted}>{row.trips.join(', ') || 'None found'}</span>
        ),
        sortValue: (row) => row.trips.length,
      },
      {
        key: 'violations',
        header: 'Violations',
        render: (row) => (
          <span className={styles.muted}>
            {row.violations.map((violation) => violation.id).join(', ') || 'None issued'}
          </span>
        ),
        sortValue: (row) => row.violations.length,
      },
      {
        key: 'seen',
        header: 'Last verified (WAT)',
        render: (row) => (
          <span className={styles.muted}>{formatShortDateTime(row.latest.recordedAt)}</span>
        ),
        sortValue: (row) => Date.parse(row.latest.recordedAt),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => {
          const commands: RowCommand[] = [
            { label: 'Show verifications', onSelect: () => onShowRecords(row.plate) },
            { label: 'Latest verification', onSelect: () => onOpen(row.latest) },
          ]
          const latestCase = row.violations[0]
          const links = [
            { label: 'Trip history', to: link('trips', `${paths.trips}?plate=${row.plate}`) },
            {
              label: 'Open the latest case',
              to: latestCase
                ? link('violations', `${paths.violations}?case=${latestCase.id}`)
                : undefined,
            },
          ].filter((action): action is RowAction => action.to !== undefined)
          return <RowActions label={`Actions for ${row.plate}`} actions={[...commands, ...links]} />
        },
      },
    ],
    [link, onShowRecords, onOpen],
  )
  return (
    <DashboardCard
      title="Vehicle identity"
      subtitle={subtitle}
      icon="verifications/card-register.svg"
      bodyClassName={styles.panelBody}
    >
      <RegisterTable
        label="Vehicles verified"
        rows={vehicles}
        columns={columns}
        rowKey={(row) => row.plate}
        searchText={vehicleSearchText}
        initialQuery={initialPlate}
      />
      <p className={styles.small}>
        Vehicle ID and type are shown where CHL resolved the plate; a plate CHL could not match
        stays “Not resolved” rather than guessed.
      </p>
    </DashboardCard>
  )
}

/* ------------------------------------------------------------ Verification outcomes (SRD 6.4) */

/**
 * "Verification outcomes": every result CHL returns, each with its count and
 * what it means. Results are never folded into pass or fail.
 */
export function OutcomesPanel({
  records,
  subtitle,
  onFilter,
}: {
  records: readonly VerificationEntry[]
  subtitle: string
  onFilter(filters: Partial<RegisterFilters>): void
}) {
  const counts = new Map<string, number>()
  for (const record of records) {
    if (record.result) counts.set(record.result, (counts.get(record.result) ?? 0) + 1)
  }
  const known: readonly string[] = OUTCOME_ORDER
  const outcomes = [...OUTCOME_ORDER, ...[...counts.keys()].filter((key) => !known.includes(key))]
  return (
    <DashboardCard
      title="Verification outcomes"
      subtitle={subtitle}
      icon="overview/card-method.svg"
      bodyClassName={styles.panelBody}
    >
      <ul className={styles.outcomeList}>
        {outcomes.map((outcome) => {
          const count = counts.get(outcome) ?? 0
          return (
            <li key={outcome}>
              <div className={styles.outcomeRow}>
                <span>
                  <StatusLabel {...outcomeStyle(outcome)}>{outcomeLabel(outcome)}</StatusLabel>
                </span>
                <span className={styles.outcomeCount}>{formatNumber(count)}</span>
                <span className={styles.bar} aria-hidden="true">
                  <span
                    className={styles.barFill}
                    style={{ width: `${share(count, records.length)}%` }}
                  />
                </span>
                <button
                  type="button"
                  className={styles.linkButton}
                  disabled={count === 0}
                  onClick={() => onFilter({ outcome })}
                  aria-label={`View ${outcomeLabel(outcome)} records`}
                >
                  View records
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      <p className={styles.small}>
        Counts are verification outcomes, not unique trips or vehicles. A network failure is not “No
        Active Trip.”
      </p>
    </DashboardCard>
  )
}

/* ------------------------------------------------------------ Source & synchronization (SRD 6.1, 6.5) */

const attentionSearchText = (row: VerificationEntry) =>
  `${row.reference} ${row.plate} ${row.agent.name}`

/**
 * "Source & synchronization": where each result came from, the
 * synchronization status stored with each record, and the records still
 * uploading or received late.
 */
export function SyncPanel({
  records,
  subtitle,
  onFilter,
  onOpen,
}: {
  records: readonly VerificationEntry[]
  subtitle: string
  onFilter(filters: Partial<RegisterFilters>): void
  onOpen(entry: VerificationEntry): void
}) {
  const attention = useMemo(
    () => records.filter((record) => syncStateOf(record) !== 'synced'),
    [records],
  )
  const columns = useMemo<Column<VerificationEntry>[]>(
    () => [
      {
        key: 'reference',
        header: 'Reference',
        render: (row) => (
          <button type="button" className={styles.reference} onClick={() => onOpen(row)}>
            {row.reference}
          </button>
        ),
        sortValue: (row) => row.reference,
      },
      {
        key: 'plate',
        header: 'Plate',
        render: (row) => <span className={styles.muted}>{row.plate}</span>,
        sortValue: (row) => row.plate,
      },
      {
        key: 'source',
        header: 'Source',
        render: (row) => <PillLabel pill={provenancePill(row.provenance)} />,
        sortValue: (row) => provenancePill(row.provenance).label,
      },
      {
        key: 'recorded',
        header: 'Recorded (WAT)',
        render: (row) => (
          <span className={styles.muted}>{formatShortDateTime(row.recordedAt)}</span>
        ),
        sortValue: (row) => Date.parse(row.recordedAt),
      },
      {
        key: 'received',
        header: 'Received by CHL',
        render: (row) => (
          <span className={styles.muted}>
            {row.receivedAt
              ? `${formatShortDateTime(row.receivedAt)} · ${formatDelay(row.recordedAt, row.receivedAt)}`
              : 'Not supplied'}
          </span>
        ),
        sortValue: (row) => (row.receivedAt ? Date.parse(row.receivedAt) : 0),
      },
      {
        key: 'sync',
        header: 'Sync',
        render: (row) => <PillLabel pill={syncPill(row)} />,
        sortValue: (row) => syncPill(row).label,
      },
      {
        key: 'pending',
        header: 'Pending action',
        render: (row) => (
          <span className={styles.muted}>{pendingActions(row).join(' · ') || 'None'}</span>
        ),
      },
    ],
    [onOpen],
  )

  const countOf = (test: (record: VerificationEntry) => boolean) =>
    records.reduce((sum, record) => sum + (test(record) ? 1 : 0), 0)

  return (
    <DashboardCard
      title="Source & synchronization"
      subtitle={subtitle}
      icon="verifications/card-provenance.svg"
      bodyClassName={styles.panelBody}
    >
      <div className={styles.sourceGrid}>
        <section className={styles.breakdown} aria-label="Recorded source">
          <h4 className={styles.breakdownTitle}>Recorded source</h4>
          {PROVENANCES.map((provenance) => {
            const count = countOf((record) => record.provenance === provenance)
            return (
              <div key={provenance} className={styles.breakdownRow}>
                <PillLabel pill={provenancePill(provenance)} />
                <button
                  type="button"
                  className={styles.linkButton}
                  disabled={count === 0}
                  onClick={() => onFilter({ provenance })}
                  aria-label={`View ${provenancePill(provenance).label} records`}
                >
                  {formatNumber(count)} records
                </button>
              </div>
            )
          })}
        </section>
        <section className={styles.breakdown} aria-label="Synchronization">
          <h4 className={styles.breakdownTitle}>Synchronization</h4>
          {SYNC_STATES.map((state) => {
            const count = countOf((record) => syncStateOf(record) === state)
            const pill = syncStatePill(state)
            return (
              <div key={state} className={styles.breakdownRow}>
                <PillLabel pill={pill} />
                <button
                  type="button"
                  className={styles.linkButton}
                  disabled={count === 0}
                  onClick={() => onFilter({ sync: state })}
                  aria-label={`View ${pill.label} records`}
                >
                  {formatNumber(count)} records
                </button>
              </div>
            )
          })}
        </section>
      </div>

      <RegisterTable
        label="Records still uploading or received late"
        rows={attention}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={attentionSearchText}
      />
      <p className={styles.small}>
        The status stored with each record — not the device’s state now. This dashboard does not
        connect to devices.
      </p>
    </DashboardCard>
  )
}
