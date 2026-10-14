import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { MOCK_FOREIGN_TAG } from '../../src/integrations/chl/mock/mock-data.js';
import type { Database } from '../../src/database/pool.js';
import { lagosDay } from '../../src/shared/lagos-time.js';
import {
  buildApp,
  emptyTables,
  LAGOS,
  openTestDatabase,
  recreateSchema,
  signIn,
  TestClock,
  testDatabaseUrl,
  type Harness,
} from '../support/harness.js';

describe('lagosDay', () => {
  it('counts the day in Lagos time (UTC+1)', () => {
    // 00:30 in Lagos on the 14th is still the 13th in UTC.
    expect(lagosDay(new Date('2026-10-13T23:30:00Z'))).toEqual({
      from: new Date('2026-10-13T23:00:00Z'),
      to: new Date('2026-10-14T23:00:00Z'),
    });
  });
});

describe.skipIf(!testDatabaseUrl)('verification API', () => {
  let database: Database;
  let harness: Harness;
  let app: Express;
  let token: string;

  beforeAll(async () => {
    database = openTestDatabase();
    await recreateSchema(database);
  });
  beforeEach(async () => {
    await emptyTables(database);
    harness = buildApp(database, { clock: new TestClock(new Date('2026-10-14T08:30:00Z')) });
    app = harness.app;
    token = (await signIn(app)).accessToken;
  });
  afterAll(async () => {
    await database.close();
  });

  const post = (path: string, body: object) =>
    request(app).post(`/api/v1${path}`).auth(token, { type: 'bearer' }).send(body);
  const get = (path: string) => request(app).get(`/api/v1${path}`).auth(token, { type: 'bearer' });
  const verify = async (body: object) => {
    const response = await post('/verifications', { location: LAGOS, ...body });
    return response.body.verification;
  };

  describe('POST /verifications', () => {
    it('a plate with an active trip: vehicle, E-Tag, trip and location', async () => {
      const response = await post('/verifications', {
        method: 'plate',
        plate: 'abc 123-aa',
        location: LAGOS,
      });
      expect(response.status).toBe(201);
      const verification = response.body.verification;
      expect(verification).toMatchObject({
        method: 'plate',
        outcome: 'found',
        completed: true,
        syncStatus: 'live',
        checkedAt: '2026-10-14T08:30:00.000Z',
        reference: expect.stringMatching(/^VRF-2026-[0-9A-F]{8}$/),
        vehicle: { plate: 'ABC123AA', type: '12/14 tyres and its equivalent' },
        eTag: { status: 'valid', belongsToPlate: null },
        location: LAGOS,
        loadStatus: null,
      });
      expect(verification.trip).toMatchObject({
        status: 'active',
        current: {
          transactionReference: '564031956608',
          originState: 'Ogun',
          destinationLga: 'Ikeja',
          status: 'active',
        },
        last: null,
        destinationCheck: { enforcementPoint: 'Ikeja enforcement point' },
      });
    });

    it('records the attempt with the identifier processed, which the app never sees', async () => {
      const response = await post('/verifications', {
        method: 'rfid',
        tagReference: 'E2000017221101441890D482',
        location: LAGOS,
      });
      expect(JSON.stringify(response.body)).not.toMatch(/E2000017221101441890D482|veh-lnd/);
      const { rows } = await database.query(
        `SELECT agent_id, agent_code, method, processed_identifier, outcome, plate, vehicle_id,
           etag_status, trip_status, latitude, longitude, session_id IS NOT NULL AS has_session
         FROM verifications`,
      );
      expect(rows).toEqual([
        {
          agent_id: 'agt-0142',
          agent_code: 'JRB-AG-0142',
          method: 'rfid',
          processed_identifier: 'E2000017221101441890D482',
          outcome: 'found',
          plate: 'LND482XK',
          vehicle_id: 'veh-lnd',
          etag_status: 'invalid',
          trip_status: 'noActive',
          latitude: LAGOS.latitude,
          longitude: LAGOS.longitude,
          has_session: true,
        },
      ]);
    });

    it('every method and every result', async () => {
      const qr = await verify({ method: 'qrCode', reference: 'JRB-QR-0002' });
      expect(qr.trip).toMatchObject({
        status: 'noActive',
        current: null,
        last: { transactionReference: '564031950271', status: 'completed' },
      });
      expect((await verify({ method: 'eTag', reference: 'JRB-QR-0003' })).trip.status).toBe(
        'noHistory',
      );
      expect((await verify({ method: 'plate', plate: 'EXP900AA' })).trip.status).toBe('expired');
      expect((await verify({ method: 'plate', plate: 'KJA555MM' })).eTag).toEqual({
        status: 'mismatch',
        belongsToPlate: 'LND482XK',
      });
      expect(await verify({ method: 'plate', plate: 'AAA000AA' })).toMatchObject({
        outcome: 'vehicleNotFound',
        completed: true,
        vehicle: null,
        eTag: null,
        trip: null,
      });
      expect(await verify({ method: 'rfid', tagReference: MOCK_FOREIGN_TAG })).toMatchObject({
        outcome: 'unknownTag',
        vehicle: null,
      });
    });

    it('CHL unavailable: 503, and the attempt is still recorded as not completed', async () => {
      const response = await post('/verifications', {
        method: 'plate',
        plate: 'AAA503AA',
        location: LAGOS,
      });
      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('CHL_UNAVAILABLE');
      const id = response.body.error.details.verificationId;
      const detail = await get(`/verifications/${id}`);
      expect(detail.body.verification).toMatchObject({
        outcome: 'unavailable',
        completed: false,
        // The plate typed is kept, so the record can be shown and retried.
        plate: 'AAA503AA',
        trip: null,
      });
    });

    it('needs a location and a valid identifier', async () => {
      const noLocation = await post('/verifications', { method: 'plate', plate: 'ABC123AA' });
      expect(noLocation.status).toBe(400);
      expect(noLocation.body.error.details[0].field).toBe('location');

      const badPlate = await post('/verifications', {
        method: 'plate',
        plate: 'A/B',
        location: LAGOS,
      });
      expect(badPlate.status).toBe(400);
      expect(badPlate.body.error.code).toBe('INVALID_PLATE');

      const noTag = await post('/verifications', { method: 'rfid', location: LAGOS });
      expect(noTag.status).toBe(400);

      const farAway = await post('/verifications', {
        method: 'plate',
        plate: 'ABC123AA',
        location: { latitude: 91, longitude: 0 },
      });
      expect(farAway.status).toBe(400);

      const { rows } = await database.query('SELECT 1 FROM verifications');
      expect(rows).toHaveLength(0);
    });

    it('a retry with the same Idempotency-Key returns the first result, without asking CHL again', async () => {
      const spy = vi.spyOn(harness.chl, 'verifyVehicle');
      const send = () =>
        request(app)
          .post('/api/v1/verifications')
          .auth(token, { type: 'bearer' })
          .set('Idempotency-Key', 'phone-123')
          .send({ method: 'plate', plate: 'ABC123AA', location: LAGOS });
      const first = await send();
      const second = await send();
      expect(first.status).toBe(201);
      expect(second.status).toBe(200);
      expect(second.body.verification.id).toBe(first.body.verification.id);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('a retry after CHL was unavailable asks CHL again', async () => {
      const spy = vi.spyOn(harness.chl, 'verifyVehicle');
      for (let i = 0; i < 2; i += 1) {
        const response = await request(app)
          .post('/api/v1/verifications')
          .auth(token, { type: 'bearer' })
          .set('Idempotency-Key', 'phone-503')
          .send({ method: 'plate', plate: 'AAA503AA', location: LAGOS });
        expect(response.status).toBe(503);
      }
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('a check made offline keeps the time it was made', async () => {
      const capturedAt = '2026-10-14T06:00:00.000Z';
      const verification = await verify({ method: 'plate', plate: 'ABC123AA', capturedAt });
      expect(verification).toMatchObject({ syncStatus: 'offline', checkedAt: capturedAt });

      for (const when of ['2026-10-06T08:00:00Z', '2026-10-14T10:00:00Z']) {
        const response = await post('/verifications', {
          method: 'plate',
          plate: 'ABC123AA',
          location: LAGOS,
          capturedAt: when,
        });
        expect(response.status).toBe(400);
      }
    });
  });

  describe('a verification afterwards', () => {
    it('refreshing the trip', async () => {
      const { id } = await verify({ method: 'plate', plate: 'ABC123AA' });
      const response = await post(`/verifications/${id}/trip/refresh`, {});
      expect(response.status).toBe(200);
      expect(response.body.trip.status).toBe('active');

      const notFound = await verify({ method: 'plate', plate: 'AAA000AA' });
      const refused = await post(`/verifications/${notFound.id}/trip/refresh`, {});
      expect(refused.status).toBe(409);
      expect(refused.body.error.code).toBe('NO_VEHICLE');
    });

    it('the destination check, for an active trip only', async () => {
      const active = await verify({ method: 'plate', plate: 'ABC123AA' });
      const response = await post(`/verifications/${active.id}/destination-location`, {
        location: { latitude: 6.6, longitude: 3.35, accuracyMetres: 9 },
      });
      expect(response.status).toBe(201);
      expect(response.body.destinationLocation).toMatchObject({ latitude: 6.6, longitude: 3.35 });

      const detail = await get(`/verifications/${active.id}`);
      expect(detail.body.verification.destinationLocations).toHaveLength(1);
      expect(detail.body.verification.agent).toEqual({
        id: 'JRB-AG-0142',
        name: 'Demo Officer',
        organization: expect.any(String),
      });

      const noTrip = await verify({ method: 'plate', plate: 'LND482XK' });
      const refused = await post(`/verifications/${noTrip.id}/destination-location`, {
        location: LAGOS,
      });
      expect(refused.status).toBe(409);
      expect(refused.body.error.code).toBe('NO_ACTIVE_TRIP');
    });

    it('Loaded / Empty, for a vehicle without an active trip', async () => {
      const noTrip = await verify({ method: 'plate', plate: 'LND482XK' });
      const response = await post(`/verifications/${noTrip.id}/load-status`, {
        status: 'loaded',
        location: LAGOS,
      });
      expect(response.status).toBe(200);
      expect(harness.chl.loadRecords).toHaveLength(1);
      const detail = await get(`/verifications/${noTrip.id}`);
      expect(detail.body.verification.loadStatus).toEqual({
        status: 'loaded',
        recordedAt: '2026-10-14T08:30:00.000Z',
      });

      const active = await verify({ method: 'plate', plate: 'ABC123AA' });
      const refused = await post(`/verifications/${active.id}/load-status`, {
        status: 'empty',
        location: LAGOS,
      });
      expect(refused.status).toBe(409);
      expect(refused.body.error.code).toBe('TRIP_ACTIVE');

      const invalid = await post(`/verifications/${noTrip.id}/load-status`, {
        status: 'half',
        location: LAGOS,
      });
      expect(invalid.status).toBe(400);
    });

    it("another agent's verification is not found", async () => {
      const { rows } = await database.query<{ id: string }>(
        `INSERT INTO verifications (reference, agent_id, agent_name, method,
           processed_identifier, outcome, latitude, longitude)
         VALUES ('VRF-OTHER', 'agt-other', 'Other Officer', 'plate', 'ABC123AA', 'found', 1, 1)
         RETURNING id`,
      );
      const id = rows[0]!.id;
      expect((await get(`/verifications/${id}`)).status).toBe(404);
      expect((await post(`/verifications/${id}/trip/refresh`, {})).status).toBe(404);
      expect((await get('/verifications?period=all')).body.items).toHaveLength(0);
      expect((await get('/verifications/not-a-uuid')).status).toBe(404);
    });
  });

  describe('history and dashboard', () => {
    it('history pages newest first, and keeps 30 days by default', async () => {
      for (const plate of ['ABC123AA', 'LND482XK', 'AAA001AA']) {
        await verify({ method: 'plate', plate });
        harness.clock.advance(60_000);
      }
      await database.query(
        "UPDATE verifications SET created_at = created_at - interval '40 days' WHERE plate = 'ABC123AA'",
      );

      const first = await get('/verifications?limit=1');
      expect(first.status).toBe(200);
      expect(
        first.body.items.map((item: { vehicle: { plate: string } }) => item.vehicle.plate),
      ).toEqual(['AAA001AA']);
      const second = await get(`/verifications?limit=1&cursor=${first.body.nextCursor}`);
      expect(second.body.items[0].vehicle.plate).toBe('LND482XK');
      expect(second.body.nextCursor).toBeNull();

      expect((await get('/verifications?period=all')).body.items).toHaveLength(3);
      expect((await get('/verifications?cursor=nonsense')).status).toBe(400);
      expect((await get('/verifications?limit=500')).status).toBe(400);
    });

    it("the dashboard counts today's verifications in Lagos time", async () => {
      await verify({
        method: 'plate',
        plate: 'ABC123AA',
        // 23:30 in Lagos yesterday: not today.
        capturedAt: '2026-10-13T22:30:00Z',
      });
      await verify({ method: 'plate', plate: 'ABC123AA' });
      await verify({ method: 'plate', plate: 'LND482XK' });
      await verify({ method: 'plate', plate: 'AAA001AA' });
      await verify({ method: 'plate', plate: 'AAA000AA' });

      const response = await get('/dashboard');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        day: { from: '2026-10-13T23:00:00.000Z', to: '2026-10-14T23:00:00.000Z' },
        totals: { verifications: 4, activeTrips: 1, noActiveTrips: 2, violationsIssued: 0 },
        unreadNotifications: 0,
      });
      expect(response.body.recentVerifications).toHaveLength(5);
    });
  });

  describe('tags, receipts and reference data', () => {
    it('resolves several tags read together', async () => {
      const response = await post('/rfid/resolve-tags', {
        tagReferences: ['E2000017221101441890ABC1', MOCK_FOREIGN_TAG],
      });
      expect(response.status).toBe(200);
      expect(response.body.tags).toEqual([
        { tagReference: 'E2000017221101441890ABC1', known: true, plate: 'ABC123AA' },
        { tagReference: MOCK_FOREIGN_TAG, known: false, plate: null },
      ]);
      expect((await post('/rfid/resolve-tags', { tagReferences: [] })).status).toBe(400);
    });

    it('an E-Tag receipt', async () => {
      const response = await get('/etags/JRB-QR-0002/receipt');
      expect(response.status).toBe(200);
      expect(response.body.receipt).toMatchObject({
        eTagReference: 'JRB-QR-0002',
        plate: 'LND482XK',
        status: 'active',
      });
      const missing = await get('/etags/JRB-QR-9999/receipt');
      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('E_TAG_NOT_FOUND');
    });

    it('reference data', async () => {
      const response = await get('/reference-data');
      expect(response.status).toBe(200);
      expect(response.body.states.length).toBeGreaterThan(0);
    });
  });
});
