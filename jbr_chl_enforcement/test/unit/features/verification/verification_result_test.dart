import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/features/chl_trips/domain/entities/chl_trip.dart';
import 'package:jbr_chl_enforcement/features/chl_trips/domain/entities/trip_status.dart';
import 'package:jbr_chl_enforcement/features/vehicle/domain/entities/e_tag_status.dart';
import 'package:jbr_chl_enforcement/features/vehicle/domain/entities/verification_result.dart';
import 'package:jbr_chl_enforcement/features/vehicle/presentation/screens/verification_result_screen.dart';
import 'package:jbr_chl_enforcement/features/verification/data/repositories/verification_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/plate_number.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/scanned_qr.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/haulage_tag.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/verification_request.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/repositories/verification_repository.dart';
import 'package:jbr_chl_enforcement/shared/device/location/location_adapter.dart';
import 'package:jbr_chl_enforcement/shared/device/permissions/permission_adapter.dart';

import '../../../helpers/fakes.dart';
import '../../../helpers/verification_samples.dart';

final _now = DateTime(2026, 10, 6, 0, 30);
final _here = DeviceLocation(
  latitude: 6.6018,
  longitude: 3.3515,
  accuracyMetres: 12,
  at: _now,
);
PlateNumber _plate(String text) => PlateNumber.tryParse(text)!;

