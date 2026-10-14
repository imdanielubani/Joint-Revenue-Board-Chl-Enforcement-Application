import type { ChlAdapter } from '../../integrations/chl/adapter.js';
import { ChlUnavailableError } from '../../integrations/chl/errors.js';
import type { ChlIdentifier, ChlVerification, GeoPoint } from '../../integrations/chl/types.js';
import type { Database } from '../../database/pool.js';
import { parsePlate } from './plate.js';
import {
  resultView,
  tripCheckView,
  verificationView,
  type TripCheckView,
  type VerificationDetailView,
  type VerificationMethod,
  type VerificationView,
} from './verification.view.js';
import { AppError } from '../../shared/errors.js';
import { DAY_MS } from '../../shared/lagos-time.js';
import { decodeCursor, isUuid, toPage, type Page } from '../../shared/pagination.js';
import { newReference } from '../../shared/tokens.js';
import type { AgentSession } from '../auth/session.repository.js';
import {
  findByIdempotencyKey,
  findVerification,
  insertDestinationLocation,
  insertVerification,
  listDestinationLocations,
  listVerifications,
  updateLoadStatus,
  updateTrip,
  type DestinationLocation,
  type VerificationRecord,
} from './verification.repository.js';

/** What the app sends to verify a vehicle. */
export interface VerifyInput {
  method: VerificationMethod;
  /** For method "plate": as typed or confirmed (normalised here). */
  plate?: string;
  /** For "qrCode" and "eTag": the reference read from the QR code. */
  reference?: string;
  /** For "rfid": the tag reference read by the reader. */
  tagReference?: string;
  /** Where the agent is: required for every verification (SRD §25). */
  location: GeoPoint;
  /** When the check was made, for records sent later from offline. */
  capturedAt?: Date;
  /** Set when the app replays a check made offline. */
  offline?: boolean;
  /** The same key on a retry returns the first result instead of a duplicate. */
  idempotencyKey?: string;
  device?: unknown;
}

export class VerificationService {
  constructor(
    private readonly dependencies: { database: Database; chl: ChlAdapter; now: () => Date },
  ) {}

  /**
   * Verifies a vehicle with CHL and records the attempt, whatever its
   * outcome. When CHL can't complete the check the attempt is recorded as
   * unavailable and the error is rethrown: a failure is never a result.
   */
  async verify(
    session: AgentSession,
    input: VerifyInput,
  ): Promise<{ verification: VerificationView; created: boolean }> {
    const { database, chl, now } = this.dependencies;
    const identifier = toIdentifier(input);
    if (input.idempotencyKey) {
      const earlier = await findByIdempotencyKey(database, session.agentId, input.idempotencyKey);
      if (earlier) return { verification: verificationView(earlier), created: false };
    }
    const processedIdentifier =
      identifier.method === 'plate'
        ? identifier.plate
        : identifier.method === 'qr'
          ? identifier.reference
          : identifier.tagReference;
    const checkedAt = input.capturedAt ?? now();

    const base = {
      reference: newReference('VRF', checkedAt),
      agentId: session.agentId,
      agentCode: session.agentCode,
      agentName: session.agentName,
      organization: session.organization,
      sessionId: session.id,
      method: input.method,
      processedIdentifier,
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      accuracyMetres: input.location.accuracyMetres,
      device: input.device,
      syncStatus: input.offline ? ('offline' as const) : ('live' as const),
      idempotencyKey: input.idempotencyKey,
      createdAt: checkedAt,
    };

    let answer: ChlVerification;
    try {
      answer = await chl.verifyVehicle(identifier, {
        agentId: session.agentId,
        location: input.location,
        at: checkedAt,
      });
    } catch (error) {
      if (error instanceof ChlUnavailableError) {
        // Without the key, so a retry asks CHL again instead of replaying this.
        const { record } = await insertVerification(database, {
          ...base,
          plate: identifier.method === 'plate' ? identifier.plate : undefined,
          idempotencyKey: undefined,
          outcome: 'unavailable',
        });
        throw new AppError(
          503,
          'CHL_UNAVAILABLE',
          'CHL verification could not be completed. Please retry when the service or ' +
            'connection is available.',
          { verificationId: record.id },
        );
      }
      throw error;
    }

    const result = resultView(answer);
    const found = answer.outcome === 'found' ? answer : null;
    const { record, created } = await insertVerification(database, {
      ...base,
      outcome: answer.outcome,
      plate: found?.vehicle.plate ?? (identifier.method === 'plate' ? identifier.plate : undefined),
      vehicleId: found?.vehicle.id,
      vehicleType: found?.vehicle.type,
      eTagStatus: found?.eTag.status,
      tripStatus: found?.trip.status,
      tripReference: result.trip?.current?.transactionReference,
      chlReference: found?.chlReference,
      result,
    });
    return { verification: verificationView(record), created };
  }

  /** The plates of several tags read together (SRD §9.6). */
  async resolveTags(tagReferences: string[]) {
    const resolutions = await this.dependencies.chl.resolveTags(tagReferences);
    return resolutions.map((resolution) => ({
      tagReference: resolution.tagReference,
      known: resolution.known,
      plate: resolution.plate ?? null,
    }));
  }

