import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/main_shell_scaffold.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_session.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/officer.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/session_provider.dart';
import 'package:jbr_chl_enforcement/features/dashboard/data/repositories/dashboard_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/dashboard/domain/entities/dashboard_summary.dart';
import 'package:jbr_chl_enforcement/features/dashboard/domain/repositories/dashboard_repository.dart';
import 'package:jbr_chl_enforcement/features/dashboard/presentation/providers/dashboard_controller.dart';
import 'package:jbr_chl_enforcement/features/dashboard/presentation/screens/dashboard_screen.dart';
import 'package:jbr_chl_enforcement/features/notifications/presentation/providers/notifications_controller.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/presentation/providers/sync_controller.dart';
import 'package:jbr_chl_enforcement/shared/device/connectivity/connectivity_adapter.dart';
import 'package:jbr_chl_enforcement/shared/device/location/location_adapter.dart';
import 'package:jbr_chl_enforcement/shared/device/rfid/rfid_reader_adapter.dart';

const _officer = Officer(
  id: '1',
  name: 'Daniel John',
  email: 'daniel@jrb.gov.ng',
  region: 'Lagos State',
  role: 'Enforcement Agent',
);

/// Demo figures, counting how often they are requested.
class _CountingRepository implements DashboardRepository {
  int calls = 0;

  @override
  Future<DashboardSummary> getSummary(DateTime day) {
    calls++;
    return const DemoDashboardRepository().getSummary(day);
  }
}

class _FailingRepository implements DashboardRepository {
  int calls = 0;

  @override
  Future<DashboardSummary> getSummary(DateTime day) async {
    calls++;
    throw StateError('database unavailable');
  }
}

Widget _page(String label) => Scaffold(body: Center(child: Text(label)));

GoRouter _router() => GoRouter(
  initialLocation: RoutePaths.dashboard,
  routes: [
    StatefulShellRoute.indexedStack(
      builder: (context, state, shell) =>
          MainShellScaffold(navigationShell: shell),
      branches: [
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: RoutePaths.dashboard,
              name: RouteNames.dashboard,
              builder: (context, state) => const DashboardScreen(),
            ),
          ],
        ),
        for (final (path, name) in [
          (RoutePaths.history, RouteNames.history),
          (RoutePaths.notifications, RouteNames.notifications),
          (RoutePaths.profile, RouteNames.profile),
        ])
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: path,
                name: name,
                builder: (context, state) => _page('$name page'),
              ),
            ],
          ),
      ],
    ),
    for (final (path, name) in [
      (RoutePaths.sos, RouteNames.sos),
      (RoutePaths.verifyTrip, RouteNames.verifyTrip),
      (RoutePaths.verifyETag, RouteNames.verifyETag),
    ])
      GoRoute(
        path: path,
        name: name,
        builder: (context, state) => _page('$name page'),
      ),
  ],
);

