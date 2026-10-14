import { randomBytes } from 'node:crypto';

import type { ChlAdapter } from '../adapter.js';
import {
  ChlAccountDeactivatedError,
  ChlInvalidCredentialsError,
  ChlNotFoundError,
  ChlSessionExpiredError,
  ChlUnavailableError,
} from '../errors.js';
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
import {
  MOCK_UNAVAILABLE,
  mockAccounts,
  mockReferenceData,
  mockVehicles,
  type MockVehicle,
} from './mock-data.js';

export interface MockChlAdapterOptions {
  /** The current time; injectable for tests. */
  now?: () => Date;
  /** How long each call takes, to imitate a network. */
  delayMs?: number;
  /** Set false to make every call fail as if CHL were down. */
  available?: boolean;
}

/** A recorded Loaded / Empty confirmation. */
export interface MockLoadRecord {
  vehicleId: string;
  status: ChlLoadStatus;
  context: ChlVerificationContext;
}

/** How long a mock session lasts (SRD §5.3: 24 hours). */
const SESSION_HOURS = 24;

/**
 * A stand-in for the existing CHL backend, answering from mock-data.ts. It
 * keeps sessions and recorded actions in memory, so it forgets them on
 * restart. Use it until CHL's API documentation and access arrive.
 */
export class MockChlAdapter implements ChlAdapter {
  readonly name = 'mock' as const;

  private readonly now: () => Date;
  private readonly delayMs: number;
  available: boolean;

  /** accessToken -> agent id; refreshToken -> agent id. */
  private readonly accessTokens = new Map<string, { agentId: string; expiresAt: Date }>();
  private readonly refreshTokens = new Map<string, string>();

  /** What was recorded, for tests and inspection. */
  readonly loadRecords: MockLoadRecord[] = [];
  readonly passwordResets: string[] = [];

  constructor(options: MockChlAdapterOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.delayMs = options.delayMs ?? 0;
    this.available = options.available ?? true;
  }

  // ---------------------------------------------- 3.1 Authentication

  async signIn(email: string, password: string): Promise<ChlSignIn> {
    await this.call();
    const account = mockAccounts.find(
      (candidate) => candidate.agent.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!account || account.password !== password) throw new ChlInvalidCredentialsError();
    if (account.agent.status === 'deactivated') throw new ChlAccountDeactivatedError();
    return { agent: { ...account.agent }, session: this.issueSession(account.agent.id) };
  }

  async refreshSession(refreshToken: string): Promise<ChlSession> {
    await this.call();
    const agentId = this.refreshTokens.get(refreshToken);
    if (!agentId) throw new ChlSessionExpiredError();
    this.refreshTokens.delete(refreshToken);
    if (this.findAccount(agentId).agent.status === 'deactivated') {
      throw new ChlAccountDeactivatedError();
    }
    return this.issueSession(agentId);
  }

  async signOut(accessToken: string): Promise<void> {
    await this.call();
    this.accessTokens.delete(accessToken);
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.call();
    // Recorded whether or not the email has an account.
    this.passwordResets.push(email.trim().toLowerCase());
  }

  async getAgent(agentId: string): Promise<ChlAgent> {
    await this.call();
    return { ...this.findAccount(agentId).agent };
  }

  async getAccountStatus(agentId: string): Promise<ChlAccountStatus> {
    await this.call();
    return this.findAccount(agentId).agent.status;
  }

  // ---------------------------------------------- 3.2 Verification

  async verifyVehicle(
    identifier: ChlIdentifier,
    _context: ChlVerificationContext,
  ): Promise<ChlVerification> {
    await this.call();
    switch (identifier.method) {
      case 'plate': {
        if (identifier.plate === MOCK_UNAVAILABLE.plate) throw new ChlUnavailableError();
        const match = mockVehicles.find((entry) => entry.vehicle.plate === identifier.plate);
        return match ? this.found(match) : { outcome: 'vehicleNotFound' };
      }
      case 'qr': {
        const reference = identifier.reference.trim().toUpperCase();
        if (reference === MOCK_UNAVAILABLE.qrReference) throw new ChlUnavailableError();
        const match = mockVehicles.find((entry) => entry.qrReference === reference);
        return match ? this.found(match) : { outcome: 'vehicleNotFound' };
      }
      case 'rfid': {
        const reference = identifier.tagReference.trim().toUpperCase();
        if (reference === MOCK_UNAVAILABLE.tagReference) throw new ChlUnavailableError();
        const match = mockVehicles.find((entry) => entry.tagReference === reference);
        // CHL decides whether a tag belongs to the JRB CHL architecture.
        return match ? this.found(match) : { outcome: 'unknownTag' };
      }
    }
  }

