/** The sample vehicles CHL holds: each plate's vehicle ID and type. */

/** The vehicle type CHL holds for each sample plate; some have none. */
export const VEHICLE_TYPES: Record<string, string | null> = {
  'KJA-482-XY': 'Articulated truck',
  'ENU-156-HL': 'Tanker',
  'PHC-388-MN': 'Rigid truck',
  'KDN-512-ZA': 'Articulated truck',
  'LNK-482-XK': 'Bus',
  'PHC-338-MN': 'Tipper',
  'IBD-640-WR': 'Rigid truck',
  'AAA-001-AB': null,
  'LSR-771-PB': 'Bus',
  'ABJ-221-KT': 'Tanker',
  'KAN-904-QR': null,
  'EKY-318-LD': 'Tipper',
  'FST-552-JA': 'Articulated truck',
  'RSH-117-MB': null,
  'APP-640-TT': 'Rigid truck',
  'ENU-388-MN': 'Tanker',
}

/** A stable vehicle ID for a plate, "VH-40213", as CHL would hold it. */
export function vehicleIdOf(plate: string): string {
  let hash = 0
  for (const char of plate) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0
  return `VH-${String(10_000 + (hash % 90_000)).padStart(5, '0')}`
}
