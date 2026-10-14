import type { Queryable } from '../db/pool.js';
import type {
  ResultView,
  TripCheckView,
  VerificationMethod,
  VerificationOutcome,
} from '../domain/verification-view.js';

/** A stored verification attempt. */
export interface VerificationRecord {
  id: string;
  reference: string;
  agentId: string;
  agentCode: string | null;
  agentName: string;
  organization: string | null;
  method: VerificationMethod;
  outcome: VerificationOutcome;
  plate: string | null;
  vehicleId: string | null;
  result: ResultView | null;
  latitude: number;
  longitude: number;
  accuracyMetres: number | null;
  syncStatus: 'live' | 'offline';
  loadStatus: 'loaded' | 'empty' | null;
  loadStatusAt: Date | null;
  createdAt: Date;
}

export interface NewVerification {
  reference: string;
  agentId: string;
  agentCode: string | null;
  agentName: string;
  organization: string | null;
  sessionId: string;
  method: VerificationMethod;
  processedIdentifier: string;
  outcome: VerificationOutcome;
  plate?: string;
  vehicleId?: string;
  vehicleType?: string;
  eTagStatus?: string;
  tripStatus?: string;
  tripReference?: string;
  chlReference?: string;
  result?: ResultView;
  latitude: number;
  longitude: number;
  accuracyMetres?: number;
  device?: unknown;
  syncStatus: 'live' | 'offline';
  idempotencyKey?: string;
  createdAt: Date;
}

interface VerificationRow {
  id: string;
  reference: string;
  agent_id: string;
  agent_code: string | null;
  agent_name: string;
  organization: string | null;
  method: VerificationMethod;
  outcome: VerificationOutcome;
  plate: string | null;
  vehicle_id: string | null;
  result: ResultView | null;
  latitude: number;
  longitude: number;
  accuracy_metres: number | null;
  sync_status: 'live' | 'offline';
  load_status: 'loaded' | 'empty' | null;
  load_status_at: Date | null;
  created_at: Date;
}

const columns = `id, reference, agent_id, agent_code, agent_name, organization, method, outcome,
  plate, vehicle_id, result, latitude, longitude, accuracy_metres, sync_status, load_status,
  load_status_at, created_at`;

function toRecord(row: VerificationRow): VerificationRecord {
  return {
    id: row.id,
    reference: row.reference,
    agentId: row.agent_id,
    agentCode: row.agent_code,
    agentName: row.agent_name,
    organization: row.organization,
    method: row.method,
    outcome: row.outcome,
    plate: row.plate,
    vehicleId: row.vehicle_id,
    result: row.result,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracyMetres: row.accuracy_metres,
    syncStatus: row.sync_status,
    loadStatus: row.load_status,
    loadStatusAt: row.load_status_at,
    createdAt: row.created_at,
  };
}

/**
 * Stores an attempt. With an [idempotencyKey] the agent already used, stores
 * nothing and returns the earlier record instead, so a retried request (e.g.
 * offline sync) never creates a duplicate.
 */
export async function insertVerification(
  db: Queryable,
  verification: NewVerification,
): Promise<{ record: VerificationRecord; created: boolean }> {
  const { rows } = await db.query<VerificationRow>(
    `INSERT INTO verifications (reference, agent_id, agent_code, agent_name, organization,
       session_id, method, processed_identifier, outcome, plate, vehicle_id, vehicle_type,
       etag_status, trip_status, trip_reference, chl_reference, result, latitude, longitude,
       accuracy_metres, device, sync_status, idempotency_key, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
       $19, $20, $21, $22, $23, $24, $24)
     ON CONFLICT (agent_id, idempotency_key) DO NOTHING
     RETURNING ${columns}`,
    [
      verification.reference,
      verification.agentId,
      verification.agentCode,
      verification.agentName,
      verification.organization,
      verification.sessionId,
      verification.method,
      verification.processedIdentifier,
      verification.outcome,
      verification.plate ?? null,
      verification.vehicleId ?? null,
      verification.vehicleType ?? null,
      verification.eTagStatus ?? null,
      verification.tripStatus ?? null,
      verification.tripReference ?? null,
      verification.chlReference ?? null,
      verification.result ? JSON.stringify(verification.result) : null,
      verification.latitude,
      verification.longitude,
      verification.accuracyMetres ?? null,
      verification.device === undefined ? null : JSON.stringify(verification.device),
      verification.syncStatus,
      verification.idempotencyKey ?? null,
      verification.createdAt,
    ],
  );
  if (rows[0]) return { record: toRecord(rows[0]), created: true };

  const existing = await findByIdempotencyKey(
    db,
    verification.agentId,
    verification.idempotencyKey ?? '',
  );
  if (!existing) throw new Error('Verification was neither stored nor found.');
  return { record: existing, created: false };
}