  async resolveTags(tagReferences: string[]): Promise<ChlTagResolution[]> {
    await this.call();
    return tagReferences.map((tagReference) => {
      const match = mockVehicles.find(
        (entry) => entry.tagReference === tagReference.trim().toUpperCase(),
      );
      return match
        ? { tagReference, plate: match.vehicle.plate, known: true }
        : { tagReference, known: false };
    });
  }

  // ---------------------------------------------- 3.3 Trips

  async refreshTrip(vehicleId: string): Promise<ChlTripCheck> {
    await this.call();
    return this.findVehicle(vehicleId).trip(this.now());
  }

  // ---------------------------------------------- 3.4 Destination check

  async recordDestinationLocation(
    transactionReference: string,
    location: GeoPoint,
    _context: Omit<ChlVerificationContext, 'location'>,
  ): Promise<ChlRecordedLocation> {
    await this.call();
    const now = this.now();
    const hasTrip = mockVehicles.some((entry) => {
      const check = entry.trip(now);
      return check.status === 'active' && check.trip.transactionReference === transactionReference;
    });
    if (!hasTrip) throw new ChlNotFoundError('No active trip with that transaction reference.');
    return { ...location, recordedAt: now };
  }

  // ---------------------------------------------- 3.5 Loaded / Empty

  async recordLoadStatus(
    vehicleId: string,
    status: ChlLoadStatus,
    context: ChlVerificationContext,
  ): Promise<void> {
    await this.call();
    this.findVehicle(vehicleId);
    this.loadRecords.push({ vehicleId, status, context });
  }

  // ---------------------------------------------- 3.6 E-Tag receipt

  async getETagReceipt(eTagReference: string): Promise<ChlETagReceipt | null> {
    await this.call();
    const reference = eTagReference.trim().toUpperCase();
    const match = mockVehicles.find((entry) => entry.qrReference === reference);
    if (!match?.qrReference) return null;
    return {
      eTagReference: match.qrReference,
      plate: match.vehicle.plate,
      status: 'active',
      issuedAt: new Date('2026-03-02T09:00:00+01:00'),
      installedAt: new Date('2026-03-04T11:30:00+01:00'),
      details: { 'Tag type': 'UHF windscreen tag', 'Issuing office': 'JRB Ikeja' },
    };
  }

  // ---------------------------------------------- 3.7 Reference data

  async getReferenceData(): Promise<ChlReferenceData> {
    await this.call();
    return structuredClone(mockReferenceData);
  }

  // ---------------------------------------------- Health

  async healthCheck(): Promise<void> {
    await this.call();
  }

  // ---------------------------------------------- Helpers

  /** Waits [delayMs], then fails if CHL is "down". */
  private async call(): Promise<void> {
    if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    if (!this.available) throw new ChlUnavailableError();
  }

  private found(match: MockVehicle): ChlVerification {
    return {
      outcome: 'found',
      vehicle: { ...match.vehicle },
      eTag: { ...match.eTag },
      trip: match.trip(this.now()),
      chlReference: `CHL-VRF-${randomBytes(4).toString('hex').toUpperCase()}`,
    };
  }

  private issueSession(agentId: string): ChlSession {
    const accessToken = randomBytes(24).toString('base64url');
    const refreshToken = randomBytes(24).toString('base64url');
    const expiresAt = new Date(this.now().getTime() + SESSION_HOURS * 60 * 60 * 1000);
    this.accessTokens.set(accessToken, { agentId, expiresAt });
    this.refreshTokens.set(refreshToken, agentId);
    return { accessToken, refreshToken, expiresAt };
  }

  private findAccount(agentId: string) {
    const account = mockAccounts.find((candidate) => candidate.agent.id === agentId);
    if (!account) throw new ChlNotFoundError('No such agent.');
    return account;
  }

  private findVehicle(vehicleId: string): MockVehicle {
    const match = mockVehicles.find((entry) => entry.vehicle.id === vehicleId);
    if (!match) throw new ChlNotFoundError('No such vehicle.');
    return match;
  }
}
