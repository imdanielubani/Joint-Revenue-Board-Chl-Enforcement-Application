import { describe, expect, it } from 'vitest';

import {
  ChlAccountDeactivatedError,
  ChlInvalidCredentialsError,
  ChlNotFoundError,
  ChlSessionExpiredError,
  ChlUnavailableError,
} from '../../src/chl/errors.js';
import { MOCK_FOREIGN_TAG, MOCK_PASSWORD } from '../../src/chl/mock/mock-data.js';
import { MockChlAdapter } from '../../src/chl/mock/mock-adapter.js';
import type { ChlVerification, ChlVerificationContext } from '../../src/chl/types.js';

const now = new Date('2026-10-14T09:30:00+01:00');
const context: ChlVerificationContext = {
  agentId: 'agt-0142',
  location: { latitude: 6.6018, longitude: 3.3515, accuracyMetres: 12 },
  at: now,
};

function adapter(options: ConstructorParameters<typeof MockChlAdapter>[0] = {}) {
  return new MockChlAdapter({ now: () => now, ...options });
}

function found(verification: ChlVerification) {
  if (verification.outcome !== 'found')
    throw new Error(`Expected found, got ${verification.outcome}`);
  return verification;
}

describe('MockChlAdapter: agents (3.1)', () => {
  it('signs in an active agent with a 24-hour session', async () => {
    const { agent, session } = await adapter().signIn(' Officer@JBR.com ', MOCK_PASSWORD);
    expect(agent).toMatchObject({
      id: 'agt-0142',
      agentId: 'JRB-AG-0142',
      name: 'Demo Officer',
      role: 'ENFORCEMENT_AGENT',
      status: 'active',
    });
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    expect(session.expiresAt.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('rejects a wrong password and an unknown email alike', async () => {
    const chl = adapter();
    await expect(chl.signIn('officer@jbr.com', 'wrong')).rejects.toBeInstanceOf(
      ChlInvalidCredentialsError,
    );
    await expect(chl.signIn('nobody@jbr.com', MOCK_PASSWORD)).rejects.toBeInstanceOf(
      ChlInvalidCredentialsError,
    );
  });

  it('refuses a deactivated account', async () => {
    await expect(adapter().signIn('deactivated@jbr.com', MOCK_PASSWORD)).rejects.toBeInstanceOf(
      ChlAccountDeactivatedError,
    );
  });

  it('returns a non-agent with its CHL role (the backend decides access)', async () => {
    const { agent } = await adapter().signIn('clerk@jbr.com', MOCK_PASSWORD);
    expect(agent.role).toBe('CLERK');
  });

  it('refreshes a session once, then refuses the old refresh token', async () => {
    const chl = adapter();
    const { session } = await chl.signIn('officer@jbr.com', MOCK_PASSWORD);
    const renewed = await chl.refreshSession(session.refreshToken!);
    expect(renewed.accessToken).not.toBe(session.accessToken);
    await expect(chl.refreshSession(session.refreshToken!)).rejects.toBeInstanceOf(
      ChlSessionExpiredError,
    );
    await expect(chl.refreshSession('made-up')).rejects.toBeInstanceOf(ChlSessionExpiredError);
  });

  it('accepts a password reset for any email, so accounts cannot be discovered', async () => {
    const chl = adapter();
    await chl.requestPasswordReset('Officer@jbr.com');
    await chl.requestPasswordReset('nobody@jbr.com');
    expect(chl.passwordResets).toEqual(['officer@jbr.com', 'nobody@jbr.com']);
  });

  it('gives an agent profile and account status', async () => {
    const chl = adapter();
    expect((await chl.getAgent('agt-0142')).email).toBe('officer@jbr.com');
    expect(await chl.getAccountStatus('agt-0099')).toBe('deactivated');
    await expect(chl.getAgent('nobody')).rejects.toBeInstanceOf(ChlNotFoundError);
  });
});

describe('MockChlAdapter: verification (3.2, section 4)', () => {
  it('ABC 123 AA: active trip, valid E-Tag, destination check', async () => {
    const result = found(
      await adapter().verifyVehicle({ method: 'plate', plate: 'ABC123AA' }, context),
    );
    expect(result.vehicle).toEqual({
      id: 'veh-abc',
      plate: 'ABC123AA',
      type: '12/14 tyres and its equivalent',
    });
    expect(result.eTag).toEqual({ status: 'valid' });
    expect(result.chlReference).toMatch(/^CHL-VRF-/);
    if (result.trip.status !== 'active') throw new Error('expected an active trip');
    expect(result.trip.trip).toMatchObject({
      transactionReference: '564031956608',
      transactionType: 'Complete Leg',
      transactionStatus: 'Successful',
      originState: 'Ogun',
      destinationLga: 'Ikeja',
      state: 'active',
      terminalId: '2070MJHU',
      channel: 'Fortis',
      channelType: 'POS',
    });
    expect(result.trip.trip.validUntil.getTime() - now.getTime()).toBe(
      (4 * 60 * 60 + 21 * 60 + 2) * 1000,
    );
    expect(result.trip.destinationCheck).toEqual({
      enforcementPoint: 'Ikeja enforcement point',
      completionDecision: 'Awaiting central validation',
      centralDelaySeconds: 900,
    });
  });

  it('LND 482 XK: no active trip, a completed last trip, invalid E-Tag', async () => {
    const result = found(
      await adapter().verifyVehicle({ method: 'plate', plate: 'LND482XK' }, context),
    );
    expect(result.eTag.status).toBe('invalid');
    if (result.trip.status !== 'noActive') throw new Error('expected no active trip');
    expect(result.trip.lastTrip).toMatchObject({
      state: 'completed',
      transactionReference: '564031950271',
    });
    expect(result.trip.lastTrip!.completedAt!.getTime()).toBeLessThan(now.getTime());
  });

  it.each([
    ['AAA001AA', 'noHistory'],
    ['EXP900AA', 'expired'],
  ])('%s: trip status %s', async (plate, status) => {
    const result = found(await adapter().verifyVehicle({ method: 'plate', plate }, context));
    expect(result.trip.status).toBe(status);
  });

  it("a vehicle with no E-Tag, and one carrying another vehicle's tag", async () => {
    const chl = adapter();
    const missing = found(await chl.verifyVehicle({ method: 'plate', plate: 'KTG100AA' }, context));
    expect(missing.eTag).toEqual({ status: 'missing' });
    const mismatch = found(
      await chl.verifyVehicle({ method: 'plate', plate: 'KJA555MM' }, context),
    );
    expect(mismatch.eTag).toEqual({ status: 'mismatch', belongsToPlate: 'LND482XK' });
  });

  it('an unknown plate is not found; AAA 503 AA makes CHL unavailable', async () => {
    const chl = adapter();
    expect(await chl.verifyVehicle({ method: 'plate', plate: 'AAA000AA' }, context)).toEqual({
      outcome: 'vehicleNotFound',
    });
    await expect(
      chl.verifyVehicle({ method: 'plate', plate: 'AAA503AA' }, context),
    ).rejects.toBeInstanceOf(ChlUnavailableError);
  });

  it('QR references resolve to their vehicles', async () => {
    const chl = adapter();
    const result = found(
      await chl.verifyVehicle({ method: 'qr', reference: ' jrb-qr-0001 ' }, context),
    );
    expect(result.vehicle.plate).toBe('ABC123AA');
    expect(await chl.verifyVehicle({ method: 'qr', reference: 'JRB-QR-0404' }, context)).toEqual({
      outcome: 'vehicleNotFound',
    });
    await expect(
      chl.verifyVehicle({ method: 'qr', reference: 'JRB-QR-0503' }, context),
    ).rejects.toBeInstanceOf(ChlUnavailableError);
  });

  it('RFID tags resolve to their vehicles; foreign tags are unknown', async () => {
    const chl = adapter();
    const result = found(
      await chl.verifyVehicle(
        { method: 'rfid', tagReference: 'e2000017221101441890d482' },
        context,
      ),
    );
    expect(result.vehicle.plate).toBe('LND482XK');
    expect(
      await chl.verifyVehicle({ method: 'rfid', tagReference: MOCK_FOREIGN_TAG }, context),
    ).toEqual({
      outcome: 'unknownTag',
    });
    await expect(
      chl.verifyVehicle({ method: 'rfid', tagReference: 'E20000172211014418900503' }, context),
    ).rejects.toBeInstanceOf(ChlUnavailableError);
  });

  it('resolves several tags at once (SRD §9.6)', async () => {
    expect(
      await adapter().resolveTags([
        'E2000017221101441890ABC1',
        'E2000017221101441890D482',
        MOCK_FOREIGN_TAG,
      ]),
    ).toEqual([
      { tagReference: 'E2000017221101441890ABC1', plate: 'ABC123AA', known: true },
      { tagReference: 'E2000017221101441890D482', plate: 'LND482XK', known: true },
      { tagReference: MOCK_FOREIGN_TAG, known: false },
    ]);
  });
});

describe('MockChlAdapter: trips, destination, load, E-Tags, reference data', () => {
  it('refreshes a trip; an unknown vehicle is not found', async () => {
    const chl = adapter();
    expect((await chl.refreshTrip('veh-abc')).status).toBe('active');
    await expect(chl.refreshTrip('veh-nope')).rejects.toBeInstanceOf(ChlNotFoundError);
  });

  it('records a destination location for an active trip only', async () => {
    const chl = adapter();
    const recorded = await chl.recordDestinationLocation(
      '564031956608',
      { latitude: 6.6, longitude: 3.35, accuracyMetres: 9 },
      { agentId: 'agt-0142', at: now },
    );
    expect(recorded).toEqual({
      latitude: 6.6,
      longitude: 3.35,
      accuracyMetres: 9,
      recordedAt: now,
    });
    await expect(
      chl.recordDestinationLocation(
        '564031950271',
        { latitude: 1, longitude: 1 },
        { agentId: 'a', at: now },
      ),
    ).rejects.toBeInstanceOf(ChlNotFoundError);
  });

  it('records Loaded / Empty for a known vehicle', async () => {
    const chl = adapter();
    await chl.recordLoadStatus('veh-lnd', 'loaded', context);
    expect(chl.loadRecords).toEqual([{ vehicleId: 'veh-lnd', status: 'loaded', context }]);
    await expect(chl.recordLoadStatus('veh-nope', 'empty', context)).rejects.toBeInstanceOf(
      ChlNotFoundError,
    );
  });

  it('gives an E-Tag receipt, or null for an unknown E-Tag', async () => {
    const chl = adapter();
    expect(await chl.getETagReceipt('jrb-qr-0002')).toMatchObject({
      eTagReference: 'JRB-QR-0002',
      plate: 'LND482XK',
      status: 'active',
    });
    expect(await chl.getETagReceipt('JRB-QR-9999')).toBeNull();
  });

  it('gives reference data that callers cannot change', async () => {
    const chl = adapter();
    const data = await chl.getReferenceData();
    expect(data.enforcementPoints.map((point) => point.name)).toContain('Ikeja enforcement point');
    data.states.length = 0;
    expect((await chl.getReferenceData()).states.length).toBeGreaterThan(0);
  });
});

describe('MockChlAdapter: a CHL that is down or slow', () => {
  it('fails every call as unavailable when switched off', async () => {
    const chl = adapter({ available: false });
    await expect(chl.healthCheck()).rejects.toBeInstanceOf(ChlUnavailableError);
    await expect(chl.signIn('officer@jbr.com', MOCK_PASSWORD)).rejects.toBeInstanceOf(
      ChlUnavailableError,
    );
    chl.available = true;
    await expect(chl.healthCheck()).resolves.toBeUndefined();
  });

  it('waits the configured delay on every call', async () => {
    const started = Date.now();
    await adapter({ delayMs: 40 }).healthCheck();
    expect(Date.now() - started).toBeGreaterThanOrEqual(35);
  });
});
