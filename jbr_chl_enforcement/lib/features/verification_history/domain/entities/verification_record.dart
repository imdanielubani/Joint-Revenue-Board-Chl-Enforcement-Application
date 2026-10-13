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

  /// The verification did not finish (e.g. no connection); nothing about
  /// the trip or E-Tag was concluded.
  notCompleted,
}

/// One vehicle verification: of its CHL trip ([tripStatus]) or of its E-Tag
/// ([eTagStatus]). Exactly one of the two is set, unless the verification
/// did not finish ([VerificationOutcome.notCompleted]), when neither is.
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
         outcome == VerificationOutcome.notCompleted
             ? tripStatus == null && eTagStatus == null
             : (tripStatus == null) != (eTagStatus == null),
         'A finished record is about either a CHL trip or an E-Tag; an '
         'unfinished one about neither.',
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

  /// Whether the verification finished with a trip or E-Tag result.
  bool get isCompleted => outcome != VerificationOutcome.notCompleted;
}
