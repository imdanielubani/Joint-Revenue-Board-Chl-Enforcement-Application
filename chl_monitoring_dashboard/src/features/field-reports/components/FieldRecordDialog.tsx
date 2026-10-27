import { fieldReportLabel } from '@/features/command-centre/command-centre-display'
import type { FeedItem } from '@/features/command-centre/command-centre.schemas'
import { sourceLabel, syncStatusLabel } from '@/features/overview/overview-display'
import links from '@/features/payments/components/PaymentCards.module.css'
import type { TripRelated } from '@/features/trips/components/TripRelatedDialog'
import { Fact, Facts } from '@/features/verifications/components/VerificationDetailsDialog'
import buttons from '@/features/violations/components/ViolationCards.module.css'
import { formatDateTime, formatDelay, formatShortDateTime } from '@/shared/lib/format'
import { Dialog } from '@/shared/ui/Dialog'
import { useFieldRecordRelated } from '../use-field-record-related'
import { LoadLabel } from './FieldRegisters'

/** The popup's title: the report's type, or what a loaded / empty confirmation is. */
function recordTitle(item: FeedItem): string {
  if (item.report) return fieldReportLabel(item.report.type)
  return 'Loaded / empty confirmation'
}

/**
 * A field report or loaded / empty confirmation in a popup on the page, as CHL
 * recorded it: what was reported, the vehicle, agent and location, and when it
 * was recorded and reached CHL.
 */
export function FieldRecordDialog({
  item,
  onRelated,
  onClose,
}: {
  item: FeedItem
  /** Opens a record it leads to in its own popup, in place of this one. */
  onRelated(related: TripRelated): void
  onClose(): void
}) {
  const offline = item.source === 'offline'
  const related = useFieldRecordRelated()(item)
  return (
    <Dialog
      title={recordTitle(item)}
      subtitle={`${item.plate ?? item.agent.name} · ${formatShortDateTime(item.recordedAt)}`}
      onClose={onClose}
      footer={
        <button type="button" className={buttons.secondaryButton} onClick={onClose}>
          Close
        </button>
      }
    >
      <Facts title={item.report ? 'Report' : 'Confirmation'}>
        {item.report && <Fact term="Report">{item.report.summary}</Fact>}
        {item.load && (
          <Fact term="Confirmed">
            <LoadLabel load={item.load} />
          </Fact>
        )}
        <Fact term="Plate">{item.plate ?? 'Not supplied'}</Fact>
        {item.report && (
          <Fact term="Photographs">
            {item.evidenceCount > 0
              ? `${item.evidenceCount} photograph${item.evidenceCount === 1 ? '' : 's'}`
              : 'Not supplied'}
          </Fact>
        )}
        {item.note && <Fact term="Agent note">{item.note}</Fact>}
      </Facts>
      <Facts title="Recorded">
        <Fact term="Agent">
          {item.agent.id} · {item.agent.name}
        </Fact>
        <Fact term="Location">
          {[item.location.name, item.location.area, item.location.code].filter(Boolean).join(' · ')}
        </Fact>
        <Fact term="Recorded">{formatDateTime(item.recordedAt)}</Fact>
        <Fact term="Received by CHL">
          {item.receivedAt ? formatDateTime(item.receivedAt) : 'Not supplied'}
          {offline &&
            item.receivedAt &&
            ` · ${formatDelay(item.recordedAt, item.receivedAt)} after it was recorded`}
        </Fact>
        {(item.source || item.syncStatus) && (
          <Fact term="Checked">
            {[
              item.source ? sourceLabel(item.source) : null,
              item.syncStatus ? syncStatusLabel(item.syncStatus) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Fact>
        )}
      </Facts>
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
