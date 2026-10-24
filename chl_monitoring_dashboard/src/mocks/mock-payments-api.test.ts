import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { PAYMENT_METHODS, paymentsMonitoringSchema } from '@/features/payments/payments.schemas'
import { summarizeGeography } from './mock-geography-api'
import { summarizePayments } from './mock-payments-api'
import { summarizeTrips } from './mock-trips-api'
import { summarizeViolations } from './mock-violations-api'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')
const TODAY = '2026-10-18'
const filters = (scope: string) => ({
  scope,
  range: '30d' as const,
  ...presetPeriod('30d', TODAY),
  agentId: null,
  organization: null,
})

describe('summarizePayments', () => {
  it('returns data the schema accepts', () => {
    const result = summarizePayments(filters('ng'), NOW)
    expect(paymentsMonitoringSchema.safeParse(result).success).toBe(true)
    expect(result.notices.length).toBeGreaterThan(0)
  })

  it('has a notice for each violation CHL generated one for, as every other view counts them', () => {
    const { notices } = summarizePayments(filters('la'), NOW)
    const cases = summarizeViolations(filters('la'), NOW).cases.filter((item) => item.notice)
    expect(notices.map((notice) => [notice.id, notice.violation.id])).toEqual(
      cases.map((item) => [item.notice!.id, item.id]),
    )
    const geography = summarizeGeography(filters('la'), NOW).records.notices
    expect(notices.map((notice) => notice.id).sort()).toEqual(
      geography.map((notice) => notice.id).sort(),
    )
    for (const notice of notices) {
      const item = cases.find((entry) => entry.id === notice.violation.id)!
      expect(notice.status).toBe(item.notice!.status)
      expect(notice.paidAt).toBe(item.notice!.paidAt)
    }
  })

  it('makes the total payable the levy plus the penalty', () => {
    for (const { amounts } of summarizePayments(filters('ng'), NOW).notices) {
      if (amounts.levy !== null && amounts.penalty !== null) {
        expect(amounts.total).toBe(amounts.levy + amounts.penalty)
      } else {
        expect(amounts.total).toBeNull()
      }
    }
  })

  it('reports only the documented payment methods, or none', () => {
    const methods = summarizePayments(filters('ng'), NOW).notices.map((n) => n.method)
    for (const method of methods) {
      if (method) expect(PAYMENT_METHODS).toContain(method.type)
    }
    expect(methods.some((method) => method === null)).toBe(true)
    // Only a generated account carries an account number.
    for (const method of methods) {
      if (method?.detail) expect(method.type).toBe('generated_account')
    }
  })

  it('records compliance only once payment is received, apart from the payment', () => {
    const { notices } = summarizePayments(filters('ng'), NOW)
    for (const notice of notices) {
      if (notice.status === 'pending') {
        expect(notice.paidAt).toBeNull()
        expect(notice.compliance).toBeNull()
        expect(notice.transactions).toEqual([])
      } else {
        expect(notice.compliance).not.toBeNull()
        expect(notice.transactions[0]).toMatchObject({ kind: 'payment', at: notice.paidAt })
      }
    }
    // A payment received is not a trip activated: some paid notices have no trip.
    const received = notices.filter((notice) => notice.status === 'received')
    expect(received.some((notice) => !notice.compliance!.tripActivated)).toBe(true)
    expect(received.some((notice) => notice.compliance!.tripActivated)).toBe(true)
  })

  it('agrees with Trip monitoring on the trip activated after each payment', () => {
    const { notices } = summarizePayments(filters('ng'), NOW)
    const postPayment = summarizeTrips(filters('ng'), NOW).postPayment
    for (const entry of postPayment) {
      const notice = notices.find((n) => n.id === entry.noticeId)!
      expect(notice.paidAt).toBe(entry.paidAt)
      expect(notice.compliance!.tripActivated).toBe(entry.tripActivated)
      expect(notice.compliance!.tripReference).toBe(entry.tripReference)
      expect(notice.compliance!.outcome).toBe(entry.complianceStatus)
    }
    expect(postPayment).toHaveLength(notices.filter((n) => n.status === 'received').length)
  })

  it('applies tagging only to violations whose remedy is tagging', () => {
    for (const notice of summarizePayments(filters('ng'), NOW).notices) {
      if (!notice.compliance) continue
      const tagged = ['No E-Tag', 'Fake / Invalid E-Tag', 'Tampered E-Tag', 'Tag-Vehicle Mismatch']
      if (tagged.includes(notice.violation.category)) {
        expect(notice.compliance.tagging).not.toBeNull()
      } else {
        expect(notice.compliance.tagging).toBeNull()
      }
    }
  })
})
