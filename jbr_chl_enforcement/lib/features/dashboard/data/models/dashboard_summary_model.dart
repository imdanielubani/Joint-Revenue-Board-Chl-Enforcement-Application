import '../../../auth/domain/entities/officer.dart';
import '../../../verification_history/data/models/verification_record_model.dart';
import '../../domain/entities/dashboard_summary.dart';

/// JSON mapping for [DashboardSummary], from `GET /dashboard`:
///
/// ```json
/// {
///   "totals": { "verifications": 4, "activeTrips": 1, "noActiveTrips": 2,
///               "violationsIssued": 0 },
///   "recentVerifications": [ … ]
/// }
/// ```
abstract final class DashboardSummaryModel {
  /// Throws [FormatException] on an answer the app can't read.
  static DashboardSummary fromJson(
    Map<String, dynamic> json, {
    required Officer? officer,
  }) {
    final totals = json['totals'];
    if (totals is! Map<String, dynamic>) {
      throw const FormatException('Missing totals');
    }
    int count(String key) => (totals[key] as num?)?.toInt() ?? 0;
    return DashboardSummary(
      totalVerifications: count('verifications'),
      activeTrips: count('activeTrips'),
      noActiveTrips: count('noActiveTrips'),
      violationsIssued: count('violationsIssued'),
      recentVerifications: VerificationRecordModel.listFromJson(
        json['recentVerifications'],
        officer: officer,
      ),
    );
  }
}
