import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { gpsText } from '@/features/geography/record-details'
import { followUpLabel, outcomeLabel } from '@/features/overview/overview-display'
import { formatDateTime, formatDelay } from '@/shared/lib/format'
import { Dialog } from '@/shared/ui/Dialog'
import {
  actionLabel,
  closurePill,
  isUnresolved,
  pendingFollowUp,
  placeText,
  statusPill,
} from '../violations-display'
import type { ViolationCase } from '../violations.schemas'
import { PillLabel } from './ViolationPanels'
import styles from './ViolationCards.module.css'

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h3 id={id} className={styles.sectionTitle}>
        {title}
      </h3>
      {children}
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
 * A violation's case record (SRD 8.1): the vehicle, agent, location, time,
 * evidence and notes; the demand notice and payment status; the recorded
 * actions and pending follow-up (8.4); and how it was closed or cancelled
 * (8.5). Read-only: cases are not closed, cancelled or edited here.
 */
export function CaseDialog({ item, onClose }: { item: ViolationCase; onClose(): void }) {
  const link = useModuleLink()
  const links = [
    {
      label: 'View evidence',
      to: item.evidence ? link('evidence', `${paths.evidence}?record=${item.id}`) : undefined,
    },
    {
      label: 'Open the payment',
      to: item.notice ? link('payments', `${paths.payments}?notice=${item.notice.id}`) : undefined,
    },
    {
      label: 'View verification',
      to: link('verifications', `${paths.verifications}?ref=${item.verification.reference}`),
    },
    {
      label: 'Vehicle verifications',
      to: link('verifications', `${paths.verifications}?plate=${item.plate}`),
    },
    { label: 'View agent', to: link('agents', paths.agent(item.agent.id)) },
  ].flatMap((entry) => (entry.to ? [{ label: entry.label, to: entry.to }] : []))

  return (
    <Dialog
      wide
      title={`Case ${item.id}`}
      subtitle={`${item.category} · ${item.plate} · ${formatDateTime(item.recordedAt)}`}
      onClose={onClose}
      footer={
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          Close
        </button>
      }
    >
      <div className={styles.caseGrid}>
        <div className={styles.column}>
          <Section title="Violation">
            <dl className={styles.facts}>
              <Fact term="Category">{item.category}</Fact>
              <Fact term="Status">
                <PillLabel pill={statusPill(item.status)} />
              </Fact>
              <Fact term="Recorded">{formatDateTime(item.recordedAt)}</Fact>
              <Fact term="Received by CHL">
                {item.receivedAt
                  ? `${formatDateTime(item.receivedAt)} (${formatDelay(item.recordedAt, item.receivedAt)})`
                  : 'Not supplied'}
              </Fact>
              <Fact term="Verification">
                {`${item.verification.reference}${item.verification.outcome ? ` · ${outcomeLabel(item.verification.outcome)}` : ''}`}
              </Fact>
            </dl>
          </Section>

          <Section title="Vehicle, agent and location">
            <dl className={styles.facts}>
              <Fact term="Plate">{item.plate}</Fact>
              <Fact term="Vehicle ID">{item.vehicleId ?? 'Not resolved by CHL'}</Fact>
              <Fact term="Vehicle type">{item.vehicleType ?? 'Not supplied'}</Fact>
              <Fact term="Agent">{`${item.agent.name} · ${item.agent.id}`}</Fact>
              <Fact term="Location">{`${placeText(item.location)} · ${item.location.code}`}</Fact>
              <Fact term="Recorded GPS">{gpsText(item.position)}</Fact>
            </dl>
          </Section>

          <Section title="Evidence and notes">
            <dl className={styles.facts}>
              <Fact term="Evidence">
                {item.evidence
                  ? `${item.evidence.id} · ${item.evidence.photographs} photographs${item.evidence.status === 'pending' ? ' · still uploading' : ''}`
                  : 'None captured'}
              </Fact>
            </dl>
            {item.notes.length === 0 ? (
              <p className={styles.small}>No notes were submitted with this violation.</p>
            ) : (
              <ul className={styles.notes}>
                {item.notes.map((note) => (
                  <li key={note.id} className={styles.note}>
                    <p>{note.text}</p>
                    <p className={styles.noteBy}>
                      {note.agent.name} · {formatDateTime(note.submittedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className={styles.column}>
          <Section title="Demand notice and payment">
            <dl className={styles.facts}>
              {item.notice ? (
                <>
                  <Fact term="Demand notice">{item.notice.id}</Fact>
                  <Fact term="Payment status">
                    {item.notice.status === 'received' ? 'Payment received' : 'Payment pending'}
                  </Fact>
                  <Fact term="Payment confirmed">
                    {item.notice.paidAt ? formatDateTime(item.notice.paidAt) : 'Not yet'}
                  </Fact>
                </>
              ) : (
                <Fact term="Demand notice">None issued</Fact>
              )}
            </dl>
          </Section>

          <Section title="Recorded actions">
            <ol className={styles.timeline}>
              {item.actions.map((action, index) => (
                <li key={`${action.action}-${index}`} className={styles.timelineItem}>
                  <span className={styles.timelineTitle}>{actionLabel(action.action)}</span>
                  <span className={styles.small}>
                    {formatDateTime(action.at)} ·{' '}
                    {action.actor
                      ? `${action.actor.name}, ${action.actor.role}`
                      : 'Recorded by CHL'}
                  </span>
                </li>
              ))}
            </ol>
            {isUnresolved(item) && (
              <dl className={styles.facts}>
                <Fact term="Pending follow-up">{pendingFollowUp(item)}</Fact>
              </dl>
            )}
          </Section>

          {item.repeatAlert && (
            <Section title="Repeat-vehicle alert">
              <dl className={styles.facts}>
                <Fact term="Qualifying reports">{item.repeatAlert.reports}</Fact>
                <Fact term="Follow-up">{followUpLabel(item.repeatAlert.followUp)}</Fact>
              </dl>
            </Section>
          )}

          <Section title="Closure and cancellation">
            {item.closure ? (
              <dl className={styles.facts}>
                <Fact term="Outcome">
                  <PillLabel pill={closurePill(item.closure.outcome)} />
                </Fact>
                <Fact term="When">{formatDateTime(item.closure.at)}</Fact>
                <Fact term="Responsible actor">
                  {item.closure.actor
                    ? `${item.closure.actor.name}, ${item.closure.actor.role} · ${item.closure.actor.id}`
                    : 'Not supplied by CHL'}
                </Fact>
                <Fact term="Reason">{item.closure.reason ?? 'Not supplied'}</Fact>
                <Fact term="Audit reference">{item.closure.auditReference ?? 'Not available'}</Fact>
              </dl>
            ) : (
              <p className={styles.small}>Not closed or cancelled.</p>
            )}
          </Section>
        </div>
      </div>

      {links.length > 0 && (
        <nav className={styles.dialogLinks} aria-label="Related records">
          {links.map((entry) => (
            <Link key={entry.label} className={styles.dialogLink} to={entry.to}>
              {entry.label}
            </Link>
          ))}
        </nav>
      )}

      <p className={styles.small}>
        Read-only monitoring. Closing or cancelling a violation is done in CHL by authorised roles;
        this dashboard has no such actions.
      </p>
    </Dialog>
  )
}
