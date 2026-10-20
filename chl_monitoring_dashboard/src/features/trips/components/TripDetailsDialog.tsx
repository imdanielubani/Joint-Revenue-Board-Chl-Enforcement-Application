import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { formatDateTime } from '@/shared/lib/format'
import { Dialog } from '@/shared/ui/Dialog'
import { detectionPill, placeText, tripStatusPill, validityText } from '../trips-display'
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

/**
 * "Trip details": the document's trip detail fields, and destination
 * detection where CHL reports it — all as CHL returned them.
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
      <Facts title="Trip">
        <Fact term="Transaction reference">{trip.reference}</Fact>
        <Fact term="Transaction type">{trip.transactionType ?? 'Not supplied'}</Fact>
        <Fact term="Trip status">
          <PillLabel pill={tripStatusPill(trip.status)} />
        </Fact>
        <Fact term="Trip validity countdown">
          {validity.main}
          {validity.sub && <span className={styles.factNote}>{validity.sub}</span>}
        </Fact>
      </Facts>

      <Facts title="Vehicle">
        <Fact term="Vehicle plate number">{trip.plate}</Fact>
        <Fact term="Vehicle type">{trip.vehicleType ?? 'Not supplied'}</Fact>
      </Facts>

      <Facts title="Times and route">
        <Fact term="Trip start date/time">
          {trip.startedAt ? formatDateTime(trip.startedAt) : 'Not supplied'}
        </Fact>
        <Fact term="Payment date/time">
          {trip.paidAt ? formatDateTime(trip.paidAt) : 'Not supplied'}
        </Fact>
        <Fact term="Originating state and LGA">{placeText(trip.origin)}</Fact>
        <Fact term="Destination state and LGA">{placeText(trip.destination)}</Fact>
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