export async function findByIdempotencyKey(
  db: Queryable,
  agentId: string,
  idempotencyKey: string,
): Promise<VerificationRecord | null> {
  const { rows } = await db.query<VerificationRow>(
    `SELECT ${columns} FROM verifications WHERE agent_id = $1 AND idempotency_key = $2`,
    [agentId, idempotencyKey],
  );
  return rows[0] ? toRecord(rows[0]) : null;
}

/** One of an agent's own verifications; other agents' are never returned. */
export async function findVerification(
  db: Queryable,
  agentId: string,
  id: string,
): Promise<VerificationRecord | null> {
  const { rows } = await db.query<VerificationRow>(
    `SELECT ${columns} FROM verifications WHERE agent_id = $1 AND id = $2`,
    [agentId, id],
  );
  return rows[0] ? toRecord(rows[0]) : null;
}

/** Stores a refreshed trip on the record. */
export async function updateTrip(db: Queryable, id: string, trip: TripCheckView): Promise<void> {
  await db.query(
    `UPDATE verifications
     SET result = jsonb_set(result, '{trip}', $2::jsonb),
         trip_status = $3,
         trip_reference = $4,
         updated_at = now()
     WHERE id = $1`,
    [id, JSON.stringify(trip), trip.status, trip.current?.transactionReference ?? null],
  );
}

export async function updateLoadStatus(
  db: Queryable,
  id: string,
  status: 'loaded' | 'empty',
  at: Date,
): Promise<void> {
  await db.query(
    `UPDATE verifications SET load_status = $2, load_status_at = $3, updated_at = now()
     WHERE id = $1`,
    [id, status, at],
  );
}

export interface DestinationLocation {
  latitude: number;
  longitude: number;
  accuracyMetres: number | null;
  completionDecision: string | null;
  recordedAt: Date;
}

export async function insertDestinationLocation(
  db: Queryable,
  verificationId: string,
  transactionReference: string,
  location: DestinationLocation,
): Promise<void> {
  await db.query(
    `INSERT INTO destination_locations (verification_id, transaction_reference, latitude,
       longitude, accuracy_metres, completion_decision, recorded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      verificationId,
      transactionReference,
      location.latitude,
      location.longitude,
      location.accuracyMetres,
      location.completionDecision,
      location.recordedAt,
    ],
  );
}

export async function listDestinationLocations(
  db: Queryable,
  verificationId: string,
): Promise<DestinationLocation[]> {
  const { rows } = await db.query<{
    latitude: number;
    longitude: number;
    accuracy_metres: number | null;
    completion_decision: string | null;
    recorded_at: Date;
  }>(
    `SELECT latitude, longitude, accuracy_metres, completion_decision, recorded_at
     FROM destination_locations WHERE verification_id = $1 ORDER BY recorded_at`,
    [verificationId],
  );
  return rows.map((row) => ({
    latitude: row.latitude,
    longitude: row.longitude,
    accuracyMetres: row.accuracy_metres,
    completionDecision: row.completion_decision,
    recordedAt: row.recorded_at,
  }));
}

/** A page of an agent's verifications, newest first. */
export async function listVerifications(
  db: Queryable,
  agentId: string,
  page: { limit: number; since?: Date; before?: { createdAt: Date; id: string } },
): Promise<VerificationRecord[]> {
  const { rows } = await db.query<VerificationRow>(
    `SELECT ${columns} FROM verifications
     WHERE agent_id = $1
       AND ($2::timestamptz IS NULL OR created_at >= $2)
       AND ($3::timestamptz IS NULL OR (created_at, id) < ($3, $4::uuid))
     ORDER BY created_at DESC, id DESC
     LIMIT $5`,
    [
      agentId,
      page.since ?? null,
      page.before?.createdAt ?? null,
      page.before?.id ?? null,
      page.limit,
    ],
  );
  return rows.map(toRecord);
}

/** An agent's verification counts between [from] and [to]. */
export async function countVerifications(
  db: Queryable,
  agentId: string,
  from: Date,
  to: Date,
): Promise<{ total: number; activeTrips: number; noActiveTrips: number }> {
  const { rows } = await db.query<{ total: string; active: string; no_active: string }>(
    `SELECT count(*) AS total,
       count(*) FILTER (WHERE trip_status = 'active') AS active,
       count(*) FILTER (WHERE trip_status IN ('noActive', 'noHistory', 'expired')) AS no_active
     FROM verifications
     WHERE agent_id = $1 AND created_at >= $2 AND created_at < $3`,
    [agentId, from, to],
  );
  const row = rows[0];
  return {
    total: Number(row?.total ?? 0),
    activeTrips: Number(row?.active ?? 0),
    noActiveTrips: Number(row?.no_active ?? 0),
  };
}
