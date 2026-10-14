import type {
  ChlAccountStatus,
  ChlAgent,
  ChlETagReceipt,
  ChlIdentifier,
  ChlLoadStatus,
  ChlRecordedLocation,
  ChlReferenceData,
  ChlSession,
  ChlSignIn,
  ChlTagResolution,
  ChlTripCheck,
  ChlVerification,
  ChlVerificationContext,
  GeoPoint,
} from './types.js';

/**
 * Everything iteime_backend asks the existing CHL backend. This is the only
 * way the backend reaches CHL; no route or service calls CHL directly.
 *
 * Implementations:
 * - MockChlAdapter: sample CHL data, for building and testing without CHL.
 * - HttpChlAdapter: the real CHL API (filled in from CHL's documentation).
 *
 * Every method may throw a ChlError (see errors.ts). In particular a CHL
 * failure throws ChlUnavailableError and is never returned as a result.
 */
export interface ChlAdapter {
  /** Which implementation this is, for health and logs. */
  readonly name: 'mock' | 'http';

  // ---------------------------------------------- 3.1 Authentication

  /**
   * Checks an agent's CHL email and password.
   * Throws ChlInvalidCredentialsError or ChlAccountDeactivatedError.
   */
  signIn(email: string, password: string): Promise<ChlSignIn>;

  /** A new session for [refreshToken]; throws ChlSessionExpiredError. */
  refreshSession(refreshToken: string): Promise<ChlSession>;

  /** Ends [accessToken]'s session in CHL. */
  signOut(accessToken: string): Promise<void>;

  /**
   * Asks CHL to email a password-reset link. Resolves whether or not the
   * email has an account, so accounts can't be discovered this way.
   */
  requestPasswordReset(email: string): Promise<void>;

  /** The agent's profile; throws ChlNotFoundError. */
  getAgent(agentId: string): Promise<ChlAgent>;

  /** Whether the account is still active (checked on every request). */
  getAccountStatus(agentId: string): Promise<ChlAccountStatus>;

  // ---------------------------------------------- 3.2 Verification

  /** Verifies the vehicle behind [identifier]: vehicle, E-Tag and trip. */
  verifyVehicle(
    identifier: ChlIdentifier,
    context: ChlVerificationContext,
  ): Promise<ChlVerification>;

  /** Resolves several tags read together to their vehicles' plates. */
  resolveTags(tagReferences: string[]): Promise<ChlTagResolution[]>;

  // ---------------------------------------------- 3.3 Trips

  /** The vehicle's trip situation now (the app's Refresh Trip Status). */
  refreshTrip(vehicleId: string): Promise<ChlTripCheck>;

  // ---------------------------------------------- 3.4 Destination check

  /**
   * Sends the agent's location for the destination check of the trip with
   * [transactionReference]; returns it as CHL recorded it.
   */
  recordDestinationLocation(
    transactionReference: string,
    location: GeoPoint,
    context: Omit<ChlVerificationContext, 'location'>,
  ): Promise<ChlRecordedLocation>;

  // ---------------------------------------------- 3.5 Loaded / Empty

  /** Records whether a vehicle with no active trip is loaded or empty. */
  recordLoadStatus(
    vehicleId: string,
    status: ChlLoadStatus,
    context: ChlVerificationContext,
  ): Promise<void>;

  // ---------------------------------------------- 3.6 E-Tag receipt

  /** The receipt for an E-Tag, or null when CHL has none. */
  getETagReceipt(eTagReference: string): Promise<ChlETagReceipt | null>;

  // ---------------------------------------------- 3.7 Reference data

  getReferenceData(): Promise<ChlReferenceData>;

  // ---------------------------------------------- Health

  /** Resolves when CHL answers; rejects with ChlUnavailableError otherwise. */
  healthCheck(): Promise<void>;
}
