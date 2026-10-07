import '../entities/dashboard_summary.dart';

/// Source of the dashboard's daily figures.
abstract interface class DashboardRepository {
  /// Activity for the day containing [day] (local time).
  Future<DashboardSummary> getSummary(DateTime day);
}
