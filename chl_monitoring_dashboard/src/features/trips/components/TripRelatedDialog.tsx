import { useMemo, useState } from 'react'
import type { OverviewFilters } from '@/features/overview/overview.schemas'
import { VehicleVerificationsDialog } from '@/features/verifications/components/VehicleVerificationsDialog'
import { VerificationDetailsDialog } from '@/features/verifications/components/VerificationDetailsDialog'
import { vehiclesOf } from '@/features/verifications/verifications-display'
import { useVerificationsMonitoring } from '@/features/verifications/verifications.queries'
import { CaseDialog } from '@/features/violations/components/CaseDialog'
import { RelatedDialog, type Related } from '@/features/violations/components/RelatedDialog'
import { useViolationsMonitoring } from '@/features/violations/violations.queries'
import { Dialog } from '@/shared/ui/Dialog'
import { StatePanel } from '@/shared/ui/StatePanel'
import type { TripsFilters } from '../trips.schemas'
import styles from './TripCards.module.css'

/** A record a trip row links to, opened in its own module's popup on this page. */
export type TripRelated =
  | { kind: 'verification'; reference: string }
  | { kind: 'vehicle'; plate: string }
  | { kind: 'case'; violationId: string }

/** While the record loads, or when it cannot be found: a popup saying so. */
function Placeholder({
  title,
  loading,
  message,
  onClose,
}: {
  title: string
  loading: boolean
  message: string
  onClose(): void
}) {
  return (
    <Dialog
      title={title}
      onClose={onClose}
      footer={
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          Close
        </button>
      }
    >
      {loading ? (
        <StatePanel kind="loading" message="Loading…" />
      ) : (
        <p className={styles.small}>{message}</p>
      )}
    </Dialog>
  )
}

function VerificationPopup({
  reference,
  filters,
  onClose,
  onVehicle,
}: {
  reference: string
  filters: OverviewFilters
  onClose(): void
  /** Shows the vehicle's verifications in place of this one. */
  onVehicle(plate: string): void
}) {
  const query = useVerificationsMonitoring(filters)
  const entry = query.data?.records.find((record) => record.reference === reference)
  if (entry) {
    return <VerificationDetailsDialog entry={entry} onClose={onClose} onVehicle={onVehicle} />
  }
  return (
    <Placeholder
      title="Verification details"
      loading={query.isPending}
      message={`Verification ${reference} was not found in this area and period.`}
      onClose={onClose}
    />
  )
}

function VehiclePopup({
  plate,
  filters,
  periodText,
  onClose,
  onOpen,
}: {
  plate: string
  filters: OverviewFilters
  periodText: string
  onClose(): void
  /** Opens one of the plate's verifications in place of the vehicle. */
  onOpen(reference: string): void
}) {
  const query = useVerificationsMonitoring(filters)
  const vehicle = useMemo(
    () =>
      query.data
        ? vehiclesOf(query.data.records).find((entry) => entry.plate === plate)
        : undefined,
    [query.data, plate],
  )
  if (vehicle) {
    return (
      <VehicleVerificationsDialog
        vehicle={vehicle}
        periodText={periodText}
        onClose={onClose}
        onOpen={(entry) => onOpen(entry.reference)}
      />
    )
  }
  return (
    <Placeholder
      title="Vehicle verifications"
      loading={query.isPending}
      message={`No verifications of ${plate} were found in this area and period.`}
      onClose={onClose}
    />
  )
}

function CasePopup({
  violationId,
  filters,
  onClose,
  onRelated,
}: {
  violationId: string
  filters: OverviewFilters
  onClose(): void
  onRelated(related: Related): void
}) {
  const query = useViolationsMonitoring(filters)
  const item = query.data?.cases.find((entry) => entry.id === violationId)
  if (item) {
    return (
      <CaseDialog item={item} onClose={onClose} onRelated={(kind) => onRelated({ kind, item })} />
    )
  }
  return (
    <Placeholder
      title={`Case ${violationId}`}
      loading={query.isPending}
      message={`Violation ${violationId} was not found in this area and period.`}
      onClose={onClose}
    />
  )
}

/**
 * A trip row's verification, vehicle verifications or case, in the same popup
 * its own module shows. One opens in place of another: a verification's
 * vehicle, a vehicle's verification, or a case's evidence, verification or agent.
 */
export function TripRelatedDialog({
  related,
  filters,
  periodText,
  onClose,
}: {
  related: TripRelated
  /** The area and period: the record is looked up there, for every agent and organization. */
  filters: TripsFilters
  /** "Last 30 days", for an agent's details. */
  periodText: string
  onClose(): void
}) {
  const [current, setCurrent] = useState<TripRelated>(related)
  const [fromCase, setFromCase] = useState<Related | null>(null)
  const all: OverviewFilters = { ...filters, agentId: null, organization: null }
  if (fromCase) {
    return (
      <RelatedDialog related={fromCase} filters={all} periodText={periodText} onClose={onClose} />
    )
  }
  if (current.kind === 'verification') {
    return (
      <VerificationPopup
        key={current.reference}
        reference={current.reference}
        filters={all}
        onClose={onClose}
        onVehicle={(plate) => setCurrent({ kind: 'vehicle', plate })}
      />
    )
  }
  if (current.kind === 'vehicle') {
    return (
      <VehiclePopup
        key={current.plate}
        plate={current.plate}
        filters={all}
        periodText={periodText}
        onClose={onClose}
        onOpen={(reference) => setCurrent({ kind: 'verification', reference })}
      />
    )
  }
  return (
    <CasePopup
      violationId={current.violationId}
      filters={all}
      onClose={onClose}
      onRelated={setFromCase}
    />
  )
}
