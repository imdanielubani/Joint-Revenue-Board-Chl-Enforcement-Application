import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/environment/app_environment.dart';
import '../../../../core/utils/clock.dart';
import '../../../../shared/device/location/location_adapter.dart';
import '../../../chl_trips/domain/entities/chl_trip.dart';
import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../vehicle/domain/entities/e_tag_status.dart';
import '../../../vehicle/domain/entities/verification_result.dart';
import '../../../verification_history/domain/entities/verification_record_details.dart';
import '../../domain/entities/plate_number.dart';
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
/// - AAA 000 AA, and a scanned code ending "-404", is not a known vehicle;
/// - AAA 503 AA, and a scanned code ending "-503", cannot be verified (CHL
///   does not respond);
/// - LND 482 XK has no active trip (and an invalid E-Tag), and a
///   completed last trip;
/// - any other plate, and a scanned QR code (ABC 123 AA), has an active
///   trip from Abeokuta South, Ogun, to Ikeja, Lagos, and no E-Tag;
/// - a haulage tag read by RFID is ABC 123 AA's tag: the same trip, with a
///   valid JRB E-Tag.
class DemoVerificationRepository implements VerificationRepository {
  DemoVerificationRepository({
    required this.now,
    this.stepDelay = const Duration(milliseconds: 800),
  });

  final DateTime Function() now;

  /// How long each check takes.
  final Duration stepDelay;

  static final PlateNumber _qrCodePlate = PlateNumber.tryParse('ABC123AA')!;
  static final PlateNumber _noTripPlate = PlateNumber.tryParse('LND482XK')!;
  static final PlateNumber _unknownPlate = PlateNumber.tryParse('AAA000AA')!;
  static final PlateNumber _unavailablePlate = PlateNumber.tryParse(
    'AAA503AA',
  )!;

  @override
  Stream<VerificationProgress> verify(VerificationRequest request) async* {
    yield const StageStarted(VerificationStage.identifyingVehicle);
    await Future<void>.delayed(stepDelay);
    final code = switch (request) {
      QrVerification(:final code) => code.value,
      _ => '',
    };
    if (request.plate == _unknownPlate || code.endsWith('-404')) {
      yield const NoVehicleFound(
        location: RecordLocation(latitude: 6.6018, longitude: 3.3515),
      );
      return;
    }
    if (request.plate == _unavailablePlate || code.endsWith('-503')) {
      throw const VerificationFailure('CHL is not responding.');
    }
    final plate = request.plate ?? _qrCodePlate;
    yield VehicleIdentified(plate);

    yield const StageStarted(VerificationStage.validatingETag);
    await Future<void>.delayed(stepDelay);
    final eTag = switch (request) {
      TagVerification() => ETagStatus.valid,
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
        vehicleType: '12/14 tyres and its equivalent',
        eTagStatus: eTag,
        tripStatus: TripStatus.noActive,
        checkedAt: at,
        lastTrip: _lastTrip(at),
      );
    }
    final started = at.subtract(const Duration(hours: 2, minutes: 8));
    return VerificationResult(
      plate: plate,
      vehicleType: '12/14 tyres and its equivalent',
      eTagStatus: eTag,
      tripStatus: TripStatus.active,
      checkedAt: at,
      trip: ChlTrip(
        transactionReference: '564031956608',
        startedAt: started,
        paidAt: started.subtract(const Duration(minutes: 6)),
        transactionType: 'Complete Leg',
        transactionStatus: 'Successful',
        originState: 'Ogun',
        originLga: 'Abeokuta South',
        destinationState: 'Lagos',
        destinationLga: 'Ikeja',
        validUntil: at.add(const Duration(hours: 4, minutes: 21, seconds: 2)),
        cargo: 'General haulage',
        paymentReference: 'PAY-2026-08142',
        terminalId: '2070MJHU',
        contactNumber: '8139751699',
        channel: 'Fortis',
        channelType: 'POS',
      ),
      destinationCheck: const DestinationCheck(
        enforcementPoint: 'Ikeja enforcement point',
        completionDecision: 'Awaiting central validation',
        centralDelay: Duration(seconds: 900),
      ),
    );
  }

  /// LND 482 XK's last trip: Abeokuta South, Ogun, to Ikeja, Lagos,
  /// completed the day before.
  ChlTrip _lastTrip(DateTime at) {
    final started = at.subtract(const Duration(days: 1, hours: 8));
    return ChlTrip(
      transactionReference: '564031950271',
      startedAt: started,
      paidAt: started.subtract(const Duration(minutes: 6)),
      transactionType: 'Complete Leg',
      transactionStatus: 'Successful',
      originState: 'Ogun',
      originLga: 'Abeokuta South',
      destinationState: 'Lagos',
      destinationLga: 'Ikeja',
      validUntil: started.add(const Duration(hours: 12)),
      cargo: 'General haulage',
      paymentReference: 'PAY-2026-07960',
      terminalId: '2070MJHU',
      contactNumber: '8139751699',
      channel: 'Fortis',
      channelType: 'POS',
      state: ChlTripState.completed,
      completedAt: started.add(const Duration(hours: 5, minutes: 17)),
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
      lastTrip: result.lastTrip,
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
