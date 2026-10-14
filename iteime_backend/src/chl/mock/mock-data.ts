import type {
  ChlAgent,
  ChlETagCheck,
  ChlReferenceData,
  ChlTrip,
  ChlTripCheck,
  ChlVehicle,
} from '../types.js';

/**
 * The sample CHL world the mock adapter answers from. It covers every result
 * the mobile app shows, and matches the app's own demo mode where they
 * overlap (ABC 123 AA, LND 482 XK, AAA 000 AA, AAA 001 AA, AAA 503 AA).
 */

/** Every sample account's password. */
export const MOCK_PASSWORD = 'Demo@2026';

export interface MockAccount {
  agent: ChlAgent;
  password: string;
}

export const mockAccounts: MockAccount[] = [
  {
    password: MOCK_PASSWORD,
    agent: {
      id: 'agt-0142',
      agentId: 'JRB-AG-0142',
      name: 'Demo Officer',
      email: 'officer@jbr.com',
      role: 'ENFORCEMENT_AGENT',
      organization: 'Joint Revenue Board',
      region: 'Lagos',
      assignment: 'Ikeja enforcement point',
      scope: { level: 'lga', name: 'Ikeja' },
      status: 'active',
    },
  },
  {
    password: MOCK_PASSWORD,
    agent: {
      id: 'agt-0099',
      agentId: 'JRB-AG-0099',
      name: 'Former Officer',
      email: 'deactivated@jbr.com',
      role: 'ENFORCEMENT_AGENT',
      organization: 'Joint Revenue Board',
      region: 'Ogun',
      status: 'deactivated',
    },
  },
  {
    password: MOCK_PASSWORD,
    agent: {
      id: 'usr-0007',
      name: 'Records Clerk',
      email: 'clerk@jbr.com',
      role: 'CLERK',
      organization: 'Joint Revenue Board',
      status: 'active',
    },
  },
];

/** Identifiers that make the mock behave like a failing CHL. */
export const MOCK_UNAVAILABLE = {
  plate: 'AAA503AA',
  qrReference: 'JRB-QR-0503',
  tagReference: 'E20000172211014418900503',
} as const;

/** Identifiers CHL knows nothing about. */
export const MOCK_NOT_FOUND = {
  plate: 'AAA000AA',
  qrReference: 'JRB-QR-0404',
} as const;

/** A tag that is not part of the JRB CHL architecture (a retail EPC). */
export const MOCK_FOREIGN_TAG = '3034257BF7194E4000000001';

export interface MockVehicle {
  vehicle: ChlVehicle;
  eTag: ChlETagCheck;
  /** The RFID tag on it, if any. */
  tagReference?: string;
  /** The reference in its E-Tag's QR code, if any. */
  qrReference?: string;
  /** Its trip situation at [now]. */
  trip: (now: Date) => ChlTripCheck;
}

const hours = (count: number) => count * 60 * 60 * 1000;
const minutes = (count: number) => count * 60 * 1000;
const shift = (from: Date, by: number) => new Date(from.getTime() + by);

/** The receipt details every sample trip shares. */
const receipt = {
  transactionType: 'Complete Leg',
  transactionStatus: 'Successful',
  originState: 'Ogun',
  originLga: 'Abeokuta South',
  destinationState: 'Lagos',
  destinationLga: 'Ikeja',
  terminalId: '2070MJHU',
  contactNumber: '8139751699',
  channel: 'Fortis',
  channelType: 'POS',
  cargo: 'General haulage',
} as const;

function activeTrip(now: Date): ChlTrip {
  const startedAt = shift(now, -hours(2) - minutes(8));
  return {
    ...receipt,
    transactionReference: '564031956608',
    paymentReference: 'PAY-2026-08142',
    startedAt,
    paidAt: shift(startedAt, -minutes(6)),
    state: 'active',
    validUntil: shift(now, hours(4) + minutes(21) + 2_000),
  };
}

