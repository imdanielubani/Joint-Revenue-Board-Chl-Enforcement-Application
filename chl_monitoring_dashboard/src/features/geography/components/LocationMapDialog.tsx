import type { LocationRow } from '@/features/overview/overview.schemas'
import { Fact, Facts } from '@/features/verifications/components/VerificationDetailsDialog'
import cards from '@/features/verifications/components/VerificationCards.module.css'
import { formatNumber } from '@/shared/lib/format'
import { Dialog } from '@/shared/ui/Dialog'
import type { Geography } from '../geography.schemas'
import { EnforcementFootprintCard } from './GeographyCards'

/**
 * An enforcement location on the map: its metrics as the Overview counts them,
 * then the footprint map Geographical monitoring shows, at the location's
 * recorded position, with its verifications' recorded GPS.
 */
export function LocationMapDialog({
  location,
  geography,
  periodText,
  onClose,
}: {
  location: LocationRow
  /** Geographical monitoring for the location and period. */
  geography: Geography
  /** "Last 14 days", or the dates of a custom range. */
  periodText: string
  onClose(): void
}) {
  const points = geography.locations.filter((point) => point.id === location.id)
  return (
    <Dialog
      title="Enforcement location"
      subtitle={`${location.name} · ${location.code} · ${periodText}`}
      wide
      onClose={onClose}
      footer={
        <button type="button" className={cards.secondaryButton} onClick={onClose}>
          Close
        </button>
      }
    >
      <Facts title="Location">
        <Fact term="Location">{location.name}</Fact>
        <Fact term="Code">{location.code}</Fact>
        <Fact term="Area">{location.area}</Fact>
        <Fact term="Agents">{formatNumber(location.agents)}</Fact>
        <Fact term="Verifications">{formatNumber(location.verifications)}</Fact>
        <Fact term="Violations issued">{formatNumber(location.violationsIssued)}</Fact>
        <Fact term="Unresolved">{formatNumber(location.unresolved)}</Fact>
        <Fact term="Escalated">{formatNumber(location.escalated)}</Fact>
        <Fact term="Repeat alerts">{formatNumber(location.repeatAlerts)}</Fact>
      </Facts>

      <EnforcementFootprintCard
        subtitle="Recorded activity · not live tracking"
        points={points}
        verifications={geography.records.verifications}
        selectedId={location.id}
        emptyText="No recorded position for this location."
      />
    </Dialog>
  )
}
