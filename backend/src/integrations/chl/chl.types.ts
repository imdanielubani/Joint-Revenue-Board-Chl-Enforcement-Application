/**
 * Vocabulary for the CHL boundary, taken from the documents (not from any CHL
 * API, whose contract is not yet available). Field names and wire formats are
 * deliberately absent until the CHL API specification is confirmed.
 */

/** Verification result states, CSNI-DOC-SRD-JRB CHL ENFORCEMENT §15. */
export const verificationOutcomes = [
  'active_trip',
  'no_active_trip',
  'etag_missing',
  'invalid_etag',
  'tag_vehicle_mismatch',
  'vehicle_not_found',
  'no_trip_history',
  'verification_unavailable',
  'expired_previous_trip',
] as const;
export type VerificationOutcome = (typeof verificationOutcomes)[number];

/** Verification methods, SRD §8. */
export const verificationMethods = ['rfid', 'qr', 'manual_plate', 'ocr_plate'] as const;
export type VerificationMethod = (typeof verificationMethods)[number];

/**
 * Why a CHL call did not produce an answer. None of these is a business
 * outcome: a failed call is never "no active trip", "vehicle not found" or
 * "invalid credentials" (SRD §26.2, §33.2; acceptance criterion 12).
 */
export type ChlFailureKind =
  /** Network error or 5xx: CHL could not be asked. */
  | 'unavailable'
  /** CHL did not answer within CHL_TIMEOUT_MS. */
  | 'timeout'
  /** CHL refused ITEIME's own server-to-server credentials. */
  | 'unauthorized'
  /** CHL answered with something that doesn't match the agreed contract. */
  | 'invalid_response'
  /** No CHL identity provider / contract is configured. */
  | 'not_configured';
