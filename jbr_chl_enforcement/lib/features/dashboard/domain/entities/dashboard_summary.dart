import 'package:flutter/foundation.dart';

import '../../../verification_history/domain/entities/verification_record.dart';

/// The officer's activity for one day, shown on the dashboard.
@immutable
class DashboardSummary {
  const DashboardSummary({
    required this.totalVerifications,
    required this.activeTrips,
    required this.noActiveTrips,
    required this.violationsIssued,
    required this.recentVerifications,
  });

  /// Nothing recorded yet.
  static const empty = DashboardSummary(
    totalVerifications: 0,
    activeTrips: 0,
    noActiveTrips: 0,
    violationsIssued: 0,
    recentVerifications: [],
  );

  /// Verification attempts recorded today.
  final int totalVerifications;

  /// Verifications that found an active trip.
  final int activeTrips;

  /// Verifications that found no active trip.
  final int noActiveTrips;

  /// Violation cases issued today.
  final int violationsIssued;

  /// Latest verifications, newest first.
  final List<VerificationRecord> recentVerifications;
}
