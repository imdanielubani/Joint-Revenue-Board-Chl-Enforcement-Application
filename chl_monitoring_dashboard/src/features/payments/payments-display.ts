import type { Open } from '@/features/overview/overview.schemas'
import { formatNaira } from '@/shared/lib/format'
import type { StatusTone } from '@/shared/ui/StatusLabel'
import type {
  Compliance,
  DemandNotice,
  PaymentMethod,
  PaymentStatus,
  RelatedTransaction,
} from './payments.schemas'

export interface Pill {
  tone: StatusTone
  label: string
  icon?: string
}

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Payment Pending',
  received: 'Payment Received',
}

/** "Payment Pending" or "Payment Received", as other modules show a notice's status. */
export function paymentStatusPill(status: Open<PaymentStatus>): Pill {
  if (status === 'received') return { tone: 'success', label: STATUS_LABELS.received }
  if (status === 'pending') return { tone: 'amber', label: STATUS_LABELS.pending }
  return { tone: 'neutral', label: status }
}

export const paymentStatusLabel = (status: Open<PaymentStatus>) => paymentStatusPill(status).label

const METHOD_LABELS: Record<PaymentMethod, string> = {
  qr: 'QR code',
  ussd: 'USSD',
  transfer: 'Bank transfer',
  generated_account: 'Generated account / reference',
  pos_card: 'POS / card',
  chl_platform: 'Existing CHL platform',
}

/** The method as the backend reports it; one the dashboard does not know is shown as sent. */
export const methodLabel = (type: Open<PaymentMethod>) =>
  METHOD_LABELS[type as PaymentMethod] ?? type

export const NO_METHOD = 'Not supplied by CHL'

export const methodText = (method: DemandNotice['method']) =>
  method ? methodLabel(method.type) : NO_METHOD

/**
 * Whether CHL recorded a trip as activated after payment: its own status,
 * never inferred from the payment.
 */
export function tripActivationPill(compliance: Compliance | null): Pill {
  if (!compliance) return { tone: 'neutral', label: 'Awaiting payment' }
  return compliance.tripActivated
    ? { tone: 'success', label: 'Trip Activated', icon: 'overview/result-active.svg' }
    : { tone: 'neutral', label: 'Not activated by CHL' }
}

/** Whether CHL started the vehicle's tagging process after payment. */
export function taggingPill(compliance: Compliance): Pill {
  if (compliance.tagging === null) return { tone: 'neutral', label: 'Not applicable' }
  if (compliance.tagging === 'initiated') return { tone: 'info', label: 'Tagging initiated' }
  if (compliance.tagging === 'not_initiated') {
    return { tone: 'neutral', label: 'Not initiated by CHL' }
  }
  return { tone: 'neutral', label: compliance.tagging }
}

/** "₦70,000", or that CHL supplied no amount. */
export const amountText = (value: number | null) =>
  value === null ? 'Not supplied by CHL' : formatNaira(value)

const TRANSACTION_LABELS: Record<string, string> = {
  payment: 'Payment',
  trip_activation: 'Trip activation',
}

export const transactionLabel = (kind: RelatedTransaction['kind']) =>
  TRANSACTION_LABELS[kind] ?? kind

/** The text the register's search matches. */
export function searchTextOf(notice: DemandNotice): string {
  return [
    notice.id,
    notice.violation.id,
    notice.violation.category,
    notice.plate,
    notice.vehicleId ?? '',
    notice.paymentReference ?? '',
    notice.method?.detail ?? '',
    notice.agent.name,
    notice.location.name,
    notice.location.area,
    ...notice.transactions.map((transaction) => transaction.reference),
  ].join(' ')
}
