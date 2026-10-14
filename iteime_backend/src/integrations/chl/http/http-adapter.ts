import type { ChlAdapter } from '../adapter.js';
import { ChlNotImplementedError, ChlUnavailableError } from '../errors.js';
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
} from '../types.js';
import { ChlHttpClient, type ChlHttpClientOptions } from './chl-http-client.js';

/**
 * The real existing CHL backend.
 *
 * Each call is filled in from CHL's API documentation: the endpoint, the
 * request CHL expects, and a mapping from CHL's response to our types. Until
 * then each throws ChlNotImplementedError, and the backend runs with
 * CHL_ADAPTER=mock. Section numbers refer to "CHL Backend API Requirements -
 * ITEIME Backend and Mobile MVP".
 */
// TODO(chl): implement every call once the CHL API documentation arrives.
export class HttpChlAdapter implements ChlAdapter {
  readonly name = 'http' as const;

  /** Used by the calls once they are implemented. */
  protected readonly client: ChlHttpClient;

  constructor(options: ChlHttpClientOptions) {
    this.client = new ChlHttpClient(options);
  }

  // 3.1 (A1)
  async signIn(_email: string, _password: string): Promise<ChlSignIn> {
    throw new ChlNotImplementedError('signIn');
  }

  // 3.1 (A2)
  async refreshSession(_refreshToken: string): Promise<ChlSession> {
    throw new ChlNotImplementedError('refreshSession');
  }

  // 3.1 (A3)
  async signOut(_accessToken: string): Promise<void> {
    throw new ChlNotImplementedError('signOut');
  }

  // 3.1 (A4)
  async requestPasswordReset(_email: string): Promise<void> {
    throw new ChlNotImplementedError('requestPasswordReset');
  }

  // 3.1 (A5)
  async getAgent(_agentId: string): Promise<ChlAgent> {
    throw new ChlNotImplementedError('getAgent');
  }

  // 3.1 (A6)
  async getAccountStatus(_agentId: string): Promise<ChlAccountStatus> {
    throw new ChlNotImplementedError('getAccountStatus');
  }

  // 3.2 (V1–V3, V5, V6)
  async verifyVehicle(
    _identifier: ChlIdentifier,
    _context: ChlVerificationContext,
  ): Promise<ChlVerification> {
    throw new ChlNotImplementedError('verifyVehicle');
  }

  // 3.2 (V4)
  async resolveTags(_tagReferences: string[]): Promise<ChlTagResolution[]> {
    throw new ChlNotImplementedError('resolveTags');
  }

  // 3.3 (T1–T3)
  async refreshTrip(_vehicleId: string): Promise<ChlTripCheck> {
    throw new ChlNotImplementedError('refreshTrip');
  }

  // 3.4 (D2)
  async recordDestinationLocation(
    _transactionReference: string,
    _location: GeoPoint,
    _context: Omit<ChlVerificationContext, 'location'>,
  ): Promise<ChlRecordedLocation> {
    throw new ChlNotImplementedError('recordDestinationLocation');
  }

  // 3.5 (L1)
  async recordLoadStatus(
    _vehicleId: string,
    _status: ChlLoadStatus,
    _context: ChlVerificationContext,
  ): Promise<void> {
    throw new ChlNotImplementedError('recordLoadStatus');
  }

  // 3.6 (E1)
  async getETagReceipt(_eTagReference: string): Promise<ChlETagReceipt | null> {
    throw new ChlNotImplementedError('getETagReceipt');
  }

  // 3.7 (R1–R4)
  async getReferenceData(): Promise<ChlReferenceData> {
    throw new ChlNotImplementedError('getReferenceData');
  }

  /** Reaches CHL at all: any answer below 500 counts as up. */
  // TODO(chl): use CHL's health endpoint if it has one.
  async healthCheck(): Promise<void> {
    await this.client.request({ path: '/' }).catch((error: unknown) => {
      // Reached CHL, which answered; only "unavailable" means it is down.
      if (error instanceof ChlUnavailableError) throw error;
    });
  }
}
