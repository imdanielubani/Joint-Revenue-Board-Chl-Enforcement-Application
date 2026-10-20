import { describe, expect, it } from 'vitest'
import { presetPeriod } from '@/features/overview/overview-period'
import { tripsMonitoringSchema } from '@/features/trips/trips.schemas'
import { summarizeTrips } from './mock-trips-api'
import { summarizeVerifications } from './mock-verifications-api'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')
const TODAY = '2026-10-18'
const filters = (scope: string) => ({ scope, range: '30d' as const, ...presetPeriod('30d', TODAY) })

describe('summarizeTrips', () => {
  it('returns data the schema accepts', () => {
    const result = summarizeTrips(filters('ng'), NOW)
    expect(tripsMonitoringSchema.safeParse(result).success).toBe(true)
    expect(result.trips.length).toBeGreaterThan(0)
    expect(result.vehicles.length).toBeGreaterThan(0)
    expect(result.postPayment.length).toBeGreaterThan(0)
  })

  it('checks each verified vehicle once, from its latest verification with a trip result', () => {
    const { vehicles } = summarizeTrips(filters('ng'), NOW)
    expect(new Set(vehicles.map((vehicle) => vehicle.plate)).size).toBe(vehicles.length)
    const verifications = summarizeVerifications(
      { ...filters('ng'), agentId: null, organization: null },
      NOW,
    ).records
    for (const vehicle of vehicles) {
      const latest = verifications.find(
        (record) =>
          record.plate === vehicle.plate &&
          ['active_trip', 'no_active_trip', 'expired_trip', 'no_trip_history'].includes(
            record.result ?? '',
          ),
      )
      expect(latest?.reference).toBe(vehicle.verification.reference)
    }
  })

  it('links each vehicle to the trip CHL returned, and only a trip that exists', () => {
    const { vehicles, trips } = summarizeTrips(filters('ng'), NOW)
    const byReference = new Map(trips.map((trip) => [trip.reference, trip]))
    for (const vehicle of vehicles) {
      if (vehicle.result === 'active_trip') {
        expect(byReference.get(vehicle.activeTripReference!)?.status).toBe('active')
        expect(vehicle.previousTripReference).toBeNull()
      } else {
        expect(vehicle.activeTripReference).toBeNull()
      }
      if (vehicle.result === 'no_trip_history') expect(vehicle.previousTripReference).toBeNull()
      if (vehicle.previousTripReference) {
        expect(byReference.get(vehicle.previousTripReference)?.status).not.toBe('active')
      }
    }
  })

  it('gives each trip the validity CHL reported and when, never more than it started with', () => {
    const { trips } = summarizeTrips(filters('ng'), NOW)
    for (const trip of trips) {
      expect(trip.validity).not.toBeNull()
      expect(trip.validity!.remainingSeconds).toBeLessThanOrEqual(24 * 3600)
      if (trip.status !== 'active') expect(trip.validity!.remainingSeconds).toBe(0)
      expect(Date.parse(trip.paidAt!)).toBeLessThanOrEqual(Date.parse(trip.startedAt!))
    }
  })

  it('gives each trip its transaction, channel and CHL status as CHL records them', () => {
    const { trips } = summarizeTrips(filters('ng'), NOW)
    expect(new Set(trips.map((trip) => trip.reference)).size).toBe(trips.length)
    for (const trip of trips) {
      expect(trip.reference).toMatch(/^\d{12}$/)
      expect(trip.terminalId).toMatch(/^\d{4}[A-Z]{4}$/)
      expect(trip.contactNumber).toMatch(/^\d{10}$/)
      expect(trip.transactionStatus).toBe('Successful')
      expect([trip.channel, trip.channelType]).toEqual(['Fortis', 'POS'])
      // Only CHL says why a trip closed; an active trip carries no such message.
      if (trip.status === 'active') expect(trip.statusMessage).toBeNull()
      if (trip.statusMessage) expect(trip.statusMessage).toMatch(/^This trip has expired \(/)
    }
  })

  it('reports trip activation or compliance status only after a confirmed payment', () => {
    const { postPayment, trips } = summarizeTrips(filters('ng'), NOW)
    const references = new Set(trips.map((trip) => trip.reference))
    for (const payment of postPayment) {
      expect(payment.tripActivated).toBe(payment.tripReference !== null)
      if (payment.tripReference) expect(references.has(payment.tripReference)).toBe(true)
      if (payment.updatedAt) {
        expect(Date.parse(payment.updatedAt)).toBeGreaterThanOrEqual(Date.parse(payment.paidAt))
      }
      expect(Date.parse(payment.paidAt)).toBeLessThanOrEqual(NOW)
    }
  })
})
