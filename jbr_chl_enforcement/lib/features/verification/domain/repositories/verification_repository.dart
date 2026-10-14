import 'package:flutter/foundation.dart';

import '../../../../shared/device/location/location_adapter.dart';
import '../../../vehicle/domain/entities/load_status.dart';
import '../../../vehicle/domain/entities/verification_result.dart';
import '../entities/plate_number.dart';
import '../entities/verification_request.dart';

/// Runs verifications with CHL.
abstract class VerificationRepository {
  /// Verifies [request]: reports each [VerificationStage] as it starts,
  /// the plate once the vehicle is identified, and ends with the result,
  /// or with [NoVehicleFound] when CHL has no such vehicle. Fails with a
  /// [VerificationFailure] when CHL cannot be reached or cannot finish.
  /// Cancelling the subscription abandons the verification. [location] is
  /// where the officer is: every verification records it.
  Stream<VerificationProgress> verify(
    VerificationRequest request, {
    required DeviceLocation location,
  });

  /// Asks CHL again for the trip of an earlier [result].
  Future<VerificationResult> refresh(VerificationResult result);

  /// Sends whether the vehicle of [result], which has no active trip, is
  /// carrying haulage goods, as the officer confirmed.
  Future<void> recordLoadStatus(VerificationResult result, LoadStatus status);

  /// Sends the officer's [location] for the destination check of the trip
  /// with [transactionReference]; returns it as CHL received it.
  Future<RecordedLocation> recordDestinationLocation(
    String transactionReference,
    DeviceLocation location,
  );
}

/// One step of a verification in progress.
@immutable
sealed class VerificationProgress {
  const VerificationProgress();
}

/// [stage] has started.
final class StageStarted extends VerificationProgress {
  const StageStarted(this.stage);

  final VerificationStage stage;
}

/// The vehicle was identified as [plate].
final class VehicleIdentified extends VerificationProgress {
  const VehicleIdentified(this.plate);

  final PlateNumber plate;
}

/// CHL has no vehicle for the request; the verification ends here.
final class NoVehicleFound extends VerificationProgress {
  const NoVehicleFound();
}

/// Every check finished.
final class VerificationCompleted extends VerificationProgress {
  const VerificationCompleted(this.result);

  final VerificationResult result;
}

/// A verification, refresh or location record that could not be done.
class VerificationFailure implements Exception {
  const VerificationFailure(this.message);

  /// Shown to the officer.
  final String message;

  @override
  String toString() => 'VerificationFailure: $message';
}
