import { followUpLabel } from '@/features/overview/overview-display'
import type { RepeatVehicle } from '@/features/overview/overview.schemas'
import { Fact } from '@/features/verifications/components/VerificationDetailsDialog'
import { formatNumber } from '@/shared/lib/format'
import type { ViolationCase } from '../violations.schemas'
import type { RelatedKind } from '../related-records'
import { CasesDialog } from './CasesDialog'

/**
 * "Vehicle reports": a repeat vehicle as its alert counts it, and every violation
 * of its plate in the area and period, in the register's own columns and row actions.
 */
export function VehicleReportsDialog({
  vehicle,
  cases,
  periodText,
  onClose,
  onOpen,
}: {
  vehicle: RepeatVehicle
  /** The plate's violations, newest first. */
  cases: readonly ViolationCase[]
  /** "Last 14 days", or the dates of a custom range. */
  periodText: string
  onClose(): void
  /** Opens a case, or with `related`, its evidence, verification, agent or payment. */
  onOpen(item: ViolationCase, related?: RelatedKind): void
}) {
  return (
    <CasesDialog
      title="Vehicle reports"
      subtitle={`${vehicle.plate} · ${formatNumber(vehicle.reports)} ${vehicle.reports === 1 ? 'report' : 'reports'} · ${periodText}`}
      factsTitle="Vehicle"
      facts={
        <>
          <Fact term="Plate">{vehicle.plate}</Fact>
          <Fact term="Reports">{formatNumber(vehicle.reports)}</Fact>
          <Fact term="Agents">{formatNumber(vehicle.agents)}</Fact>
          <Fact term="Area">{vehicle.area}</Fact>
          <Fact term="Follow-up">{followUpLabel(vehicle.followUp)}</Fact>
        </>
      }
      tableLabel={`Violations of ${vehicle.plate}`}
      cases={cases}
      onClose={onClose}
      onOpen={onOpen}
    />
  )
}
