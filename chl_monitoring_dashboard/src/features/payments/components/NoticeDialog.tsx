import { useId } from 'react'
import { paths } from '@/config/paths'
import { useModuleLink } from '@/features/auth/use-module-link'
import { actionStatusLabel } from '@/features/overview/overview-display'
import { Fact, Facts } from '@/features/verifications/components/VerificationDetailsDialog'
import verificationStyles from '@/features/verifications/components/VerificationCards.module.css'
import { formatDateTime } from '@/shared/lib/format'
import { Dialog } from '@/shared/ui/Dialog'
import {
  amountText,
  methodText,
  paymentStatusPill,
  taggingPill,
  transactionLabel,
  tripActivationPill,
} from '../payments-display'
import type { DemandNotice } from '../payments.schemas'
import { PillLabel, type NoticeRelatedKind } from './PaymentPanels'
import styles from './PaymentCards.module.css'

/**
 * "Notice details" (SRD 10): the demand notice, the vehicle, the CHL levy,
 * penalty and total payable, the payment reference and method, the payment
 * status, and what CHL recorded after payment, with its related transactions.
 */
export function NoticeDialog({
  notice,
  onClose,
  onRelated,
}: {
  notice: DemandNotice
  onClose(): void
  /** Opens the notice's case or verification in its own popup; left out where they are not offered. */
  onRelated?(kind: NoticeRelatedKind): void
}) {
  const link = useModuleLink()
  const transactionsId = useId()
  const compliance = notice.compliance
  const related: { label: string; kind: NoticeRelatedKind }[] = onRelated
    ? [
        ...(link('violations', paths.violations) !== undefined
          ? [{ label: 'Open the case', kind: 'case' as const }]
          : []),
        ...(link('verifications', paths.verifications) !== undefined
          ? [{ label: 'View verification', kind: 'verification' as const }]
          : []),
      ]
    : []

  return (
    <Dialog
      title={`Demand notice ${notice.id}`}
      subtitle={`${notice.plate} · Issued ${formatDateTime(notice.issuedAt)}`}
      wide
      onClose={onClose}
      footer={
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          Close
        </button>
      }
    >
      <Facts title="Notice">
        <Fact term="Demand notice">{notice.id}</Fact>
        <Fact term="Payment reference">{notice.paymentReference ?? 'Not supplied by CHL'}</Fact>
        <Fact term="Issued">{formatDateTime(notice.issuedAt)}</Fact>
        <Fact term="Violation">
          {notice.violation.id} · {notice.violation.category} ·{' '}
          {actionStatusLabel(notice.violation.status)}
        </Fact>
        <Fact term="Verification">{notice.verificationReference}</Fact>
        <Fact term="Agent">
          {notice.agent.name} · {notice.agent.id}
        </Fact>
        <Fact term="Location">
          {notice.location.area} / {notice.location.name} · {notice.location.code}
        </Fact>
      </Facts>

      <Facts title="Vehicle">
        <Fact term="Plate">{notice.plate}</Fact>
        <Fact term="Vehicle ID">{notice.vehicleId ?? 'Not resolved'}</Fact>
        <Fact term="Vehicle type">{notice.vehicleType ?? 'Not supplied'}</Fact>
      </Facts>

      <Facts title="Amount payable">
        <Fact term="CHL levy">{amountText(notice.amounts.levy)}</Fact>
        <Fact term="Penalty">{amountText(notice.amounts.penalty)}</Fact>
        <Fact term="Total payable">
          <span className={styles.total}>{amountText(notice.amounts.total)}</span>
        </Fact>
      </Facts>

      <Facts title="Payment method">
        <Fact term="Method">{methodText(notice.method)}</Fact>
        {notice.method?.detail && <Fact term="Account / reference">{notice.method.detail}</Fact>}
      </Facts>

      <Facts title="Payment status">
        <Fact term="Status">
          <PillLabel pill={paymentStatusPill(notice.status)} />
        </Fact>
        <Fact term="Payment confirmed">
          {notice.paidAt ? formatDateTime(notice.paidAt) : 'Not yet received'}
        </Fact>
      </Facts>

      <Facts title="Post-payment compliance">
        <Fact term="Trip activation">
          <PillLabel pill={tripActivationPill(compliance)} />
        </Fact>
        {compliance ? (
          <>
            <Fact term="Trip">{compliance.tripReference ?? 'None'}</Fact>
            <Fact term="Tagging process">
              <PillLabel pill={taggingPill(compliance)} />
            </Fact>
            <Fact term="Compliance outcome">{compliance.outcome ?? 'Not updated by CHL'}</Fact>
            <Fact term="Updated">
              {compliance.updatedAt ? formatDateTime(compliance.updatedAt) : 'Not updated by CHL'}
            </Fact>
          </>
        ) : (
          <Fact term="Recorded">Once CHL confirms payment</Fact>
        )}
      </Facts>

      <section className={verificationStyles.dialogSection} aria-labelledby={transactionsId}>
        <h3 id={transactionsId} className={verificationStyles.dialogHeading}>
          Related transactions
        </h3>
        {notice.transactions.length === 0 ? (
          <p className={styles.small}>None yet: CHL records them once payment is received.</p>
        ) : (
          <ul className={styles.transactions}>
            {notice.transactions.map((transaction) => (
              <li key={`${transaction.kind}:${transaction.reference}`}>
                <span className={styles.transactionReference}>{transaction.reference}</span>
                <span className={styles.transactionMeta}>
                  {transactionLabel(transaction.kind)} · {formatDateTime(transaction.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {onRelated && related.length > 0 && (
        <nav className={styles.dialogLinks} aria-label="Related records">
          {related.map((entry) => (
            <button
              key={entry.kind}
              type="button"
              className={styles.dialogLink}
              onClick={() => onRelated(entry.kind)}
            >
              {entry.label}
            </button>
          ))}
        </nav>
      )}

      <p className={styles.small}>
        Read-only, as reported by CHL. Payment received and trip activated are separate statuses. No
        tariff, invoice, payment confirmation, refund or reconciliation is changed here.
      </p>
    </Dialog>
  )
}
