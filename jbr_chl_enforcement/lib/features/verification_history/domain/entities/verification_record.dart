import 'package:flutter/foundation.dart';

import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../verification/domain/entities/verification_method.dart';

/// What the officer's verification led to.
enum VerificationOutcome {
  verified,

  /// A violation case was opened.
  caseCreated,

  /// Passed to a supervisor.
  escalated,
}

/// One completed vehicle verification.
@immutable
class VerificationRecord {
  const VerificationRecord({
    required this.id,
    required this.plateNumber,
    required this.tripStatus,
    required this.method,
    required this.outcome,
    required this.recordedAt,
  });

  final String id;
  final String plateNumber;
  final TripStatus tripStatus;
  final VerificationMethod method;
  final VerificationOutcome outcome;
  final DateTime recordedAt;
}