void main() {
  group('wording', () {
    test('date and time', () {
      expect(
        VerificationResultScreen.dateTime(DateTime(2026, 10, 12, 12, 49)),
        'October 12, 2026 12:49 PM',
      );
      expect(
        VerificationResultScreen.dateTime(DateTime(2026, 10, 19, 23, 59)),
        'October 19, 2026 11:59 PM',
      );
    });

    test('countdown', () {
      expect(
        VerificationResultScreen.countdown(
          const Duration(hours: 4, minutes: 21, seconds: 2),
        ),
        '04 h 21 min 02 sec',
      );
      expect(
        VerificationResultScreen.countdown(Duration.zero),
        '00 h 00 min 00 sec',
      );
      expect(
        VerificationResultScreen.countdown(const Duration(hours: 30)),
        '30 h 00 min 00 sec',
      );
    });

    test('coordinates', () {
      expect(
        VerificationResultScreen.coordinates(
          RecordedLocation(
            latitude: 8.974402,
            longitude: 7.452813,
            accuracyMetres: 97.2,
            recordedAt: _now,
          ),
        ),
        '8.97440°, 7.45281° · ±97 m',
      );
    });

    test('CHL trip status', () {
      expect(VerificationResultScreen.tripStatus(TripStatus.active), 'Active');
      expect(
        VerificationResultScreen.tripStatus(TripStatus.noActive),
        'No Active Trip',
      );
      expect(
        VerificationResultScreen.tripStatus(TripStatus.previous),
        'No Active Trip',
      );
    });

    test('E-Tag validity', () {
      expect(
        VerificationResultScreen.eTagValidity(ETagStatus.valid),
        'Valid JRB E-Tag',
      );
      expect(
        VerificationResultScreen.eTagValidity(ETagStatus.invalid),
        'Invalid JRB E-Tag',
      );
      expect(
        VerificationResultScreen.eTagValidity(ETagStatus.missing),
        'No E-Tag',
      );
    });
  });

  test('a trip has no time left once it has expired', () {
    final trip = sampleActiveResult(_now).trip!;
    expect(
      trip.remainingAt(_now),
      const Duration(hours: 4, minutes: 21, seconds: 2),
    );
    expect(trip.remainingAt(_now.add(const Duration(hours: 9))), Duration.zero);
  });

  group('demo verifications', () {
    final repository = DemoVerificationRepository(
      now: () => _now,
      stepDelay: Duration.zero,
    );

    test('run the three checks in order, then the result', () async {
      final progress = await repository
          .verify(location: _here, PlateVerification(_plate('ABC123AA')))
          .toList();

      expect(
        progress.whereType<StageStarted>().map((step) => step.stage),
        VerificationStage.values,
      );
      expect(progress[1], isA<VehicleIdentified>());
      final result = (progress.last as VerificationCompleted).result;
      expect(result.plate, _plate('ABC123AA'));
      expect(result.tripStatus, TripStatus.active);
      expect(result.eTagStatus, ETagStatus.missing);
      expect(result.trip!.destinationLga, 'Ikeja');
      expect(result.destinationCheck!.centralDelay.inSeconds, 900);
    });

    test('AAA 001 AA has never made a CHL trip', () async {
      final progress = await repository
          .verify(location: _here, PlateVerification(_plate('AAA001AA')))
          .toList();
      final result = (progress.last as VerificationCompleted).result;

      expect(result.tripStatus, TripStatus.noHistory);
      expect(result.trip, isNull);
      expect(result.lastTrip, isNull);
    });

    test('the result keeps where it was checked', () async {
      final progress = await repository
          .verify(location: _here, PlateVerification(_plate('ABC123AA')))
          .toList();
      final result = (progress.last as VerificationCompleted).result;
      expect(result.location, same(_here));
    });

    test('LND 482 XK has no active trip', () async {
      final progress = await repository
          .verify(location: _here, PlateVerification(_plate('LND482XK')))
          .toList();
      final result = (progress.last as VerificationCompleted).result;

      expect(result.tripStatus, TripStatus.noActive);
      expect(result.trip, isNull);
      expect(result.eTagStatus, ETagStatus.invalid);
      final last = result.lastTrip!;
      expect(last.state, ChlTripState.completed);
      expect(last.completedAt!.isBefore(_now), isTrue);
      expect(last.startedAt.isBefore(last.completedAt!), isTrue);
    });

    test('AAA 000 AA is not a known vehicle', () async {
      final progress = await repository
          .verify(location: _here, PlateVerification(_plate('AAA000AA')))
          .toList();

      expect(progress.whereType<VehicleIdentified>(), isEmpty);
      expect(progress.last, isA<NoVehicleFound>());
    });

    test('AAA 503 AA cannot be verified', () {
      expect(
        repository.verify(
          location: _here,
          PlateVerification(_plate('AAA503AA')),
        ),
        emitsInOrder([
          isA<StageStarted>(),
          emitsError(isA<VerificationFailure>()),
        ]),
      );
    });

    test('a scanned QR code is ABC 123 AA, like the plate', () async {
      final progress = await repository
          .verify(
            location: _here,
            QrVerification(ScannedQr.read('JRB-CHL-000123')),
          )
          .toList();

      expect((progress[1] as VehicleIdentified).plate, _plate('ABC123AA'));
      final result = (progress.last as VerificationCompleted).result;
      expect(result.tripStatus, TripStatus.active);
      expect(result.eTagStatus, ETagStatus.missing);
    });

    test('a scanned code ending -404 is not a known vehicle', () async {
      for (final code in ['JRB-CHL-404', 'ETAG-7781-404']) {
        final progress = await repository
            .verify(location: _here, QrVerification(ScannedQr.read(code)))
            .toList();
        expect(progress.last, isA<NoVehicleFound>(), reason: code);
      }
    });

    test('a scanned code ending -503 cannot be verified', () {
      expect(
        repository.verify(
          location: _here,
          QrVerification(ScannedQr.read('ETAG-7781-503')),
        ),
        emitsInOrder([
          isA<StageStarted>(),
          emitsError(isA<VerificationFailure>()),
        ]),
      );
    });

    test('a tag resolved to LND 482 XK is that vehicle', () async {
      final progress = await repository
          .verify(
            location: _here,
            TagVerification(HaulageTag('E2000017', plate: _plate('LND482XK'))),
          )
          .toList();
      final result = (progress.last as VerificationCompleted).result;
      expect(result.plate, _plate('LND482XK'));
      expect(result.tripStatus, TripStatus.noActive);
    });

    test('a haulage tag is ABC 123 AA with a valid JRB E-Tag', () async {
      final progress = await repository
          .verify(
            location: _here,
            const TagVerification(HaulageTag('E2000017')),
          )
          .toList();

      expect((progress[1] as VehicleIdentified).plate, _plate('ABC123AA'));
      final result = (progress.last as VerificationCompleted).result;
      expect(result.tripStatus, TripStatus.active);
      expect(result.eTagStatus, ETagStatus.valid);
    });

    test('records the location as received', () async {
      final recorded = await repository.recordDestinationLocation(
        '564031956608',
        DeviceLocation(
          latitude: 8.97,
          longitude: 7.45,
          accuracyMetres: 12,
          at: _now,
        ),
      );
      expect(recorded.latitude, 8.97);
      expect(recorded.recordedAt, _now);
    });
  });

  test('without the API, verification is not available', () async {
    const repository = RemoteVerificationRepository();
    expect(
      repository.verify(location: _here, PlateVerification(_plate('ABC123AA'))),
      emitsError(isA<VerificationFailure>()),
    );
  });

  group('location reader', () {
    test('GPS off', () async {
      final reader = GeolocatorLocationReader(
        FakePermissionAdapter()..locationServiceEnabled = false,
      );
      await expectLater(
        reader.current(),
        throwsA(
          isA<LocationUnavailable>().having(
            (error) => error.problem,
            'problem',
            LocationProblem.serviceOff,
          ),
        ),
      );
    });

    test('asks once, and stops when refused', () async {
      final permissions = FakePermissionAdapter(
        statuses: {AppPermission.location: AppPermissionStatus.denied},
        statusAfterRequest: AppPermissionStatus.denied,
      );
      await expectLater(
        GeolocatorLocationReader(permissions).current(),
        throwsA(
          isA<LocationUnavailable>().having(
            (error) => error.problem,
            'problem',
            LocationProblem.permissionDenied,
          ),
        ),
      );
      expect(permissions.requested, [AppPermission.location]);
    });

    test('blocked: does not ask', () async {
      final permissions = FakePermissionAdapter(
        statuses: {
          AppPermission.location: AppPermissionStatus.permanentlyDenied,
        },
      );
      await expectLater(
        GeolocatorLocationReader(permissions).current(),
        throwsA(isA<LocationUnavailable>()),
      );
      expect(permissions.requested, isEmpty);
    });
  });
}
