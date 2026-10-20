import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { formatDateTime } from '@/shared/lib/format'
import { Dialog } from '@/shared/ui/Dialog'
import { detectionPill, tripStatusPill, validityText } from '../trips-display'
import type { Trip } from '../trips.schemas'
import { PillLabel } from './TripPanels'
import styles from './TripCards.module.css'

function Facts({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className={styles.dialogSection} aria-labelledby={id}>
      <h3 id={id} className={styles.dialogHeading}>
        {title}
      </h3>
      <dl className={styles.facts}>{children}</dl>
    </section>
  )
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className={styles.fact}>
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  )
}

const supplied = (value: string | null | undefined) => value ?? 'Not supplied'
const when = (value: string | null) => (value ? formatDateTime(value) : 'Not supplied')

/**
 * "Trip details": the trip as CHL returns it — the transaction, the vehicle,
 * the trip's status in CHL's own words, the route and the channel — with the
 * document's trip detail fields and destination detection where CHL reports it.
 */
export function TripDetailsDialog({ trip, onClose }: { trip: Trip; onClose(): void }) {
  const link = useModuleLink()
  const validity = validityText(trip.validity)
  const verifications = link('verifications', `${paths.verifications}?plate=${trip.plate}`)
  return (
    <Dialog
      title="Trip details"
      subtitle={`${trip.reference} · ${trip.plate}`}
      onClose={onClose}
      footer={
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          Close
        </button>
      }
    >
      <Facts title="Transaction">
        <Fact term="Transaction reference">{trip.reference}</Fact>
        <Fact term="Transaction date">{when(trip.transactionAt)}</Fact>
        <Fact term="Transaction status">{supplied(trip.transactionStatus)}</Fact>
        <Fact term="Payment date/time">{when(trip.paidAt)}</Fact>
        <Fact term="Terminal ID">{supplied(trip.terminalId)}</Fact>
        <Fact term="Contact number">{supplied(trip.contactNumber)}</Fact>
      </Facts>

      <Facts title="Vehicle information">
        <Fact term="Vehicle plate number">{trip.plate}</Fact>
        <Fact term="Vehicle type">{supplied(trip.vehicleType)}</Fact>
        <Fact term="Transaction type (trip type)">{supplied(trip.transactionType)}</Fact>
      </Facts>

      <Facts title="Trip status information">
        <Fact term="Trip status">
          <PillLabel pill={tripStatusPill(trip.status)} />
          {trip.statusMessage && <span className={styles.factNote}>{trip.statusMessage}</span>}
        </Fact>
        <Fact term="Trip start date/time">{when(trip.startedAt)}</Fact>
        <Fact term="Trip validity countdown">
          {validity.main}
          {validity.sub && <span className={styles.factNote}>{validity.sub}</span>}
        </Fact>
      </Facts>

      <Facts title="Route information">
        <Fact term="Origin state">{supplied(trip.origin?.state)}</Fact>
        <Fact term="Origin LGA">{supplied(trip.origin?.lga)}</Fact>
        <Fact term="Destination state">{supplied(trip.destination?.state)}</Fact>
        <Fact term="Destination LGA">{supplied(trip.destination?.lga)}</Fact>
      </Facts>

      <Facts title="Channel information">
        <Fact term="Channel">{supplied(trip.channel)}</Fact>
        <Fact term="Channel type">{supplied(trip.channelType)}</Fact>
      </Facts>

      <Facts title="Destination detection">
        {trip.destinationDetection ? (
          <>
            <Fact term="Reported">
              <PillLabel pill={detectionPill(trip.destinationDetection.status)} />
            </Fact>
            <Fact term="Reported at">{formatDateTime(trip.destinationDetection.reportedAt)}</Fact>
          </>
        ) : (
          <Fact term="Reported">Not reported by CHL</Fact>
        )}
      </Facts>

      {verifications && (
        <nav className={styles.dialogLinks} aria-label="Related records">
          <Link className={styles.dialogLink} to={verifications}>
            Vehicle verifications
          </Link>
        </nav>
      )}

      <p className={styles.small}>
        Read-only, as returned by CHL. The dashboard does not calculate trip validity, expire trips
        when a countdown reaches zero, or create trips.
      </p>
    </Dialog>
  )
}