function completedTrip(now: Date): ChlTrip {
  const startedAt = shift(now, -hours(32));
  return {
    ...receipt,
    transactionReference: '564031950271',
    paymentReference: 'PAY-2026-07960',
    startedAt,
    paidAt: shift(startedAt, -minutes(6)),
    state: 'completed',
    validUntil: shift(startedAt, hours(12)),
    completedAt: shift(startedAt, hours(5) + minutes(17)),
  };
}

function expiredTrip(now: Date): ChlTrip {
  const startedAt = shift(now, -hours(72));
  return {
    ...receipt,
    transactionReference: '564031941180',
    paymentReference: 'PAY-2026-07211',
    startedAt,
    paidAt: shift(startedAt, -minutes(4)),
    state: 'expired',
    validUntil: shift(startedAt, hours(12)),
  };
}

const heavyGoods = '12/14 tyres and its equivalent';

export const mockVehicles: MockVehicle[] = [
  // Active trip, valid E-Tag.
  {
    vehicle: { id: 'veh-abc', plate: 'ABC123AA', type: heavyGoods },
    eTag: { status: 'valid' },
    tagReference: 'E2000017221101441890ABC1',
    qrReference: 'JRB-QR-0001',
    trip: (now) => ({
      status: 'active',
      trip: activeTrip(now),
      destinationCheck: {
        enforcementPoint: 'Ikeja enforcement point',
        completionDecision: 'Awaiting central validation',
        centralDelaySeconds: 900,
      },
    }),
  },
  // No active trip, a completed last trip; invalid E-Tag.
  {
    vehicle: { id: 'veh-lnd', plate: 'LND482XK', type: heavyGoods },
    eTag: { status: 'invalid' },
    tagReference: 'E2000017221101441890D482',
    qrReference: 'JRB-QR-0002',
    trip: (now) => ({ status: 'noActive', lastTrip: completedTrip(now) }),
  },
  // Never made a CHL trip.
  {
    vehicle: { id: 'veh-nth', plate: 'AAA001AA', type: heavyGoods },
    eTag: { status: 'valid' },
    tagReference: 'E2000017221101441890A001',
    qrReference: 'JRB-QR-0003',
    trip: () => ({ status: 'noHistory' }),
  },
  // Only an expired trip.
  {
    vehicle: { id: 'veh-exp', plate: 'EXP900AA', type: heavyGoods },
    eTag: { status: 'valid' },
    tagReference: 'E2000017221101441890E900',
    qrReference: 'JRB-QR-0004',
    trip: (now) => ({ status: 'expired', lastTrip: expiredTrip(now) }),
  },
  // No E-Tag on the vehicle.
  {
    vehicle: { id: 'veh-ntg', plate: 'KTG100AA', type: heavyGoods },
    eTag: { status: 'missing' },
    trip: () => ({ status: 'noActive' }),
  },
  // Carrying another vehicle's tag.
  {
    vehicle: { id: 'veh-mis', plate: 'KJA555MM', type: heavyGoods },
    eTag: { status: 'mismatch', belongsToPlate: 'LND482XK' },
    trip: () => ({ status: 'noActive' }),
  },
];

export const mockReferenceData: ChlReferenceData = {
  states: [
    { name: 'Lagos', lgas: ['Ikeja', 'Eti-Osa', 'Alimosho', 'Apapa'] },
    { name: 'Ogun', lgas: ['Abeokuta South', 'Abeokuta North', 'Ado-Odo/Ota'] },
    { name: 'Kano', lgas: ['Albasu', 'Nassarawa', 'Tarauni'] },
  ],
  vehicleTypes: [heavyGoods, '6 tyres and its equivalent', '10 tyres and its equivalent'],
  enforcementPoints: [
    {
      id: 'ep-ikeja',
      name: 'Ikeja enforcement point',
      state: 'Lagos',
      lga: 'Ikeja',
      location: { latitude: 6.6018, longitude: 3.3515 },
    },
    {
      id: 'ep-abeokuta',
      name: 'Abeokuta South enforcement point',
      state: 'Ogun',
      lga: 'Abeokuta South',
      location: { latitude: 7.1475, longitude: 3.3619 },
    },
  ],
};
