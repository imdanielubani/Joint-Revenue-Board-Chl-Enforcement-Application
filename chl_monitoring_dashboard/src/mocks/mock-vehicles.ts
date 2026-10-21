/** The sample vehicles CHL holds: each plate's vehicle ID and type. */

/** CHL's vehicle type category for the sample vehicles. */
const VEHICLE_TYPE = '12/14 tyres and its equivalent'

/** The vehicle type CHL holds for each sample plate. */
export const VEHICLE_TYPES: Record<string, string | null> = {
  'KJA-482-XY': VEHICLE_TYPE,
  'ENU-156-HL': VEHICLE_TYPE,
  'PHC-388-MN': VEHICLE_TYPE,
  'KDN-512-ZA': VEHICLE_TYPE,
  'LNK-482-XK': VEHICLE_TYPE,
  'PHC-338-MN': VEHICLE_TYPE,
  'IBD-640-WR': VEHICLE_TYPE,
  'AAA-001-AB': VEHICLE_TYPE,
  'LSR-771-PB': VEHICLE_TYPE,
  'ABJ-221-KT': VEHICLE_TYPE,
  'KAN-904-QR': VEHICLE_TYPE,
  'EKY-318-LD': VEHICLE_TYPE,
  'FST-552-JA': VEHICLE_TYPE,
  'RSH-117-MB': VEHICLE_TYPE,
  'APP-640-TT': VEHICLE_TYPE,
  'ENU-388-MN': VEHICLE_TYPE,
}

/** A stable vehicle ID for a plate, "VH-40213", as CHL would hold it. */
export function vehicleIdOf(plate: string): string {
  let hash = 0
  for (const char of plate) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0
  return `VH-${String(10_000 + (hash % 90_000)).padStart(5, '0')}`
}
