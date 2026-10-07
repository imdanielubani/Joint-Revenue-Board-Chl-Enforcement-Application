import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/dashboard_repository_impl.dart';
import '../../domain/entities/dashboard_summary.dart';
import '../../domain/usecases/get_dashboard_summary.dart';

/// Clock for "today"; overridden in tests.
final clockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

/// Today's activity. Refresh with `ref.invalidate(dashboardSummaryProvider)`.
final dashboardSummaryProvider = FutureProvider.autoDispose<DashboardSummary>((
  ref,
) {
  final now = ref.watch(clockProvider)();
  return GetDashboardSummary(ref.watch(dashboardRepositoryProvider))(now);
});
