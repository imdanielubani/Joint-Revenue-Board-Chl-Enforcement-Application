import { useMemo } from 'react'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { outcomeLabel, outcomeStyle } from '@/features/overview/overview-display'
import { formatShortDateTime } from '@/shared/lib/format'
import { DashboardCard } from '@/shared/ui/DashboardCard'
import type { Column } from '@/shared/ui/DataTable'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions, type RowCommand } from '@/shared/ui/RowActions'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { detectionPill, placeText, tripStatusPill, validityText, type Pill } from '../trips-display'
import type { PostPayment, Trip, VehicleTripCheck } from '../trips.schemas'
import type { TripRelated } from './TripRelatedDialog'
import styles from './TripCards.module.css'

type ModuleLink = ReturnType<typeof useModuleLink>

export function PillLabel({ pill }: { pill: Pill }) {
  return (
    <StatusLabel tone={pill.tone} {...(pill.icon ? { icon: pill.icon } : {})}>
      {pill.label}
    </StatusLabel>
  )
}

const notSupplied = <span className={cells.sub}>Not supplied</span>
/** Whether the signed-in role may see a module's records, as its links are offered. */
const canSee = (link: ModuleLink, module: 'verifications' | 'violations') =>
  link(module, paths[module]) !== undefined

interface PanelProps {
  title: string
  subtitle: string
  icon: string
  /** A plate to look up first, from a link. */
  initialQuery: string
  onOpenTrip(reference: string): void
  /** Opens a row's verification or case in its own popup on this page. */
  onRelated(related: TripRelated): void
}

/* ------------------------------------------------------------ Trips */

function tripColumns(
  link: ModuleLink,
  onOpenTrip: (reference: string) => void,
  onRelated: (related: TripRelated) => void,
  only?: readonly string[],
): Column<Trip>[] {
  const columns: Column<Trip>[] = [
    {
      key: 'reference',
      header: 'Transaction reference',
      render: (row) => <span className={cells.plate}>{row.reference}</span>,
      sortValue: (row) => row.reference,
    },
    {
      key: 'plate',
      header: 'Plate',
      render: (row) => <span className={cells.plate}>{row.plate}</span>,
      sortValue: (row) => row.plate,
    },
    {
      key: 'vehicleType',
      header: 'Vehicle type',
      render: (row) => row.vehicleType ?? notSupplied,
      sortValue: (row) => row.vehicleType ?? '',
    },
    {
      key: 'transactionType',
      header: 'Transaction type',
      render: (row) => row.transactionType ?? notSupplied,
      sortValue: (row) => row.transactionType ?? '',
    },
    {
      key: 'started',
      header: 'Trip start (WAT)',
      render: (row) => (row.startedAt ? formatShortDateTime(row.startedAt) : notSupplied),
      sortValue: (row) => (row.startedAt ? Date.parse(row.startedAt) : 0),
    },
    {
      key: 'paid',
      header: 'Payment (WAT)',
      render: (row) => (row.paidAt ? formatShortDateTime(row.paidAt) : notSupplied),
      sortValue: (row) => (row.paidAt ? Date.parse(row.paidAt) : 0),
    },
    {
      key: 'origin',
      header: 'Originating state and LGA',
      render: (row) => placeText(row.origin),
      sortValue: (row) => placeText(row.origin),
    },
    {
      key: 'destination',
      header: 'Destination state and LGA',
      render: (row) => placeText(row.destination),
      sortValue: (row) => placeText(row.destination),
    },
    {
      key: 'status',
      header: 'Trip status',
      render: (row) => <PillLabel pill={tripStatusPill(row.status)} />,
      sortValue: (row) => tripStatusPill(row.status).label,
    },
    {
      key: 'validity',
      header: 'Trip validity countdown',
      render: (row) => {
        const text = validityText(row.validity)
        return <Stack main={text.main} sub={text.sub} />
      },
      sortValue: (row) => row.validity?.remainingSeconds ?? -1,
    },
    {
      key: 'detection',
      header: 'Destination detection',
      render: (row) =>
        row.destinationDetection ? (
          <Stack
            main={detectionPill(row.destinationDetection.status).label}
            sub={`Reported ${formatShortDateTime(row.destinationDetection.reportedAt)}`}
          />
        ) : (
          notSupplied
        ),
      sortValue: (row) =>
        row.destinationDetection ? Date.parse(row.destinationDetection.reportedAt) : 0,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'end',
      render: (row) => {
        const commands: RowCommand[] = [
          { label: 'View trip details', onSelect: () => onOpenTrip(row.reference) },
          ...(canSee(link, 'verifications')
            ? [
                {
                  label: 'Vehicle verifications',
                  onSelect: () => onRelated({ kind: 'vehicle', plate: row.plate }),
                },
              ]
            : []),
        ]
        return <RowActions label={`Actions for ${row.reference}`} actions={commands} />
      },
    },
  ]
  return only ? columns.filter((column) => only.includes(column.key)) : columns
}

