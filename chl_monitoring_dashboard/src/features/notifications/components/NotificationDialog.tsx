import { useEffect } from 'react'
import { loadLabel, sosDuration } from '@/features/command-centre/command-centre-display'
import { followUpLabel } from '@/features/overview/overview-display'
import { Fact, Facts } from '@/features/verifications/components/VerificationDetailsDialog'
import links from '@/features/payments/components/PaymentCards.module.css'
import type { TripRelated } from '@/features/trips/components/TripRelatedDialog'
import buttons from '@/features/violations/components/ViolationCards.module.css'
import { formatDateTime, formatNumber } from '@/shared/lib/format'
import { useNow } from '@/shared/lib/use-now'
import { Dialog } from '@/shared/ui/Dialog'
import { StatusLabel } from '@/shared/ui/StatusLabel'
import { categoryLabel, isSos, readPill, typeLabel } from '../notifications-display'
import type { Notification } from '../notifications.schemas'
import { useNotificationRelated } from '../use-notification-related'

/**
 * A notification in a popup on the page: what it is and when CHL received it,
 * then the record it is about, as CHL recorded it. Opening it marks it read.
 */
export function NotificationDialog({
  notification,
  onRead,
  onRelated,
  onClose,
}: {
  notification: Notification
  /** Marks it read for this user; called once when it opens unread. */
  onRead(id: string): void
  /** Opens a record it leads to in its own popup, in place of this one. */
  onRelated(related: TripRelated): void
  onClose(): void
}) {
  const { id, read } = notification
  const related = useNotificationRelated()(notification)
  useEffect(() => {
    if (!read) onRead(id)
    // Once, when it opens: reading it changes `read`, which must not call again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const pill = readPill(read)
  return (
    <Dialog
      title={notification.title}
      subtitle={`${typeLabel(notification.type)} · ${categoryLabel(notification.category)}`}
      onClose={onClose}
      footer={
        <button type="button" className={buttons.secondaryButton} onClick={onClose}>
          Close
        </button>
      }
    >
      <Facts title="Notification">
        <Fact term="Type">
          {isSos(notification) ? (
            <StatusLabel tone="danger">{typeLabel(notification.type)}</StatusLabel>
          ) : (
            typeLabel(notification.type)
          )}
        </Fact>
        <Fact term="Group">{categoryLabel(notification.category)}</Fact>
        <Fact term="Received by CHL">{formatDateTime(notification.receivedAt)}</Fact>
        <Fact term="Status">
          <StatusLabel tone={pill.tone}>{pill.label}</StatusLabel>
        </Fact>
      </Facts>
      {notification.repeatVehicle && <VehicleFacts vehicle={notification.repeatVehicle} />}
      {notification.entry && <RecordFacts entry={notification.entry} />}
      {related.length > 0 && (
        <nav className={links.dialogLinks} aria-label="Related records">
          {related.map((entry) => (
            <button
              key={entry.label}
              type="button"
              className={links.dialogLink}
              onClick={() => onRelated(entry.related)}
            >
              {entry.label}
            </button>
          ))}
        </nav>
      )}
    </Dialog>
  )
}

/** A repeat vehicle, as its alert counts it, in the facts the Vehicle reports popup shows. */
function VehicleFacts({ vehicle }: { vehicle: NonNullable<Notification['repeatVehicle']> }) {
  return (
    <Facts title="Vehicle">
      <Fact term="Plate">{vehicle.plate}</Fact>
      <Fact term="Reports">{formatNumber(vehicle.reports)}</Fact>
      <Fact term="Agents">{formatNumber(vehicle.agents)}</Fact>
      <Fact term="Area">{vehicle.area}</Fact>
      <Fact term="Follow-up">{followUpLabel(vehicle.followUp)}</Fact>
    </Facts>
  )
}

/** The field record or payment update the notification is about. */
function RecordFacts({ entry }: { entry: NonNullable<Notification['entry']> }) {
  const now = useNow()
  const duration = sosDuration(entry, now)
  return (
    <Facts title="Record">
      {entry.report && <Fact term="Report">{entry.report.summary}</Fact>}
      {entry.sos && (
        <Fact term="Message">{entry.sos.message ?? 'No message was sent with the SOS.'}</Fact>
      )}
      {duration && <Fact term="SOS status">{duration.text}</Fact>}
      {entry.load && <Fact term="Confirmed">{loadLabel(entry.load)}</Fact>}
      {entry.payment && (
        <Fact term="Demand notice">
          {entry.payment.noticeId} ·{' '}
          {entry.payment.status === 'received'
            ? entry.payment.tripActivated
              ? 'Payment received; CHL reports the trip activated'
              : 'Payment received; CHL has not reported the trip activated'
            : 'Awaiting payment'}
        </Fact>
      )}
      {entry.plate && <Fact term="Plate">{entry.plate}</Fact>}
      <Fact term="Agent">
        {entry.agent.id} · {entry.agent.name}
      </Fact>
      <Fact term="Location">
        {[entry.location.name, entry.location.area, entry.location.code]
          .filter(Boolean)
          .join(' · ')}
        {entry.kind === 'sos' && ' · where it was sent, not a live position'}
      </Fact>
      <Fact term="Recorded">{formatDateTime(entry.recordedAt)}</Fact>
    </Facts>
  )
}
