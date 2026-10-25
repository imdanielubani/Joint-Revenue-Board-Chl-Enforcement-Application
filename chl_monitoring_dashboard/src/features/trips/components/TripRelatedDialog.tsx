import { useMemo, useState } from 'react'
import { LocationMapDialog } from '@/features/geography/components/LocationMapDialog'
import { useGeography } from '@/features/geography/geography.queries'
import type {
  LocationRow,
  OverviewFilters,
  RepeatVehicle,
} from '@/features/overview/overview.schemas'
import { NoticePopup } from '@/features/payments/components/NoticePopup'
import { VehicleVerificationsDialog } from '@/features/verifications/components/VehicleVerificationsDialog'
import { VerificationDetailsDialog } from '@/features/verifications/components/VerificationDetailsDialog'
import { vehiclesOf } from '@/features/verifications/verifications-display'
import { useVerificationsMonitoring } from '@/features/verifications/verifications.queries'
import { AgentViolationsDialog } from '@/features/violations/components/AgentViolationsDialog'
import { CaseDialog } from '@/features/violations/components/CaseDialog'
import { VehicleReportsDialog } from '@/features/violations/components/VehicleReportsDialog'
import {
  AgentPopup,
  EvidencePopup,
  RelatedDialog,
  type Related,
} from '@/features/violations/components/RelatedDialog'
import type { RelatedKind } from '@/features/violations/related-records'
import { useViolationsMonitoring } from '@/features/violations/violations.queries'
import type { ViolationCase } from '@/features/violations/violations.schemas'
import { Dialog } from '@/shared/ui/Dialog'
import { StatePanel } from '@/shared/ui/StatePanel'
import type { TripsFilters } from '../trips.schemas'
import styles from './TripCards.module.css'

/** A record a row links to, opened in its own module's popup on the page. */
export type TripRelated =
  | { kind: 'verification'; reference: string }
  | { kind: 'vehicle'; plate: string }
  | { kind: 'case'; violationId: string }
  | { kind: 'payment'; noticeId: string }
  | { kind: 'agent'; agent: { id: string; name: string } }
  | { kind: 'agentViolations'; agent: { id: string; name: string; organization: string } }
  | { kind: 'location'; location: LocationRow }
  | { kind: 'vehicleReports'; vehicle: RepeatVehicle }
  | { kind: 'evidence'; violationId: string }

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

function AgentViolationsPopup({
  agent,
  filters,
  periodText,
  onClose,
  onOpen,
}: {
  agent: { id: string; name: string; organization: string }
  filters: OverviewFilters
  periodText: string
  onClose(): void
  /** Opens a case, or one of its related records, in place of the list. */
  onOpen(item: ViolationCase, related?: RelatedKind): void
}) {
  const query = useViolationsMonitoring({ ...filters, agentId: agent.id })
  if (query.data) {
    return (
      <AgentViolationsDialog
        agent={agent}
        cases={query.data.cases}
        periodText={periodText}
        onClose={onClose}
        onOpen={onOpen}
      />
    )
  }
  return (
    <Placeholder
      title="Violations issued"
      loading={query.isPending}
      message={`The violations issued by ${agent.name} could not be loaded.`}
      onClose={onClose}
    />
  )
}

function VehicleReportsPopup({
  vehicle,
  filters,
  periodText,
  onClose,
  onOpen,
}: {
  vehicle: RepeatVehicle
  filters: OverviewFilters
  periodText: string
  onClose(): void
  /** Opens a case, or one of its related records, in place of the list. */
  onOpen(item: ViolationCase, related?: RelatedKind): void
}) {
  const query = useViolationsMonitoring(filters)
  const cases = useMemo(
    () => query.data?.cases.filter((item) => item.plate === vehicle.plate),
    [query.data, vehicle.plate],
  )
  if (cases) {
    return (
      <VehicleReportsDialog
        vehicle={vehicle}
        cases={cases}
        periodText={periodText}
        onClose={onClose}
        onOpen={onOpen}
      />
    )
  }
  return (
    <Placeholder
      title="Vehicle reports"
      loading={query.isPending}
      message={`The reports of ${vehicle.plate} could not be loaded.`}
      onClose={onClose}
    />
  )
}

function LocationPopup({
  location,
  filters,
  periodText,
  onClose,
}: {
  location: LocationRow
  filters: OverviewFilters
  periodText: string
  onClose(): void
}) {
  const query = useGeography({
    scope: location.id,
    range: filters.range,
    from: filters.from,
    to: filters.to,
  })
  if (query.data) {
    return (
      <LocationMapDialog
        location={location}
        geography={query.data}
        periodText={periodText}
        onClose={onClose}
      />
    )
  }
  return (
    <Placeholder
      title="Enforcement location"
      loading={query.isPending}
      message={`${location.name} could not be loaded.`}
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
 * A row's verification, vehicle verifications, case, demand notice, agent, an
 * agent's violations, a repeat vehicle's reports, a violation's evidence or an
 * enforcement location on the map, in the same popup
 * its own module shows. One opens in place
 * of another: a verification's vehicle, a vehicle's verification, a listed
 * violation's case, or a case's evidence, verification or agent.
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
  if (current.kind === 'evidence') {
    return <EvidencePopup violationId={current.violationId} filters={all} onClose={onClose} />
  }
  if (current.kind === 'vehicleReports') {
    return (
      <VehicleReportsPopup
        vehicle={current.vehicle}
        filters={all}
        periodText={periodText}
        onClose={onClose}
        onOpen={(item, kind) =>
          kind ? setFromCase({ kind, item }) : setCurrent({ kind: 'case', violationId: item.id })
        }
      />
    )
  }
  if (current.kind === 'location') {
    return (
      <LocationPopup
        location={current.location}
        filters={all}
        periodText={periodText}
        onClose={onClose}
      />
    )
  }
  if (current.kind === 'agentViolations') {
    return (
      <AgentViolationsPopup
        agent={current.agent}
        filters={all}
        periodText={periodText}
        onClose={onClose}
        onOpen={(item, kind) =>
          kind ? setFromCase({ kind, item }) : setCurrent({ kind: 'case', violationId: item.id })
        }
      />
    )
  }
  if (current.kind === 'agent') {
    return (
      <AgentPopup agent={current.agent} filters={all} periodText={periodText} onClose={onClose} />
    )
  }
  if (current.kind === 'payment') {
    return <NoticePopup noticeId={current.noticeId} filters={all} onClose={onClose} />
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