const tripSearchText = (row: Trip) =>
  [
    row.reference,
    row.plate,
    row.vehicleType ?? '',
    row.transactionType ?? '',
    placeText(row.origin),
    placeText(row.destination),
    tripStatusPill(row.status).label,
  ].join(' ')

/**
 * A register of trips with the document's trip detail fields. References are
 * plain text; a trip's details open from its row's actions.
 */
export function TripsPanel({
  trips,
  only,
  label,
  emptyNote,
  ...panel
}: PanelProps & {
  trips: readonly Trip[]
  /** The columns to show, by key; all trip detail fields when left out. */
  only?: readonly string[]
  label: string
  emptyNote?: string
}) {
  const link = useModuleLink()
  const { onOpenTrip, onRelated } = panel
  const columns = useMemo(
    () => tripColumns(link, onOpenTrip, onRelated, only),
    [link, onOpenTrip, onRelated, only],
  )
  return (
    <DashboardCard
      title={panel.title}
      subtitle={panel.subtitle}
      icon={panel.icon}
      bodyClassName={styles.panelBody}
    >
      <RegisterTable
        label={label}
        rows={trips}
        columns={columns}
        rowKey={(row) => row.reference}
        searchText={tripSearchText}
        initialQuery={panel.initialQuery}
      />
      {emptyNote && <p className={styles.small}>{emptyNote}</p>}
    </DashboardCard>
  )
}

/* ------------------------------------------------------------ Verified vehicles */

const vehicleSearchText = (row: VehicleTripCheck) =>
  [
    row.plate,
    row.vehicleType ?? '',
    row.verification.reference,
    row.verification.agent.name,
    row.verification.location.name,
    row.previousTripReference ?? '',
  ].join(' ')

/** A register of verified vehicles and what CHL returned for their trip. */
export function VehiclesPanel({
  vehicles,
  withPreviousTrip,
  label,
  ...panel
}: PanelProps & {
  vehicles: readonly VehicleTripCheck[]
  /** Shows the most recent previous trip CHL returned, for vehicles with no active trip. */
  withPreviousTrip: boolean
  label: string
}) {
  const link = useModuleLink()
  const { onOpenTrip, onRelated } = panel
  const columns = useMemo<Column<VehicleTripCheck>[]>(
    () => [
      {
        key: 'plate',
        header: 'Plate',
        render: (row) => <span className={cells.plate}>{row.plate}</span>,
        sortValue: (row) => row.plate,
      },
      {
        key: 'vehicleType',
        header: 'Vehicle type',
        render: (row) => row.vehicleType ?? notSupplied,
        sortValue: (row) => row.vehicleType ?? '',
      },
      {
        key: 'verification',
        header: 'Verification',
        render: (row) => <span className={cells.plate}>{row.verification.reference}</span>,
        sortValue: (row) => row.verification.reference,
      },
      {
        key: 'outcome',
        header: 'Verification result',
        render: (row) =>
          row.verification.outcome ? (
            <StatusLabel {...outcomeStyle(row.verification.outcome)}>
              {outcomeLabel(row.verification.outcome)}
            </StatusLabel>
          ) : (
            notSupplied
          ),
        sortValue: (row) =>
          row.verification.outcome ? outcomeLabel(row.verification.outcome) : '',
      },
      {
        key: 'agent',
        header: 'Agent',
        render: (row) => (
          <Stack main={row.verification.agent.name} sub={row.verification.agent.id} />
        ),
        sortValue: (row) => row.verification.agent.name,
      },
      {
        key: 'verified',
        header: 'Verified (WAT)',
        render: (row) => (
          <Stack
            main={formatShortDateTime(row.verification.recordedAt)}
            sub={`${row.verification.location.name} · ${row.verification.location.area}`}
          />
        ),
        sortValue: (row) => Date.parse(row.verification.recordedAt),
      },
      ...(withPreviousTrip
        ? [
            {
              key: 'previous',
              header: 'Most recent previous trip',
              render: (row: VehicleTripCheck) =>
                row.previousTripReference ? (
                  <span className={cells.plate}>{row.previousTripReference}</span>
                ) : (
                  <span className={cells.sub}>None returned by CHL</span>
                ),
              sortValue: (row: VehicleTripCheck) => row.previousTripReference ?? '',
            },
          ]
        : []),
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => {
          const commands: RowCommand[] = [
            ...(row.previousTripReference
              ? [
                  {
                    label: 'Most recent previous trip',
                    onSelect: () => onOpenTrip(row.previousTripReference!),
                  },
                ]
              : []),
            ...(canSee(link, 'verifications')
              ? [
                  {
                    label: 'View verification',
                    onSelect: () =>
                      onRelated({ kind: 'verification', reference: row.verification.reference }),
                  },
                  {
                    label: 'Vehicle verifications',
                    onSelect: () => onRelated({ kind: 'vehicle', plate: row.plate }),
                  },
                ]
              : []),
          ]
          return <RowActions label={`Actions for ${row.plate}`} actions={commands} />
        },
      },
    ],
    [link, onOpenTrip, onRelated, withPreviousTrip],
  )
  return (
    <DashboardCard
      title={panel.title}
      subtitle={panel.subtitle}
      icon={panel.icon}
      bodyClassName={styles.panelBody}
    >
      <RegisterTable
        label={label}
        rows={vehicles}
        columns={columns}
        rowKey={(row) => row.plate}
        searchText={vehicleSearchText}
        initialQuery={panel.initialQuery}
      />
    </DashboardCard>
  )
}