  /** Asks CHL for the vehicle's trip now and keeps it on the record. */
  async refreshTrip(session: AgentSession, id: string): Promise<TripCheckView> {
    const { database, chl } = this.dependencies;
    const record = await this.foundRecord(session, id);
    const trip = tripCheckView(await chl.refreshTrip(record.vehicleId));
    await updateTrip(database, record.id, trip);
    return trip;
  }

  /** Sends the agent's location for the destination check of the active trip. */
  async recordDestinationLocation(
    session: AgentSession,
    id: string,
    location: GeoPoint,
  ): Promise<DestinationLocation> {
    const { database, chl, now } = this.dependencies;
    const record = await this.foundRecord(session, id);
    const transactionReference = record.result?.trip?.current?.transactionReference;
    if (record.result?.trip?.status !== 'active' || !transactionReference) {
      throw new AppError(409, 'NO_ACTIVE_TRIP', 'This vehicle has no active trip to check.');
    }
    const recorded = await chl.recordDestinationLocation(transactionReference, location, {
      agentId: session.agentId,
      at: now(),
    });
    const stored: DestinationLocation = {
      latitude: recorded.latitude,
      longitude: recorded.longitude,
      accuracyMetres: recorded.accuracyMetres ?? null,
      completionDecision: recorded.completionDecision ?? null,
      recordedAt: recorded.recordedAt,
    };
    await insertDestinationLocation(database, record.id, transactionReference, stored);
    return stored;
  }

  /** Records whether a vehicle with no active trip is loaded or empty (SRD §13.4). */
  async recordLoadStatus(
    session: AgentSession,
    id: string,
    status: 'loaded' | 'empty',
    location: GeoPoint,
  ): Promise<{ status: 'loaded' | 'empty'; recordedAt: Date }> {
    const { database, chl, now } = this.dependencies;
    const record = await this.foundRecord(session, id);
    if (record.result?.trip?.status === 'active') {
      throw new AppError(409, 'TRIP_ACTIVE', 'This vehicle has an active trip.');
    }
    const at = now();
    await chl.recordLoadStatus(record.vehicleId, status, {
      agentId: session.agentId,
      location,
      at,
    });
    await updateLoadStatus(database, record.id, status, at);
    return { status, recordedAt: at };
  }

  async detail(session: AgentSession, id: string): Promise<VerificationDetailView> {
    const { database } = this.dependencies;
    const record = await this.ownRecord(session, id);
    const destinations = await listDestinationLocations(database, record.id);
    return {
      ...verificationView(record),
      agent: { id: record.agentCode, name: record.agentName, organization: record.organization },
      destinationLocations: destinations.map((location) => ({
        ...location,
        recordedAt: location.recordedAt.toISOString(),
      })),
    };
  }

  /** The agent's verifications, newest first; [period] "30d" or "all" (SRD §27). */
  async history(
    session: AgentSession,
    query: { period: '30d' | 'all'; limit: number; cursor?: string },
  ): Promise<Page<VerificationView>> {
    const { database, now } = this.dependencies;
    const since = query.period === '30d' ? new Date(now().getTime() - 30 * DAY_MS) : undefined;
    const records = await listVerifications(database, session.agentId, {
      limit: query.limit + 1,
      since,
      before: decodeCursor(query.cursor),
    });
    return toPage(records, query.limit, verificationView);
  }

  private async ownRecord(session: AgentSession, id: string): Promise<VerificationRecord> {
    if (!isUuid(id)) throw verificationNotFound();
    const record = await findVerification(this.dependencies.database, session.agentId, id);
    if (!record) throw verificationNotFound();
    return record;
  }

  /** The agent's record of a vehicle CHL found; actions need a known vehicle. */
  private async foundRecord(
    session: AgentSession,
    id: string,
  ): Promise<VerificationRecord & { vehicleId: string }> {
    const record = await this.ownRecord(session, id);
    const { vehicleId } = record;
    if (record.outcome !== 'found' || !vehicleId) {
      throw new AppError(409, 'NO_VEHICLE', 'This verification did not identify a vehicle.');
    }
    return { ...record, vehicleId };
  }
}

function toIdentifier(input: VerifyInput): ChlIdentifier {
  switch (input.method) {
    case 'plate': {
      const plate = input.plate === undefined ? null : parsePlate(input.plate);
      if (!plate) {
        throw new AppError(400, 'INVALID_PLATE', 'Enter a plate of 3 to 10 letters and digits.');
      }
      return { method: 'plate', plate };
    }
    case 'qrCode':
    case 'eTag': {
      const reference = input.reference?.trim();
      if (!reference) throw new AppError(400, 'VALIDATION_ERROR', 'The QR reference is missing.');
      return { method: 'qr', reference };
    }
    case 'rfid': {
      const tagReference = input.tagReference?.trim();
      if (!tagReference) {
        throw new AppError(400, 'VALIDATION_ERROR', 'The tag reference is missing.');
      }
      return { method: 'rfid', tagReference };
    }
  }
}

function verificationNotFound(): AppError {
  return new AppError(404, 'VERIFICATION_NOT_FOUND', 'No such verification.');
}
