import type { Open } from '@/features/overview/overview.schemas'
import { pillFor, type Pill } from '@/features/verifications/verifications-display'
import {
  GPS_STATUSES,
  INTERNET_STATUSES,
  RFID_READER_STATUSES,
  type DeviceStatus,
  type GpsStatus,
  type InternetStatus,
  type RfidReaderStatus,
} from './field-status.schemas'
import type { FieldStatusRegisterFilters } from './use-field-status-view'

const RFID_PILLS: Record<RfidReaderStatus, Pill> = {
  connected: { tone: 'success', label: 'Connected' },
  disconnected: { tone: 'danger', label: 'Disconnected' },
}

const INTERNET_PILLS: Record<InternetStatus, Pill> = {
  connected: { tone: 'success', label: 'Connected' },
  disconnected: { tone: 'warning', label: 'Disconnected' },
}

const GPS_PILLS: Record<GpsStatus, Pill> = {
  enabled: { tone: 'success', label: 'Enabled' },
  disabled: { tone: 'danger', label: 'Disabled' },
}

export const rfidPill = (value: Open<RfidReaderStatus> | null) => pillFor(RFID_PILLS, value)
export const internetPill = (value: Open<InternetStatus> | null) => pillFor(INTERNET_PILLS, value)
export const gpsPill = (value: Open<GpsStatus> | null) => pillFor(GPS_PILLS, value)

/** The filter value for a status CHL does not supply. */
export const NOT_SUPPLIED = 'not_supplied'

const notSupplied = { value: NOT_SUPPLIED, label: 'Not supplied' }

/** The register's filters' choices. */
export const FILTER_OPTIONS = {
  rfid: [
    ...RFID_READER_STATUSES.map((value) => ({ value, label: rfidPill(value).label })),
    notSupplied,
  ],
  internet: [
    ...INTERNET_STATUSES.map((value) => ({ value, label: internetPill(value).label })),
    notSupplied,
  ],
  gps: [...GPS_STATUSES.map((value) => ({ value, label: gpsPill(value).label })), notSupplied],
} as const

/** The reports the register's filters let through; null lets everything through. */
export function applyFieldStatusFilters(
  devices: readonly DeviceStatus[],
  filters: FieldStatusRegisterFilters,
): DeviceStatus[] {
  const is = (wanted: string | null, value: string | null) =>
    wanted === null || wanted === (value ?? NOT_SUPPLIED)
  return devices.filter(
    (device) =>
      is(filters.rfid, device.rfidReader) &&
      is(filters.internet, device.internet) &&
      is(filters.gps, device.gps),
  )
}

/** What the headline figures count, from each agent's last report. */
export function fieldStatusCounts(devices: readonly DeviceStatus[]) {
  const count = (test: (device: DeviceStatus) => boolean) => devices.filter(test).length
  return {
    readerDisconnected: count((device) => device.rfidReader === 'disconnected'),
    internetDisconnected: count((device) => device.internet === 'disconnected'),
    gpsDisabled: count((device) => device.gps === 'disabled'),
  }
}

/** The text the register's search matches. */
export function searchTextOf(device: DeviceStatus): string {
  return [
    device.agent.name,
    device.agent.id,
    device.organization ?? '',
    device.location?.name ?? '',
    device.location?.area ?? '',
  ].join(' ')
}
