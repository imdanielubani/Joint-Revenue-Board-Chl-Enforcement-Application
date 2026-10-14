import type {
  ChlDestinationCheck,
  ChlETagCheck,
  ChlTrip,
  ChlTripCheck,
  ChlVehicle,
  ChlVerification,
} from '../../integrations/chl/types.js';
import type { VerificationRecord } from './verification.repository.js';

/**
 * What the mobile app is shown about a vehicle, built from CHL's answer.
 * Dates are ISO 8601 strings; CHL's internal IDs and the raw identifier read
 * (plate typed, QR or tag reference) are never included.
 */

export type VerificationMethod = 'plate' | 'qrCode' | 'eTag' | 'rfid';
export type VerificationOutcome = 'found' | 'vehicleNotFound' | 'unknownTag' | 'unavailable';

export interface TripView {
  transactionReference: string;
  startedAt: string;
  transactionDate: string;
  transactionType: string;
  transactionStatus: string;
  originState: string;
  originLga: string;
  destinationState: string;
  destinationLga: string;
  status: ChlTrip['state'];
  validUntil: string;
  completedAt: string | null;
  paymentReference: string | null;
  terminalId: string | null;
  contactNumber: string | null;
  channel: string | null;
  channelType: string | null;
  cargo: string | null;
}

export interface TripCheckView {
  status: ChlTripCheck['status'];
  /** The active trip. */
  current: TripView | null;
  /** The most recent earlier trip, when there is no active one. */
  last: TripView | null;
  destinationCheck: ChlDestinationCheck | null;
}

/** The vehicle, E-Tag and trip part of a verification (stored as JSON). */
export interface ResultView {
  vehicle: { plate: string; type: string } | null;
  eTag: { status: ChlETagCheck['status']; belongsToPlate: string | null } | null;
  trip: TripCheckView | null;
}

export function tripView(trip: ChlTrip): TripView {
  return {
    transactionReference: trip.transactionReference,
    startedAt: trip.startedAt.toISOString(),
    transactionDate: trip.paidAt.toISOString(),
    transactionType: trip.transactionType,
    transactionStatus: trip.transactionStatus,
    originState: trip.originState,
    originLga: trip.originLga,
    destinationState: trip.destinationState,
    destinationLga: trip.destinationLga,
    status: trip.state,
    validUntil: trip.validUntil.toISOString(),
    completedAt: trip.completedAt?.toISOString() ?? null,
    paymentReference: trip.paymentReference ?? null,
    terminalId: trip.terminalId ?? null,
    contactNumber: trip.contactNumber ?? null,
    channel: trip.channel ?? null,
    channelType: trip.channelType ?? null,
    cargo: trip.cargo ?? null,
  };
}

export function tripCheckView(check: ChlTripCheck): TripCheckView {
  switch (check.status) {
    case 'active':
      return {
        status: 'active',
        current: tripView(check.trip),
        last: null,
        destinationCheck: check.destinationCheck ?? null,
      };
    case 'noActive':
      return {
        status: 'noActive',
        current: null,
        last: check.lastTrip ? tripView(check.lastTrip) : null,
        destinationCheck: null,
      };
    case 'noHistory':
      return { status: 'noHistory', current: null, last: null, destinationCheck: null };
    case 'expired':
      return {
        status: 'expired',
        current: null,
        last: tripView(check.lastTrip),
        destinationCheck: null,
      };
  }
}

function vehicleView(vehicle: ChlVehicle): ResultView['vehicle'] {
  return { plate: vehicle.plate, type: vehicle.type };
}

/** The part of CHL's answer the app is shown. */
export function resultView(verification: ChlVerification): ResultView {
  if (verification.outcome !== 'found') return { vehicle: null, eTag: null, trip: null };
  return {
    vehicle: vehicleView(verification.vehicle),
    eTag: {
      status: verification.eTag.status,
      belongsToPlate: verification.eTag.belongsToPlate ?? null,
    },
    trip: tripCheckView(verification.trip),
  };
}

// ------------------------------------------------- Stored verifications

/** A verification as the app is shown it. */
export interface VerificationView extends ResultView {
  id: string;
  reference: string;
  method: VerificationMethod;
  outcome: VerificationRecord['outcome'];
  /** The vehicle's plate, or the plate typed when CHL didn't identify one. */
  plate: string | null;
  /** False only when CHL could not complete the check. */
  completed: boolean;
  checkedAt: string;
  syncStatus: 'live' | 'offline';
  location: { latitude: number; longitude: number; accuracyMetres: number | null };
  loadStatus: { status: 'loaded' | 'empty'; recordedAt: string } | null;
}

export interface VerificationDetailView extends VerificationView {
  agent: { id: string | null; name: string; organization: string | null };
  destinationLocations: {
    latitude: number;
    longitude: number;
    accuracyMetres: number | null;
    completionDecision: string | null;
    recordedAt: string;
  }[];
}

export function verificationView(record: VerificationRecord): VerificationView {
  return {
    id: record.id,
    reference: record.reference,
    method: record.method,
    outcome: record.outcome,
    plate: record.result?.vehicle?.plate ?? record.plate,
    completed: record.outcome !== 'unavailable',
    checkedAt: record.createdAt.toISOString(),
    syncStatus: record.syncStatus,
    vehicle: record.result?.vehicle ?? null,
    eTag: record.result?.eTag ?? null,
    trip: record.result?.trip ?? null,
    location: {
      latitude: record.latitude,
      longitude: record.longitude,
      accuracyMetres: record.accuracyMetres,
    },
    loadStatus:
      record.loadStatus && record.loadStatusAt
        ? { status: record.loadStatus, recordedAt: record.loadStatusAt.toISOString() }
        : null,
  };
}
