import type { PaymentsApi } from '@/features/payments/payments.api'
import type {
  Compliance,
  DemandNotice,
  PaymentMethod,
  PaymentsFilters,
  PaymentsMonitoring,
  RelatedTransaction,
} from '@/features/payments/payments.schemas'
import { lagosDay } from '@/shared/lib/dates'
import { delay } from './delay'
import { numberOf } from './mock-geography-api'
import { mockRecords, unit, type MockRecord } from './mock-records'
import { activationOf } from './mock-trips'
import { summarizeViolations } from './mock-violations-api'

const iso = (ms: number) => new Date(ms).toISOString()

/**
 * Sample amounts only, in naira: the document names a CHL levy and a penalty
 * but gives no tariff. The real figures come from CHL with each notice.
 */
const SAMPLE_LEVY = 20_000
const SAMPLE_PENALTIES: Record<string, number> = {
  'No Active CHL Trip': 50_000,
  'No E-Tag': 30_000,
  'Fake / Invalid E-Tag': 100_000,
  'Tampered E-Tag': 150_000,
  'Expired Trip': 25_000,
  'Refusal to Comply': 75_000,
  'Tag-Vehicle Mismatch': 50_000,
}

/** The violations whose remedy includes tagging the vehicle: tagging applies to them. */
const TAGGING_CATEGORIES = new Set([
  'No E-Tag',
  'Fake / Invalid E-Tag',
  'Tampered E-Tag',
  'Tag-Vehicle Mismatch',
])

const METHODS: readonly PaymentMethod[] = [
  'qr',
  'ussd',
  'transfer',
  'generated_account',
  'pos_card',
  'chl_platform',
]

/** The method CHL reports for a notice, with the generated account where it made one. */
function methodOf(number: number): DemandNotice['method'] {
  // About one in ten reports no method.
  if (unit(number * 29 + 1) < 0.1) return null
  const type = METHODS[Math.floor(unit(number * 29 + 2) * METHODS.length)]!
  return {
    type,
    detail: type === 'generated_account' ? `99${String(number).padStart(8, '0')}` : null,
  }
}

/** What CHL recorded after payment: the trip it activated, tagging, and the outcome. */
function complianceOf(
  record: MockRecord,
  category: string,
  now: number,
): { compliance: Compliance; transactions: RelatedTransaction[] } | null {
  const activation = activationOf(record, now)
  if (!activation) return null
  const number = numberOf(record.violation!.id)
  const tagging = TAGGING_CATEGORIES.has(category)
    ? unit(number * 29 + 3) < 0.7
      ? 'initiated'
      : 'not_initiated'
    : null
  const transactions: RelatedTransaction[] = [
    { reference: `TXN-${number}`, kind: 'payment', at: iso(activation.paidAt) },
  ]
  if (activation.trip) {
    transactions.push({
      reference: activation.trip.reference,
      kind: 'trip_activation',
      at: iso(activation.trip.startedAt),
    })
  }
  return {
    compliance: {
      tripActivated: activation.trip !== null,
      tripReference: activation.trip?.reference ?? null,
      tagging,
      outcome: activation.complianceStatus,
      updatedAt: activation.updatedAt === null ? null : iso(activation.updatedAt),
    },
    transactions,
  }
}

/**
 * The demand notices for an area, period, agent and organization: one for each
 * violation CHL generated a notice for, from the same cases Violations shows.
 */
export function summarizePayments(
  filters: PaymentsFilters,
  now: number = Date.now(),
): PaymentsMonitoring {
  const violations = summarizeViolations(filters, now)
  const records = new Map(
    mockRecords(lagosDay(new Date(now)), now).flatMap((record) =>
      record.violation ? [[record.violation.id, record] as const] : [],
    ),
  )
  const notices = violations.cases.flatMap((item): DemandNotice[] => {
    const record = records.get(item.id)
    if (!item.notice || !record) return []
    const number = numberOf(item.id)
    const penalty = SAMPLE_PENALTIES[item.category] ?? null
    const issued = item.actions.find((action) => action.action === 'demand_notice_issued')
    const after =
      item.notice.status === 'received' ? complianceOf(record, item.category, now) : null
    return [
      {
        id: item.notice.id,
        issuedAt: issued?.at ?? item.recordedAt,
        violation: { id: item.id, category: item.category, status: item.status },
        plate: item.plate,
        vehicleId: item.vehicleId,
        vehicleType: item.vehicleType,
        agent: item.agent,
        location: item.location,
        verificationReference: item.verification.reference,
        amounts: {
          levy: SAMPLE_LEVY,
          penalty,
          total: penalty === null ? null : SAMPLE_LEVY + penalty,
        },
        // About one in twelve has no payment reference from CHL yet.
        paymentReference: unit(number * 29 + 4) < 0.08 ? null : `JRB-PAY-${number}`,
        method: methodOf(number),
        status: item.notice.status,
        paidAt: item.notice.paidAt,
        compliance: after?.compliance ?? null,
        transactions: after?.transactions ?? [],
      },
    ]
  })
  return { latestReceivedAt: violations.latestReceivedAt, notices }
}

/** Sample data: from the sample records, as every other page counts them. */
export const mockPaymentsApi: PaymentsApi = {
  async getMonitoring(filters) {
    await delay()
    return summarizePayments(filters)
  },
}
