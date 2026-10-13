import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/environment/app_environment.dart';
import '../../../../core/utils/clock.dart';
import '../../../../shared/device/location/location_adapter.dart';
import '../../../chl_trips/domain/entities/chl_trip.dart';
import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../vehicle/domain/entities/e_tag_status.dart';
import '../../../vehicle/domain/entities/verification_result.dart';
import '../../domain/entities/plate_number.dart';
import '../../domain/entities/scanned_qr.dart';
import '../../domain/entities/verification_request.dart';
import '../../domain/repositories/verification_repository.dart';

/// Verifications: sample results in demo mode, otherwise CHL's.
final verificationRepositoryProvider = Provider<VerificationRepository>(
  (ref) => AppEnvironment.authDemoMode
      ? DemoVerificationRepository(now: ref.watch(clockProvider))
      : const RemoteVerificationRepository(),
);

/// Verifications with the CHL API.
// TODO(verification): call the CHL verification, trip refresh and
// destination-check endpoints once they exist. Until then every call says
// verification is not available.
class RemoteVerificationRepository implements VerificationRepository {
  const RemoteVerificationRepository();

  static const VerificationFailure _notAvailable = VerificationFailure(
    'Verification is not available yet. Try again later.',
  );

  @override
  Stream<VerificationProgress> verify(VerificationRequest request) =>
      Stream.error(_notAvailable);

  @override
  Future<VerificationResult> refresh(VerificationResult result) =>
      Future.error(_notAvailable);

  @override
  Future<RecordedLocation> recordDestinationLocation(
    String transactionReference,
    DeviceLocation location,
  ) => Future.error(_notAvailable);
}

/// Sample verifications, each check taking a moment as it would over a
/// network:
/// - LND 482 XK has no active trip (and an invalid E-Tag);
/// - any other plate, and a scanned receipt (ABC 123 AA), has an active
///   trip from Abeokuta South, Ogun, to Ikeja, Lagos, and no E-Tag;
/// - a scanned E-Tag is ABC 123 AA with a valid JRB E-Tag.
class DemoVerificationRepository implements VerificationRepository {
  DemoVerificationRepository({
    required this.now,
    this.stepDelay = const Duration(milliseconds: 800),
  });

  final DateTime Function() now;

  /// How long each check takes.
  final Duration stepDelay;

  static final PlateNumber _receiptPlate = PlateNumber.tryParse('ABC123AA')!;
  static final PlateNumber _noTripPlate = PlateNumber.tryParse('LND482XK')!;

  @override
  Stream<VerificationProgress> verify(VerificationRequest request) async* {
    yield const StageStarted(VerificationStage.identifyingVehicle);
    await Future<void>.delayed(stepDelay);
    final plate = request.plate ?? _receiptPlate;
    yield VehicleIdentified(plate);

    yield const StageStarted(VerificationStage.validatingETag);
    await Future<void>.delayed(stepDelay);
    final eTag = switch (request) {
      QrVerification(code: ScannedQr(kind: ScannedQrKind.eTag)) =>
        ETagStatus.valid,
      _ when plate == _noTripPlate => ETagStatus.invalid,
      _ => ETagStatus.missing,
    };

    yield const StageStarted(VerificationStage.checkingTrip);
    await Future<void>.delayed(stepDelay);
    yield VerificationCompleted(_result(plate, eTag));
  }

  VerificationResult _result(PlateNumber plate, ETagStatus eTag) {
    final at = now();
    if (plate == _noTripPlate) {
      return VerificationResult(
        plate: plate,
        vehicleType: 'Heavy goods vehicle',
        eTagStatus: eTag,
        tripStatus: TripStatus.noActive,
        checkedAt: at,
      );
    }
    final started = at.subtract(const Duration(hours: 2, minutes: 8));
    return VerificationResult(
      plate: plate,
      vehicleType: 'Heavy goods vehicle',
      eTagStatus: eTag,
      tripStatus: TripStatus.active,
      checkedAt: at,
      trip: ChlTrip(
        transactionReference: 'CHL-2026-08142',
        startedAt: started,
        paidAt: started.subtract(const Duration(minutes: 6)),
        transactionType: 'CHL levy',
        originState: 'Ogun',
        originLga: 'Abeokuta South',
        destinationState: 'Lagos',
        destinationLga: 'Ikeja',
        validUntil: at.add(const Duration(hours: 4, minutes: 21, seconds: 2)),
        cargo: 'General haulage',
        paymentReference: 'PAY-2026-08142',
      ),
      destinationCheck: const DestinationCheck(
        enforcementPoint: 'Ikeja enforcement point',
        completionDecision: 'Awaiting central validation',
        centralDelay: Duration(seconds: 900),
      ),
    );
  }

  @override
  Future<VerificationResult> refresh(VerificationResult result) async {
    await Future<void>.delayed(stepDelay);
    return VerificationResult(
      plate: result.plate,
      vehicleType: result.vehicleType,
      eTagStatus: result.eTagStatus,
      tripStatus: result.tripStatus,
      checkedAt: now(),
      trip: result.trip,
      destinationCheck: result.destinationCheck,
    );
  }

  @override
  Future<RecordedLocation> recordDestinationLocation(
    String transactionReference,
    DeviceLocation location,
  ) async {
    await Future<void>.delayed(stepDelay);
    return RecordedLocation(
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMetres: location.accuracyMetres,
      recordedAt: now(),
    );
  }
}
