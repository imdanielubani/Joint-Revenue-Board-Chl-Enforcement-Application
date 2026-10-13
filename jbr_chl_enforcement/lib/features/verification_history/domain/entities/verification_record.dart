import 'package:flutter/foundation.dart';

import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../vehicle/domain/entities/e_tag_status.dart';
import '../../../verification/domain/entities/verification_method.dart';

/// What the officer's verification led to.
enum VerificationOutcome {
  /// A CHL trip check passed.
  verified,

  /// Checked and recorded; no further action (e.g. no active trip found).
  checked,

  /// An E-Tag check passed.
  validated,

  /// A violation case was opened.
  caseCreated,

  /// Passed to a supervisor.
  escalated,
}

/// One completed vehicle verification: of its CHL trip ([tripStatus]) or of
/// its E-Tag ([eTagStatus]). Exactly one of the two is set.
@immutable
class VerificationRecord {
  const VerificationRecord({
    required this.id,
    required this.plateNumber,
    this.tripStatus,
    this.eTagStatus,
    required this.method,
    required this.outcome,
    required this.recordedAt,
  }) : assert(
         (tripStatus == null) != (eTagStatus == null),
         'A record is about either a CHL trip or an E-Tag.',
       );

  final String id;
  final String plateNumber;

  /// Set for a CHL trip verification.
  final TripStatus? tripStatus;

  /// Set for an E-Tag verification.
  final ETagStatus? eTagStatus;

  final VerificationMethod method;
  final VerificationOutcome outcome;
  final DateTime recordedAt;

  bool get isETagCheck => eTagStatus != null;
}
