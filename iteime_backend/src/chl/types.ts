/**
 * What the existing CHL backend gives iteime_backend, in our own terms. The
 * CHL adapter turns CHL's real responses into these, so nothing else in the
 * backend depends on CHL's formats. Section numbers refer to "CHL Backend API
 * Requirements - ITEIME Backend and Mobile MVP".
 */

/** A point on the map (WGS84). */
export interface GeoPoint {
  latitude: number;
  longitude: number;
  /** Radius within which the true position lies, in metres. */
  accuracyMetres?: number;
}

// ---------------------------------------------------------------- 3.1 Agents

export type ChlAccountStatus = 'active' | 'deactivated';

/** Where an agent's enforcement authority applies (SRD §4.1). */
export interface ChlEnforcementScope {
  level:
    | 'enforcementLocation'
    | 'enforcementZone'
    | 'ward'
    | 'lga'
    | 'state'
    | 'region'
    | 'subregion'
    | 'national';
  /** e.g. "Ikeja". */
  name: string;
}

/** A user of the CHL system, as CHL knows them. */
export interface ChlAgent {
  /** CHL's internal ID. */
  id: string;
  /** The ID shown on the agent's profile, e.g. "JRB-AG-0142". */
  agentId?: string;
  name: string;
  email: string;
  /** CHL's role name, e.g. "ENFORCEMENT_AGENT". */
  role: string;
  organization?: string;
  region?: string;
  assignment?: string;
  scope?: ChlEnforcementScope;
  status: ChlAccountStatus;
}

/** A signed-in session, when CHL issues the tokens. */
export interface ChlSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface ChlSignIn {
  agent: ChlAgent;
  session: ChlSession;
}

// ----------------------------------------------------------- 3.2 Verification

/** How the agent identified the vehicle, and what was read. */
export type ChlIdentifier =
  /** A plate number, already normalised (e.g. "ABC123AA"). */
  | { method: 'plate'; plate: string }
  /** The reference read from the QR code on the E-Tag. */
  | { method: 'qr'; reference: string }
  /** The reference read from an RFID haulage tag. Never shown to agents. */
  | { method: 'rfid'; tagReference: string };

/** Who verified, and where: sent with every verification (SRD §25, §28). */
export interface ChlVerificationContext {
  agentId: string;
  location: GeoPoint;
  at: Date;
}

export interface ChlVehicle {
  /** CHL's vehicle ID. */
  id: string;
  /** Normalised plate, e.g. "ABC123AA". */
  plate: string;
  /** e.g. "12/14 tyres and its equivalent". */
  type: string;
}

export type ChlETagStatus = 'valid' | 'invalid' | 'missing' | 'mismatch';

export interface ChlETagCheck {
  status: ChlETagStatus;
  /** For a mismatch: the plate the tag actually belongs to. */
  belongsToPlate?: string;
}

/** Where a CHL trip stands, as CHL reports it. */
export type ChlTripState = 'active' | 'completed' | 'expired';

/** A CHL trip, with the receipt details CHL holds (section 3.3). */
export interface ChlTrip {
  transactionReference: string;
  startedAt: Date;
  /** The transaction (payment) date. */
  paidAt: Date;
  /** The trip type, e.g. "Complete Leg". */
  transactionType: string;
  /** e.g. "Successful". */
  transactionStatus: string;
  originState: string;
  originLga: string;
  destinationState: string;
  destinationLga: string;
  state: ChlTripState;
  /** "Trip will close on": drives the validity countdown. */
  validUntil: Date;
  completedAt?: Date;
  paymentReference?: string;
  terminalId?: string;
  contactNumber?: string;
  channel?: string;
  channelType?: string;
  cargo?: string;
}

/** How CHL checks an active trip against its destination (section 3.4). */
export interface ChlDestinationCheck {
  enforcementPoint: string;
  completionDecision: string;
  /** The delay CHL applies before deciding, set centrally. */
  centralDelaySeconds: number;
}

/** A vehicle's CHL trip situation, as CHL decides it (section 4). */
export type ChlTripCheck =
  | { status: 'active'; trip: ChlTrip; destinationCheck?: ChlDestinationCheck }
  /** No active trip; [lastTrip] is the most recent one, when CHL has it. */
  | { status: 'noActive'; lastTrip?: ChlTrip }
  /** The vehicle has never made a CHL trip. */
  | { status: 'noHistory' }
  /** Only an earlier trip that is no longer current. */
  | { status: 'expired'; lastTrip: ChlTrip };

/**
 * What CHL found for an identifier. A service failure is never one of these:
 * it is thrown as a ChlUnavailableError, so it can't be mistaken for a
 * negative result (SRD §15, §26.2).
 */
export type ChlVerification =
  | {
      outcome: 'found';
      vehicle: ChlVehicle;
      eTag: ChlETagCheck;
      trip: ChlTripCheck;
      /** CHL's own reference for this verification, if it keeps one. */
      chlReference?: string;
    }
  /** The plate, QR code or tag doesn't resolve to a vehicle. */
  | { outcome: 'vehicleNotFound' }
  /** The tag is not part of the JRB CHL architecture (SRD §9.7, §13.2). */
  | { outcome: 'unknownTag' };

/** One tag of several read together, resolved by CHL (SRD §9.6). */
export interface ChlTagResolution {
  tagReference: string;
  /** The vehicle's plate; absent for a tag CHL doesn't know. */
  plate?: string;
  known: boolean;
}

// ------------------------------------------------- 3.4 Destination, 3.5 Load

export interface ChlRecordedLocation extends GeoPoint {
  recordedAt: Date;
  /** CHL's updated decision, if it changed. */
  completionDecision?: string;
}

export type ChlLoadStatus = 'loaded' | 'empty';

// ------------------------------------------------------------- 3.6 E-Tags

export type ChlTagLifecycle = 'active' | 'damaged' | 'notPickedUp' | 'replaced';

/** The receipt CHL holds for an E-Tag. Fields to be confirmed by CHL. */
export interface ChlETagReceipt {
  eTagReference: string;
  plate: string;
  status: ChlTagLifecycle;
  issuedAt?: Date;
  installedAt?: Date;
  /** Any other receipt fields CHL returns, as given. */
  details: Record<string, string>;
}

// ------------------------------------------------------- 3.7 Reference data

export interface ChlEnforcementPoint {
  id: string;
  name: string;
  state: string;
  lga: string;
  location?: GeoPoint;
}

export interface ChlReferenceData {
  states: { name: string; lgas: string[] }[];
  vehicleTypes: string[];
  enforcementPoints: ChlEnforcementPoint[];
}
