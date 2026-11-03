import { z } from 'zod'
import type { Open, OverviewFilters } from '@/features/overview/overview.schemas'

const open = <T extends string>() => z.custom<Open<T>>((value) => typeof value === 'string')

/** The RFID reader's state, as the device reported it (SRD 11.4: reader connected / disconnected). */
export const RFID_READER_STATUSES = ['connected', 'disconnected'] as const
export type RfidReaderStatus = (typeof RFID_READER_STATUSES)[number]

/** The internet connection's state, as the device reported it (SRD 11.4: disconnected / restored). */
export const INTERNET_STATUSES = ['connected', 'disconnected'] as const
export type InternetStatus = (typeof INTERNET_STATUSES)[number]

/** Whether GPS was on, as the device reported it (SRD 11.4: GPS disabled). */
export const GPS_STATUSES = ['enabled', 'disabled'] as const
export type GpsStatus = (typeof GPS_STATUSES)[number]

/**
 * One agent's last-reported device status (document 13, Agent Device Status).
 * What the device reported at `reportedAt`, not its current state; each status
 * is null when CHL does not supply it.
 */
export const deviceStatusSchema = z.object({
  agent: z.object({ id: z.string(), name: z.string() }),
  /** The agent's vendor or organization; null when CHL records none. */
  organization: z.string().nullable(),
  /** Where the agent was when the status was reported; null when not supplied. */
  location: z.object({ name: z.string(), area: z.string(), code: z.string() }).nullable(),
  /** When the device reported this status. */
  reportedAt: z.string(),
  /** When CHL received the report; later than reportedAt when it was sent offline. Null when not supplied. */
  receivedAt: z.string().nullable(),
  rfidReader: open<RfidReaderStatus>().nullable(),
  internet: open<InternetStatus>().nullable(),
  gps: open<GpsStatus>().nullable(),
})

export const fieldStatusSchema = z.object({
  /** Whether CHL supplies agents' device status at all; the SRD does not guarantee it does. */
  provided: z.boolean(),
  /** When CHL last received a status report in scope, at any time; null when none. */
  latestReceivedAt: z.string().nullable(),
  /** Each agent's last report in the area and period, latest first. */
  devices: z.array(deviceStatusSchema),
})

export type DeviceStatus = z.infer<typeof deviceStatusSchema>
export type FieldStatus = z.infer<typeof fieldStatusSchema>

/** The area, period, agent and organization, as on the Overview. */
export type FieldStatusFilters = OverviewFilters
