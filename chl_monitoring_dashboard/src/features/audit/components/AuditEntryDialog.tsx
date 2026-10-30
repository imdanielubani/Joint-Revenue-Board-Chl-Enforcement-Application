import { Link } from 'react-router'
import { gpsText } from '@/features/geography/record-details'
import type { TripRelated } from '@/features/trips/components/TripRelatedDialog'
import { methodLabel, outcomeLabel, outcomeStyle } from '@/features/overview/overview-display'
import { Fact, Facts } from '@/features/verifications/components/VerificationDetailsDialog'
import { PillLabel } from '@/features/verifications/components/RecordsPanel'
import styles from '@/features/verifications/components/VerificationCards.module.css'
import {
  actionPill,
  attemptPill,
  placeText,
  provenancePill,
  syncPill,
} from '@/features/verifications/verifications-display'
import { formatDateTime, formatDelay } from '@/shared/lib/format'
import { Dialog } from '@/shared/ui/Dialog'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { identifierText, organizationText } from '../audit-display'
import type { AuditEntry } from '../audit.schemas'
import { useAuditRelated } from '../use-audit-related'
import local from './AuditEntryDialog.module.css'

/**
 * One audit entry in a popup on the page (SRD 28): every audit field CHL
 * holds for the verification attempt, grouped as the trail records them.
 * Read-only: an audit record is never edited or deleted.
 */
export function AuditEntryDialog({
  entry,
  onRelated,
  onClose,
}: {
  entry: AuditEntry
  /** Opens a record the entry leads to in its own popup, in place of this one. */
  onRelated(related: TripRelated): void
  onClose(): void
}) {
  const related = useAuditRelated()(entry)
  return (
    <Dialog
      title={`Audit entry ${entry.reference}`}
      subtitle={`${entry.plate} · ${formatDateTime(entry.recordedAt)}`}
      onClose={onClose}
      footer={
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          Close
        </button>
      }
    >
      <Facts title="Agent">
        <Fact term="Agent ID">{entry.agent.id}</Fact>
        <Fact term="Agent name">{entry.agent.name}</Fact>
        <Fact term="Vendor / organization">{organizationText(entry)}</Fact>
      </Facts>

      <Facts title="Verification">
        <Fact term="Date and time">{formatDateTime(entry.recordedAt)}</Fact>
        <Fact term="Verification method">
          {entry.method ? methodLabel(entry.method) : 'Not supplied'}
        </Fact>
        <Fact term="Verification result">
          {entry.result ? (
            <StatusLabel {...outcomeStyle(entry.result)}>{outcomeLabel(entry.result)}</StatusLabel>
          ) : (
            'Not supplied'
          )}
        </Fact>
        <Fact term="Processed identifier">{identifierText(entry)}</Fact>
        <Fact term="Attempt status">
          <PillLabel pill={attemptPill(entry.attempt)} />
        </Fact>
      </Facts>

      <Facts title="Vehicle, trip and violation">
        <Fact term="Vehicle plate">{entry.plate}</Fact>
        <Fact term="Vehicle ID">{entry.vehicle.id ?? 'Not resolved by CHL'}</Fact>
        <Fact term="Trip reference">{entry.tripId ?? 'None'}</Fact>
        <Fact term="Violation reference">{entry.violation?.id ?? 'None'}</Fact>
        <Fact term="Action taken">
          <PillLabel pill={actionPill(entry.actionTaken)} />
        </Fact>
      </Facts>

      <Facts title="Location">
        <Fact term="Enforcement point">{`${placeText(entry.location)} · ${entry.location.code}`}</Fact>
        <Fact term="GPS location">{gpsText(entry.position)}</Fact>
      </Facts>

      <Facts title="Device and application">
        <Fact term="Device ID">{entry.device?.id ?? 'Not supplied by CHL'}</Fact>
        <Fact term="App version">{entry.device?.appVersion ?? 'Not supplied by CHL'}</Fact>
      </Facts>

      <Facts title="Synchronization">
        <Fact term="Recorded source">
          <PillLabel pill={provenancePill(entry.provenance)} />
        </Fact>
        <Fact term="Received by CHL">
          {entry.receivedAt
            ? `${formatDateTime(entry.receivedAt)} (${formatDelay(entry.recordedAt, entry.receivedAt)})`
            : 'Not supplied'}
        </Fact>
        <Fact term="Synchronization status">
          <PillLabel pill={syncPill(entry)} />
        </Fact>
      </Facts>

      {related.length > 0 && (
        <nav className={styles.dialogLinks} aria-label="Related records">
          {related.map((item) =>
            'to' in item ? (
              <Link key={item.label} className={styles.dialogLink} to={item.to}>
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                className={local.relatedButton}
                onClick={() => onRelated(item.related)}
              >
                {item.label}
              </button>
            ),
          )}
        </nav>
      )}

      <p className={styles.small}>
        Read-only. Audit records cannot be edited or deleted. A raw RFID value is shown only masked
        unless exposing it was explicitly authorized; a failed read is not proof of a missing E-Tag,
        and an unavailable verification is not “No Active Trip”.
      </p>
    </Dialog>
  )
}
