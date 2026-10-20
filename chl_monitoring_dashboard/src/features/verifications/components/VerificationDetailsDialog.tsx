import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { gpsText } from '@/features/geography/record-details'
import {
  actionStatusLabel,
  methodLabel,
  outcomeLabel,
  outcomeStyle,
} from '@/features/overview/overview-display'
import { formatDateTime, formatDelay } from '@/shared/lib/format'
import { Dialog } from '@/shared/ui/Dialog'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import {
  actionPill,
  attemptPill,
  etagPill,
  pendingActions,
  placeText,
  provenancePill,
  syncPill,
} from '../verifications-display'
import type { VerificationEntry } from '../verifications.schemas'
import { PillLabel } from './RecordsPanel'
import styles from './VerificationCards.module.css'

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
 * "Verification details" (SRD 6.5): the method and outcome, the vehicle and
 * trip, the action taken, the violation and payment request that followed, what
 * is still pending, and the synchronization status. No raw RFID values.
 */
export function VerificationDetailsDialog({
  entry,
  onClose,
  onVehicle,
}: {
  entry: VerificationEntry
  onClose(): void
  /** Shows the vehicle in Vehicle identity. */
  onVehicle(plate: string): void
}) {
  const link = useModuleLink()
  const pending = pendingActions(entry)
  const links = [
    {
      label: 'Open the case',
      to: entry.violation
        ? link('violations', `${paths.violations}?case=${entry.violation.id}`)
        : undefined,
    },
    {
      label: 'Open the payment',
      to: entry.payment
        ? link('payments', `${paths.payments}?notice=${entry.payment.id}`)
        : undefined,
    },
    {
      label: 'Open the trip',
      to: entry.tripId ? link('trips', `${paths.trips}?trip=${entry.tripId}`) : undefined,
    },
    { label: 'View agent', to: link('agents', paths.agent(entry.agent.id)) },
  ].flatMap((item) => (item.to ? [{ label: item.label, to: item.to }] : []))

  return (
    <Dialog
      title="Verification details"
      subtitle={`${entry.reference} · ${entry.plate} · ${formatDateTime(entry.recordedAt)}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => onVehicle(entry.plate)}
          >
            Vehicle identity
          </button>
        </>
      }
    >
      <Facts title="Verification">
        <Fact term="Method">{entry.method ? methodLabel(entry.method) : 'Not supplied'}</Fact>
        <Fact term="Outcome">
          {entry.result ? (
            <StatusLabel {...outcomeStyle(entry.result)}>{outcomeLabel(entry.result)}</StatusLabel>
          ) : (
            'Not supplied'
          )}
        </Fact>
        <Fact term="E-Tag result">
          <PillLabel pill={etagPill(entry.etag)} />
        </Fact>
        <Fact term="Attempt status">
          <PillLabel pill={attemptPill(entry.attempt)} />
        </Fact>
      </Facts>

      <Facts title="Vehicle and trip">
        <Fact term="Plate">{entry.plate}</Fact>
        <Fact term="Vehicle ID">{entry.vehicle.id ?? 'Not resolved by CHL'}</Fact>
        <Fact term="Vehicle type">{entry.vehicle.type ?? 'Not supplied'}</Fact>
        <Fact term="Related trip">{entry.tripId ?? 'None found'}</Fact>
      </Facts>

      <Facts title="Action">
        <Fact term="Action taken">
          <PillLabel pill={actionPill(entry.actionTaken)} />
        </Fact>
        <Fact term="Violation issued">
          {entry.violation
            ? `${entry.violation.id} · ${entry.violation.category} · ${actionStatusLabel(entry.violation.status)}`
            : 'None'}
        </Fact>
        <Fact term="Payment request">
          {entry.payment
            ? `${entry.payment.id} · ${entry.payment.status === 'received' ? 'Payment received' : 'Payment pending'}`
            : 'None generated'}
        </Fact>
        <Fact term="Pending action">{pending.join(' · ') || 'None'}</Fact>
      </Facts>

      <Facts title="Record and synchronization">
        <Fact term="Agent">{`${entry.agent.name} · ${entry.agent.id}`}</Fact>
        <Fact term="Location">{`${placeText(entry.location)} · ${entry.location.code}`}</Fact>
        <Fact term="Recorded GPS">{gpsText(entry.position)}</Fact>
        <Fact term="Recorded source">
          <PillLabel pill={provenancePill(entry.provenance)} />
        </Fact>
        <Fact term="Received by CHL">
          {entry.receivedAt
            ? `${formatDateTime(entry.receivedAt)} (${formatDelay(entry.recordedAt, entry.receivedAt)})`
            : 'Not supplied'}
        </Fact>
        <Fact term="Synchronization">
          <PillLabel pill={syncPill(entry)} />
        </Fact>
      </Facts>

      {links.length > 0 && (
        <nav className={styles.dialogLinks} aria-label="Related records">
          {links.map((item) => (
            <Link key={item.label} className={styles.dialogLink} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      <p className={styles.small}>
        Read-only. Raw RFID identifiers are not shown; a failed read is not proof of a missing
        E-Tag, and an unavailable verification is not “No Active Trip”.
      </p>
    </Dialog>
  )
}