/* ------------------------------------------------------------ Post-payment trip status */

const paymentSearchText = (row: PostPayment) =>
  [
    row.noticeId,
    row.violationId,
    row.plate,
    row.tripReference ?? '',
    row.complianceStatus ?? '',
  ].join(' ')

/** Confirmed payments and the trip activation or compliance status CHL recorded after them. */
export function PostPaymentPanel({
  payments,
  ...panel
}: PanelProps & { payments: readonly PostPayment[] }) {
  const link = useModuleLink()
  const { onOpenTrip, onRelated } = panel
  const columns = useMemo<Column<PostPayment>[]>(
    () => [
      {
        key: 'notice',
        header: 'Demand notice',
        render: (row) => <span className={cells.plate}>{row.noticeId}</span>,
        sortValue: (row) => row.noticeId,
      },
      {
        key: 'plate',
        header: 'Plate',
        render: (row) => <span className={cells.plate}>{row.plate}</span>,
        sortValue: (row) => row.plate,
      },
      {
        key: 'paid',
        header: 'Payment confirmed (WAT)',
        render: (row) => formatShortDateTime(row.paidAt),
        sortValue: (row) => Date.parse(row.paidAt),
      },
      {
        key: 'activation',
        header: 'Trip activation',
        render: (row) => (
          <PillLabel
            pill={
              row.tripActivated
                ? { tone: 'success', label: 'Trip activated', icon: 'overview/result-active.svg' }
                : { tone: 'neutral', label: 'Not activated by CHL' }
            }
          />
        ),
        sortValue: (row) => (row.tripActivated ? 1 : 0),
      },
      {
        key: 'trip',
        header: 'Trip',
        render: (row) =>
          row.tripReference ? (
            <span className={cells.plate}>{row.tripReference}</span>
          ) : (
            <span className={cells.sub}>None</span>
          ),
        sortValue: (row) => row.tripReference ?? '',
      },
      {
        key: 'compliance',
        header: 'Compliance status',
        render: (row) =>
          row.complianceStatus ? (
            <Stack
              main={row.complianceStatus}
              sub={row.updatedAt ? `Updated ${formatShortDateTime(row.updatedAt)}` : undefined}
            />
          ) : (
            <span className={cells.sub}>Not updated by CHL</span>
          ),
        sortValue: (row) => row.complianceStatus ?? '',
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => {
          const commands: RowCommand[] = [
            ...(row.tripReference
              ? [{ label: 'View trip details', onSelect: () => onOpenTrip(row.tripReference!) }]
              : []),
            ...(canSee(link, 'violations')
              ? [
                  {
                    label: 'Open the case',
                    onSelect: () => onRelated({ kind: 'case', violationId: row.violationId }),
                  },
                ]
              : []),
          ]
          return <RowActions label={`Actions for ${row.noticeId}`} actions={commands} />
        },
      },
    ],
    [link, onOpenTrip, onRelated],
  )
  return (
    <DashboardCard
      title={panel.title}
      subtitle={panel.subtitle}
      icon={panel.icon}
      bodyClassName={styles.panelBody}
    >
      <RegisterTable
        label="Confirmed payments"
        rows={payments}
        columns={columns}
        rowKey={(row) => row.noticeId}
        searchText={paymentSearchText}
        initialQuery={panel.initialQuery}
      />
      <p className={styles.small}>
        Trip activation and compliance status are shown only as CHL records them after a confirmed
        payment.
      </p>
    </DashboardCard>
  )
}
