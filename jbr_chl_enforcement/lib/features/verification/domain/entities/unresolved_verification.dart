import 'package:flutter/foundation.dart';

import '../../../verification_history/domain/entities/verification_record_details.dart';
import 'verification_request.dart';

/// A verification that ended without a result for a vehicle: nothing about
/// its E-Tag or trip was concluded.
@immutable
sealed class UnresolvedVerification {
  const UnresolvedVerification({
    required this.request,
    required this.checkedAt,
  });

  /// What the officer asked to verify.
  final VerificationRequest request;

  final DateTime checkedAt;
}

/// CHL has no vehicle for the request, e.g. a mistyped plate.
final class VehicleNotFound extends UnresolvedVerification {
  const VehicleNotFound({
    required super.request,
    required super.checkedAt,
    this.location,
  });

  /// Where the check was made, when CHL recorded it.
  final RecordLocation? location;
}

/// CHL could not be reached or could not finish the checks.
final class VerificationUnavailable extends UnresolvedVerification {
  const VerificationUnavailable({
    required super.request,
    required super.checkedAt,
  });
}
