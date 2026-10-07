import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/features/dashboard/data/repositories/dashboard_repository_impl.dart';

void main() {
  final day = DateTime(2026, 10, 4, 15);

  test('local repository starts empty', () async {
    final summary = await const LocalDashboardRepository().getSummary(day);

    expect(summary.totalVerifications, 0);
    expect(summary.activeTrips, 0);
    expect(summary.noActiveTrips, 0);
    expect(summary.violationsIssued, 0);
    expect(summary.recentVerifications, isEmpty);
  });

  test('demo repository gives a consistent sample day', () async {
    final summary = await const DemoDashboardRepository().getSummary(day);

    expect(summary.totalVerifications, 5);
    expect(summary.activeTrips, 3);
    expect(summary.noActiveTrips, 1);
    expect(summary.violationsIssued, 1);
    expect(summary.recentVerifications, hasLength(5));

    // Newest first, all on the requested day.
    final times = summary.recentVerifications
        .map((record) => record.recordedAt)
        .toList();
    for (var i = 1; i < times.length; i++) {
      expect(times[i].isBefore(times[i - 1]), isTrue);
    }
    expect(
      times.every(
        (time) =>
            time.year == day.year &&
            time.month == day.month &&
            time.day == day.day,
      ),
      isTrue,
    );
  });
}
