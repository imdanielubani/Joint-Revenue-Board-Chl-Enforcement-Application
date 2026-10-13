import 'package:flutter/foundation.dart';

import '../../../vehicle/domain/entities/e_tag_status.dart';

/// Where a verification was made.
@immutable
class RecordLocation {
  const RecordLocation({required this.latitude, required this.longitude});

  final double latitude;
  final double longitude;

  @override
  bool operator ==(Object other) =>
      other is RecordLocation &&
      other.latitude == latitude &&
      other.longitude == longitude;

  @override
  int get hashCode => Object.hash(latitude, longitude);
}

/// The full record of a verification, shown on its record page: who made
/// it, of what vehicle, and what followed.
@immutable
class VerificationRecordDetails {
  const VerificationRecordDetails({
    required this.reference,
    required this.vehicleType,
    required this.agentName,
    required this.agentId,
    required this.actionTaken,
    this.tagStatus,
    this.pendingAction,
    this.violationIssued = false,
    this.location,
  });

  /// e.g. "VRE-222-001".
  final String reference;

  /// e.g. "Heavy goods vehicle".
  final String vehicleType;

  /// The officer who made the verification, and their badge number.
  final String agentName;
  final String agentId;

  /// e.g. "Verified", "Unverified".
  final String actionTaken;

  /// The vehicle's E-Tag as read during the check; null when it was not.
  final ETagStatus? tagStatus;

  /// What still has to be done, e.g. "Complete required evidence and
  /// submit"; null when nothing.
  final String? pendingAction;

  final bool violationIssued;

  /// Null when no GPS fix was recorded.
  final RecordLocation? location;
}