Future<void> _pump(
  WidgetTester tester, {
  Size size = const Size(390, 844),
  EdgeInsets safeArea = const EdgeInsets.only(top: 47, bottom: 34),
  double textScale = 1,
  DashboardRepository? repository,
  bool online = true,
  bool gps = true,
  bool rfid = true,
  int pending = 0,
  int unread = 0,
}) async {
  final padding = FakeViewPadding(
    left: safeArea.left * 3,
    top: safeArea.top * 3,
    right: safeArea.right * 3,
    bottom: safeArea.bottom * 3,
  );
  tester.view
    ..physicalSize = size * 3
    ..devicePixelRatio = 3
    ..padding = padding
    ..viewPadding = padding;
  tester.platformDispatcher.textScaleFactorTestValue = textScale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

  final container = ProviderContainer(
    overrides: [
      dashboardRepositoryProvider.overrideWithValue(
        repository ?? const DemoDashboardRepository(),
      ),
      clockProvider.overrideWithValue(() => DateTime(2026, 10, 4, 10)),
      internetStatusProvider.overrideWith((ref) => Stream.value(online)),
      gpsStatusProvider.overrideWith((ref) => Stream.value(gps)),
      rfidReaderConnectedProvider.overrideWithValue(rfid),
      pendingSyncCountProvider.overrideWithValue(pending),
      unreadNotificationCountProvider.overrideWithValue(unread),
    ],
  );
  addTearDown(container.dispose);
  container
      .read(sessionProvider.notifier)
      .start(const AuthSession(accessToken: 'token', officer: _officer));

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: _router()),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets("shows the officer, actions, status and today's activity", (
    tester,
  ) async {
    await _pump(tester);

    expect(find.text('Sun, 4 Oct 2026'), findsOneWidget);
    expect(find.text('DJ'), findsOneWidget);
    expect(find.text('Daniel John'), findsOneWidget);
    expect(find.text('Lagos State · Enforcement Agent'), findsOneWidget);
    expect(find.text('Verify CHL Trip'), findsOneWidget);
    expect(find.text('Verify E-Tag'), findsOneWidget);

    expect(find.bySemanticsLabel('Internet: Online'), findsOneWidget);
    expect(find.bySemanticsLabel('GPS: Online'), findsOneWidget);
    expect(find.bySemanticsLabel('RFID reader: Connected'), findsOneWidget);
    expect(find.bySemanticsLabel('Sync: Up to date'), findsOneWidget);

    expect(
      find.bySemanticsLabel('Total Verifications: 5. Recorded attempts'),
      findsOneWidget,
    );
    expect(
      find.bySemanticsLabel('Active Trips: 3. Active-trip results'),
      findsOneWidget,
    );
    expect(
      find.bySemanticsLabel('No Active Trips: 1. No-active-trip results'),
      findsOneWidget,
    );
    expect(
      find.bySemanticsLabel('Violations Issued: 1. Acknowledged cases'),
      findsOneWidget,
    );

    await tester.ensureVisible(find.text('GGE 651 PL'));
    for (final plate in [
      'ABC 123 AA',
      'LND 482 XK',
      'KJA 719 FG',
      'AKD 308 TY',
      'GGE 651 PL',
    ]) {
      expect(find.text(plate), findsOneWidget);
    }
    expect(find.text('No active trip · Manual plate'), findsOneWidget);
    expect(find.text('Previous trip · RFID'), findsOneWidget);
    expect(find.text('Case created'), findsOneWidget);
    expect(find.text('Escalated'), findsOneWidget);
    expect(find.text('09:34 AM'), findsOneWidget);
  });

  testWidgets('offline state shows offline tiles and queued sync', (
    tester,
  ) async {
    await _pump(tester, online: false, gps: false, rfid: false, pending: 2);

    expect(find.bySemanticsLabel('Internet: Offline'), findsOneWidget);
    expect(find.bySemanticsLabel('GPS: Offline'), findsOneWidget);
    expect(find.bySemanticsLabel('RFID reader: Offline'), findsOneWidget);
    expect(find.bySemanticsLabel('Offline sync: 2 queued'), findsOneWidget);
  });

  testWidgets('online with queued actions shows Sync with the count', (
    tester,
  ) async {
    await _pump(tester, pending: 1);

    expect(find.bySemanticsLabel('Sync: 1 queued'), findsOneWidget);
  });

  testWidgets('no badge without unread notifications', (tester) async {
    await _pump(tester);

    expect(find.bySemanticsLabel('Notifications'), findsWidgets);
    expect(find.bySemanticsLabel(RegExp('unread')), findsNothing);
  });

  testWidgets('the badge shows the unread count', (tester) async {
    await _pump(tester, unread: 4);

    expect(find.bySemanticsLabel('Notifications, 4 unread'), findsOneWidget);
    expect(find.text('4'), findsOneWidget);
  });

  testWidgets('large unread counts are capped at 99+', (tester) async {
    await _pump(tester, unread: 250);

    expect(find.text('99+'), findsOneWidget);
  });

  testWidgets('a day with no records shows zeros and an empty list', (
    tester,
  ) async {
    await _pump(tester, repository: const LocalDashboardRepository());

    expect(
      find.bySemanticsLabel('Total Verifications: 0. Recorded attempts'),
      findsOneWidget,
    );
    await tester.ensureVisible(find.text('No verifications yet today.'));
    expect(find.text('No verifications yet today.'), findsOneWidget);
  });

  testWidgets('a load failure offers retry', (tester) async {
    final repository = _FailingRepository();
    await _pump(tester, repository: repository);

    expect(find.text("Couldn't load today's activity."), findsOneWidget);
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();
    expect(repository.calls, 2);
  });

  testWidgets('pull to refresh reloads the figures', (tester) async {
    final repository = _CountingRepository();
    await _pump(tester, repository: repository);
    expect(repository.calls, 1);

    await tester.fling(find.text('Daniel John'), const Offset(0, 400), 1000);
    await tester.pumpAndSettle();
    expect(repository.calls, 2);
  });

  group('navigation', () {
    final cases = <(String, Finder Function(), String)>[
      ('SOS', () => find.bySemanticsLabel('SOS emergency'), 'sos page'),
      (
        'the bell',
        () => find.bySemanticsLabel('Notifications').first,
        'notifications page',
      ),
      (
        'Verify CHL Trip',
        () => find.text('Verify CHL Trip'),
        'verify-trip page',
      ),
      ('Verify E-Tag', () => find.text('Verify E-Tag'), 'verify-e-tag page'),
    ];
    for (final (label, finder, destination) in cases) {
      testWidgets('$label opens its page', (tester) async {
        await _pump(tester);
        await tester.tap(finder());
        await tester.pumpAndSettle();
        expect(find.text(destination), findsOneWidget);
      });
    }

    testWidgets('View all opens history', (tester) async {
      await _pump(tester);
      // Bring "View all" on screen, then clear of the floating bar.
      await tester.ensureVisible(find.text('View all'));
      await tester.drag(find.byType(ListView), const Offset(0, -200));
      await tester.pumpAndSettle();
      await tester.tap(find.text('View all'));
      await tester.pumpAndSettle();
      expect(find.text('history page'), findsOneWidget);
    });

    testWidgets('the bottom bar switches tabs and keeps the dashboard', (
      tester,
    ) async {
      await _pump(tester);
      await tester.tap(find.bySemanticsLabel('Profile'));
      await tester.pumpAndSettle();
      expect(find.text('profile page'), findsOneWidget);

      await tester.tap(find.bySemanticsLabel('Dashboard'));
      await tester.pumpAndSettle();
      expect(find.text('Daniel John'), findsOneWidget);
    });
  });

  group('fits', () {
    final devices = <(String, Size, EdgeInsets, double)>[
      (
        'small Android, 3-button nav',
        const Size(360, 640),
        const EdgeInsets.only(top: 24, bottom: 48),
        1,
      ),
      (
        'narrow 320x568',
        const Size(320, 568),
        const EdgeInsets.only(top: 20),
        1,
      ),
      ('iPhone SE', const Size(375, 667), const EdgeInsets.only(top: 20), 1),
      (
        'iPhone 15 Pro Max',
        const Size(430, 932),
        const EdgeInsets.only(top: 59, bottom: 34),
        1,
      ),
      (
        'Galaxy Fold inner',
        const Size(673, 841),
        const EdgeInsets.only(top: 24, bottom: 24),
        1,
      ),
      (
        'iPad Pro 12.9',
        const Size(1024, 1366),
        const EdgeInsets.only(top: 24, bottom: 20),
        1,
      ),
      (
        'iPhone landscape',
        const Size(844, 390),
        const EdgeInsets.only(left: 47, right: 47, bottom: 21),
        1,
      ),
      (
        'iPhone 15 Pro, 200% text',
        const Size(393, 852),
        const EdgeInsets.only(top: 59, bottom: 34),
        2,
      ),
      (
        'small Android, 200% text',
        const Size(360, 640),
        const EdgeInsets.only(top: 24, bottom: 48),
        2,
      ),
    ];
    for (final (name, size, safeArea, textScale) in devices) {
      testWidgets(name, (tester) async {
        await _pump(
          tester,
          size: size,
          safeArea: safeArea,
          textScale: textScale,
          online: false,
          gps: false,
          rfid: false,
          pending: 12,
          unread: 120,
        );
        expect(tester.takeException(), isNull);

        // The last record scrolls clear of the floating navigation bar.
        await tester.drag(find.byType(ListView), const Offset(0, -6000));
        await tester.pumpAndSettle();
        final last = find.text('GGE 651 PL');
        final navTop = tester
            .getTopLeft(find.bySemanticsLabel('Main navigation'))
            .dy;
        expect(tester.getBottomLeft(last).dy, lessThan(navTop));
        expect(tester.takeException(), isNull);
      });
    }
  });
}
