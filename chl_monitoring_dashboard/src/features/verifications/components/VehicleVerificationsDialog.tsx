import { useMemo } from 'react'
import { useModuleLink } from '@/features/auth/use-module-link'
import { verificationColumns } from '@/features/geography/components/record-columns'
import { Stack } from '@/features/geography/components/RecordCells'
import cells from '@/features/geography/components/RecordColumns.module.css'
import { outcomeLabel, outcomeStyle } from '@/features/overview/overview-display'
import { formatDateTime, formatNumber } from '@/shared/lib/format'
import type { Column } from '@/shared/ui/DataTable'
import { Dialog } from '@/shared/ui/Dialog'
import { RegisterTable } from '@/shared/ui/RegisterTable'
import { RowActions } from '@/shared/ui/RowActions'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { searchTextOf, type VehicleSummary } from '../verifications-display'
import type { VerificationEntry } from '../verifications.schemas'
import { Fact, Facts } from './VerificationDetailsDialog'
import styles from './VerificationCards.module.css'

/** The plate's verifications: the cells other modules show, the reference as plain text. */
function useColumns(onOpen: (entry: VerificationEntry) => void): Column<VerificationEntry>[] {
  const link = useModuleLink()
  return useMemo(() => {
    const shared = verificationColumns(link, (row) => onOpen(row as VerificationEntry))
    const column = (key: string): Column<VerificationEntry> => {
      const found = shared.find((entry) => entry.key === key)
      if (!found) throw new Error(`No shared verification column "${key}"`)
      return found
    }
    return [
      {
        key: 'reference',
        header: 'Reference',
        render: (row) => <span className={cells.plate}>{row.reference}</span>,
        sortValue: (row) => row.reference,
      },
      // The headings the verification register uses.
      { ...column('method'), header: 'Method' },
      { ...column('outcome'), header: 'Outcome' },
      column('agent'),
      column('recorded'),
      {
        key: 'location',
        header: 'Location',
        render: (row) => (
          <Stack
            main={row.location.name}
            sub={[row.location.area, row.location.code].filter(Boolean).join(' · ')}
          />
        ),
        sortValue: (row) => `${row.location.area} ${row.location.name}`,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'end',
        render: (row) => (
          <RowActions
            label={`Actions for ${row.reference}`}
            actions={[{ label: 'View details', onSelect: () => onOpen(row) }]}
          />
        ),
      },
    ]
  }, [link, onOpen])
}

/**
 * "Vehicle verifications": the vehicle as Vehicle identity (SRD 6.2) shows it,
 * and every verification of its plate in the area and period.
 */
export function VehicleVerificationsDialog({
  vehicle,
  periodText,
  onClose,
  onOpen,
}: {
  vehicle: VehicleSummary
  /** "Last 30 days", or the dates of a custom range. */
  periodText: string
  onClose(): void
  /** Opens one of the plate's verifications. */
  onOpen(entry: VerificationEntry): void
}) {
  const columns = useColumns(onOpen)
  const count = vehicle.verifications.length
  return (
    <Dialog
      title="Vehicle verifications"
      subtitle={`${vehicle.plate} · ${formatNumber(count)} ${count === 1 ? 'verification' : 'verifications'} · ${periodText}`}
      wide
      onClose={onClose}
      footer={
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          Close
        </button>
      }
    >
      <Facts title="Vehicle identity">
        <Fact term="Plate">{vehicle.plate}</Fact>
        <Fact term="Vehicle ID">{vehicle.vehicleId ?? 'Not resolved'}</Fact>
        <Fact term="Vehicle type">{vehicle.type ?? 'Not supplied'}</Fact>
        <Fact term="Latest outcome">
          {vehicle.latest.result ? (
            <StatusLabel {...outcomeStyle(vehicle.latest.result)}>
              {outcomeLabel(vehicle.latest.result)}
            </StatusLabel>
          ) : (
            'Not supplied'
          )}
        </Fact>
        <Fact term="Related trips">{vehicle.trips.join(', ') || 'None found'}</Fact>
        <Fact term="Violations">
          {vehicle.violations.map((violation) => violation.id).join(', ') || 'None issued'}
        </Fact>
        <Fact term="Last verified">{formatDateTime(vehicle.latest.recordedAt)}</Fact>
      </Facts>

      <RegisterTable
        label={`Verifications of ${vehicle.plate}`}
        rows={vehicle.verifications}
        columns={columns}
        rowKey={(row) => row.id}
        searchText={searchTextOf}
        pageSize={5}
      />

      <p className={styles.small}>
        Vehicle ID and type are shown where CHL resolved the plate; a plate CHL could not match
        stays “Not resolved” rather than guessed.
      </p>
    </Dialog>
  )
}
