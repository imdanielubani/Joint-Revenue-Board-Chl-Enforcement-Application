import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/features/chl_trips/domain/entities/trip_status.dart';
import 'package:jbr_chl_enforcement/features/vehicle/domain/entities/load_status.dart';
import 'package:jbr_chl_enforcement/features/vehicle/domain/entities/verification_result.dart';
import 'package:jbr_chl_enforcement/features/verification/data/models/verification_response_model.dart';
import 'package:jbr_chl_enforcement/features/verification/data/repositories/verification_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/haulage_tag.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/plate_number.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/scanned_qr.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/verification_request.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/repositories/verification_repository.dart';
import 'package:jbr_chl_enforcement/shared/device/location/location_adapter.dart';

import '../../../helpers/fake_api.dart';

void main() {
  final here = DeviceLocation(
    latitude: 6.6018,
    longitude: 3.3515,
    accuracyMetres: 12,
    at: DateTime(2026, 10, 14, 9, 30),
  );
  final plate = PlateNumber.tryParse('ABC123AA')!;

  late FakeApi api;
  late RemoteVerificationRepository repository;

  setUp(() {
    api = FakeApi((_) => ApiAnswer.fixture('verify_active', status: 201));
    repository = RemoteVerificationRepository(api.dio(), isConfigured: true);
  });

  VerificationResult activeResult() => (VerificationResponseModel.fromJson(
    fixture('verify_active')['verification'] as Map<String, dynamic>,
    location: here,
  ) as VehicleFound).result;

  group('verify', () {
    test('sends the plate and location, and reports each stage', () async {
      final progress = await repository
          .verify(PlateVerification(plate), location: here)
          .toList();

      expect(api.calls, ['POST /verifications']);
      final request = api.requests.single;
      expect(request.data, {
        'method': 'plate',
        'plate': 'ABC123AA',
        'location': {
          'latitude': 6.6018,
          'longitude': 3.3515,
          'accuracyMetres': 12.0,
        },
      });
      expect(request.headers['Idempotency-Key'], hasLength(36));

      expect(progress.map((step) => step.runtimeType), [
        StageStarted,
        VehicleIdentified,
        StageStarted,
        StageStarted,
        VerificationCompleted,
      ]);
      final result = (progress.last as VerificationCompleted).result;
      expect(result.tripStatus, TripStatus.active);
      expect(result.id, isNotNull);
      expect(result.location, same(here));
    });

    test('QR codes, E-Tags and RFID tags are sent by method', () async {
      for (final request in [
        QrVerification(ScannedQr.read('JRB-QR-0001')),
        const QrVerification(
          ScannedQr(kind: ScannedQrKind.eTag, value: 'JRB-ETAG-0001'),
        ),
        const TagVerification(HaulageTag('E2000017221101441890ABC1')),
      ]) {
        await repository.verify(request, location: here).drain<void>();
      }
      expect(
        [
          for (final request in api.requests)
            (request.data as Map<String, dynamic>)..remove('location'),
        ],
        [
          {'method': 'qrCode', 'reference': 'JRB-QR-0001'},
          {'method': 'eTag', 'reference': 'JRB-ETAG-0001'},
          {'method': 'rfid', 'tagReference': 'E2000017221101441890ABC1'},
        ],
      );
    });

    test('no vehicle ends the verification', () async {
      api.answer = (_) => ApiAnswer.fixture('verify_not_found', status: 201);
      final progress = await repository
          .verify(PlateVerification(plate), location: here)
          .toList();
      expect(progress.last, isA<NoVehicleFound>());
    });

    test("CHL unavailable fails with the server's message", () async {
      api.answer = (_) => ApiAnswer(503, fixture('verify_unavailable'));
      expect(
        repository.verify(PlateVerification(plate), location: here),
        emitsThrough(
          emitsError(
            isA<VerificationFailure>().having(
              (failure) => failure.message,
              'message',
              startsWith('CHL verification could not be completed'),
            ),
          ),
        ),
      );
    });

    test('no connection says so', () async {
      api.answer = (_) => ApiAnswer.offline;
      expect(
        repository.verify(PlateVerification(plate), location: here),
        emitsThrough(
          emitsError(
            isA<VerificationFailure>().having(
              (failure) => failure.message,
              'message',
              contains('network'),
            ),
          ),
        ),
      );
    });

    test('without an API configured, nothing is sent', () async {
      final unconfigured = RemoteVerificationRepository(
        api.dio(),
        isConfigured: false,
      );
      expect(
        unconfigured.verify(PlateVerification(plate), location: here),
        emitsError(isA<VerificationFailure>()),
      );
      expect(api.requests, isEmpty);
    });
  });

  group('after a verification', () {
    test('refreshing the trip', () async {
      api.answer = (_) => ApiAnswer.fixture('trip_refresh');
      final result = activeResult();
      final fresh = await repository.refresh(result);
      expect(api.calls, ['POST /verifications/${result.id}/trip/refresh']);
      expect(fresh.tripStatus, TripStatus.active);
      expect(fresh.id, result.id);
    });

    test('the destination check sends where the officer is now', () async {
      api.answer = (_) =>
          ApiAnswer.fixture('destination_location', status: 201);
      final result = activeResult();
      final recorded = await repository.recordDestinationLocation(result, here);
      expect(api.calls, [
        'POST /verifications/${result.id}/destination-location',
      ]);
      expect(recorded.latitude, 6.6018);
      expect(recorded.accuracyMetres, 12);
    });

    test('Loaded / Empty is sent with the verification location', () async {
      api.answer = (_) => ApiAnswer.fixture('load_status');
      final result = activeResult();
      await repository.recordLoadStatus(result, LoadStatus.empty);
      expect(
        api.requests.single.path,
        '/verifications/${result.id}/load-status',
      );
      expect(api.requests.single.data, {
        'status': 'empty',
        'location': {
          'latitude': 6.6018,
          'longitude': 3.3515,
          'accuracyMetres': 12.0,
        },
      });
    });

    test('a refused action shows the server message', () async {
      api.answer = (_) => const ApiAnswer(409, {
        'error': {
          'code': 'TRIP_ACTIVE',
          'message': 'This vehicle has an active trip.',
        },
      });
      expect(
        repository.recordLoadStatus(activeResult(), LoadStatus.loaded),
        throwsA(
          isA<VerificationFailure>().having(
            (failure) => failure.message,
            'message',
            'This vehicle has an active trip.',
          ),
        ),
      );
    });
  });

  group('several tags', () {
    test('fills in the plates the tags do not carry', () async {
      api.answer = (_) => ApiAnswer.fixture('resolve_tags');
      final carried = HaulageTag(
        'E2000017221101441890ABC1',
        plate: PlateNumber.tryParse('ABC123AA'),
      );
      final tags = await repository.resolvePlates([
        carried,
        const HaulageTag('E2000017221101441890D482'),
      ]);
      expect(api.requests.single.data, {
        'tagReferences': ['E2000017221101441890D482'],
      });
      expect(tags.first, same(carried));
      expect(tags.last.plate, PlateNumber.tryParse('LND482XK'));
    });

    test('on any problem, the tags stay as read', () async {
      api.answer = (_) => ApiAnswer.offline;
      const tags = [HaulageTag('E2000017221101441890D482')];
      expect(await repository.resolvePlates(tags), tags);
    });
  });
}
