import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/main_shell_scaffold.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/core/utils/clock.dart';
import 'package:jbr_chl_enforcement/features/notifications/data/repositories/notifications_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/notifications/domain/entities/app_notification.dart';
import 'package:jbr_chl_enforcement/features/notifications/domain/entities/notification_type.dart';
import 'package:jbr_chl_enforcement/features/notifications/presentation/providers/notifications_controller.dart';
import 'package:jbr_chl_enforcement/features/notifications/presentation/screens/notification_details_screen.dart';
import 'package:jbr_chl_enforcement/features/notifications/presentation/screens/notifications_screen.dart';
import 'package:jbr_chl_enforcement/features/notifications/presentation/widgets/notification_tile.dart';
import 'package:jbr_chl_enforcement/features/notifications/presentation/widgets/notifications_skeleton.dart';

import '../../../helpers/fakes.dart';

final _now = DateTime(2026, 10, 13, 10);

final _inbox = [
  AppNotification(
    id: 'n-verify',
    type: NotificationType.incompleteVerification,
    title: 'Review an incomplete verification',
    summary: 'BDG 204 XY could not be verified.',
    body: 'The receipt QR verification for BDG 204 XY did not complete.',
    receivedAt: DateTime(2026, 10, 13, 9, 40),
    verificationRecordId: 'VR-1042',
  ),
  AppNotification(
    id: 'n-location',
    type: NotificationType.locationAttention,
    title: 'Location needs your attention',
    summary: 'GPS was unavailable for a recent location request.',
    body: 'Check that location services are enabled.',
    receivedAt: DateTime(2026, 10, 13, 9, 32),
  ),
  AppNotification(
    id: 'n-rfid',
    type: NotificationType.rfidConnected,
    title: 'RFID reader connected',
    summary: 'Your reader connected successfully.',
    body: 'The RFID reader was connected at the time of this update.',
    receivedAt: DateTime(2026, 10, 13, 9, 25),
    isRead: true,
  ),
  AppNotification(
    id: 'n-session',
    type: NotificationType.sessionExpiry,
    title: 'Session expiry reminder',
    summary: 'Sign in again when your session expires.',
    body: 'Your CHL session is managed centrally.',
    receivedAt: DateTime(2026, 10, 10, 16, 15),
    isRead: true,
  ),
];

Widget _page(String label) => Scaffold(body: Center(child: Text(label)));

GoRouter _router(String initialLocation) => GoRouter(
  initialLocation: initialLocation,
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
              builder: (context, state) => _page('dashboard page'),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: RoutePaths.history,
              name: RouteNames.history,
              builder: (context, state) => _page('history page'),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: RoutePaths.notifications,
              name: RouteNames.notifications,
              builder: (context, state) => const NotificationsScreen(),
              routes: [
                GoRoute(
                  path: ':id',
                  name: RouteNames.notificationDetails,
                  builder: (context, state) => NotificationDetailsScreen(
                    id: state.pathParameters['id']!,
                  ),
                ),
              ],
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: RoutePaths.profile,
              name: RouteNames.profile,
              builder: (context, state) => _page('profile page'),
            ),
          ],
        ),
      ],
    ),
    // Full screen, above the tabs, as in the app.
    GoRoute(
      path: RoutePaths.historyRecord,
      name: RouteNames.historyRecord,
      builder: (context, state) =>
          _page('record ${state.pathParameters['id']} page'),
    ),
  ],
);

class _Harness {
  _Harness(this.container, this.repository, this.router);

  final ProviderContainer container;
  final FakeNotificationsRepository repository;
  final GoRouter router;
}

Future<_Harness> _pump(
  WidgetTester tester, {
  List<AppNotification>? inbox,
  FakeNotificationsRepository? repository,
  String at = RoutePaths.notifications,
  Size size = const Size(390, 844),
  double textScale = 1,
  bool settle = true,
}) async {
  const padding = FakeViewPadding(top: 47 * 3, bottom: 34 * 3);
  tester.view
    ..physicalSize = size * 3
    ..devicePixelRatio = 3
    ..padding = padding
    ..viewPadding = padding;
  tester.platformDispatcher.textScaleFactorTestValue = textScale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

  final fake = repository ?? FakeNotificationsRepository(inbox ?? _inbox);
  final container = ProviderContainer(
    overrides: [
      notificationsRepositoryProvider.overrideWithValue(fake),
      clockProvider.overrideWithValue(() => _now),
    ],
  );
  addTearDown(container.dispose);
  final router = _router(at);
  addTearDown(router.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  if (settle) await tester.pumpAndSettle();
  return _Harness(container, fake, router);
}

Finder _dots() => find.byWidgetPredicate(
  (widget) =>
      widget is Container &&
      widget.constraints?.maxWidth == 6.994 &&
      widget.constraints?.maxHeight == 6.994,
);

Finder _tile(String title) => find.ancestor(
  of: find.text(title),
  matching: find.byType(NotificationTile),
);

void main() {
  setUpAll(() async {
    final loader = FontLoader('Poppins');
    for (final weight in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
      loader.addFont(
        rootBundle.load('assets/fonts/poppins/Poppins-$weight.ttf'),
      );
    }
    await loader.load();
  });

  test('summarises the unread count', () {
    expect(NotificationsScreen.unreadSummary(0), 'All notifications read');
    expect(NotificationsScreen.unreadSummary(1), '1 unread notification');
    expect(NotificationsScreen.unreadSummary(3), '3 unread notifications');
  });

  group('inbox', () {
    testWidgets('shows the skeleton while loading', (tester) async {
      final repository = FakeNotificationsRepository(_inbox)
        ..gate = Completer<void>();
      await _pump(tester, repository: repository, settle: false);
      await tester.pump();

      expect(find.byType(NotificationsSkeleton), findsOneWidget);
      expect(find.text(NotificationsSkeleton.label), findsOneWidget);
      expect(find.text('Notifications'), findsWidgets);
      expect(find.byType(NotificationTile), findsNothing);
      // No tabs or Mark all as read until the inbox is known.
      expect(find.text('Mark all as read'), findsNothing);

      repository.gate!.complete();
      await tester.pumpAndSettle();
      expect(find.byType(NotificationsSkeleton), findsNothing);
      expect(find.byType(NotificationTile), findsWidgets);
    });

    testWidgets('lists notifications by day, newest first', (tester) async {
      await _pump(tester);

      expect(find.text('Notification'), findsWidgets);
      expect(
        find.text('Stay informed while you’re in the field'),
        findsOneWidget,
      );
      expect(find.text('All'), findsOneWidget);
      expect(find.text('Unread (2)'), findsOneWidget);
      expect(find.text('2 unread notifications'), findsOneWidget);
      expect(find.text('Mark all as read'), findsOneWidget);
      expect(find.text('Today'), findsOneWidget);
      expect(find.text('Review an incomplete verification'), findsOneWidget);
      expect(find.text('BDG 204 XY could not be verified.'), findsOneWidget);
      expect(find.text('Verification · 09:40 AM · Unread'), findsOneWidget);
      expect(find.text('Device readiness · 09:32 AM · Unread'), findsOneWidget);
      expect(find.text('RFID reader · 09:25 AM · Read'), findsOneWidget);
      expect(_dots(), findsNWidgets(2));

      await tester.scrollUntilVisible(
        find.text('Session expiry reminder'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('10 Oct 2026'), findsOneWidget);
      expect(find.text('Account · 04:15 PM · Read'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('rows read out title, state, summary and line', (tester) async {
      await _pump(tester);

      expect(
        find.bySemanticsLabel(
          'Review an incomplete verification. Unread. '
          'BDG 204 XY could not be verified.. '
          'Verification · 09:40 AM · Unread',
        ),
        findsOneWidget,
      );
    });

    testWidgets('screen readers can open a row and mark all as read', (
      tester,
    ) async {
      final harness = await _pump(tester);
      tester.semantics.tap(find.semantics.byLabel('Mark all as read'));
      await tester.pumpAndSettle();
      expect(harness.repository.markAllCount, 1);

      tester.semantics.tap(
        find.semantics.byLabel(RegExp('^Location needs your attention')),
      );
      await tester.pumpAndSettle();
      expect(find.byType(NotificationDetailsScreen), findsOneWidget);
    });

    testWidgets('the bell count follows the unread notifications', (
      tester,
    ) async {
      final harness = await _pump(tester);

      expect(harness.container.read(unreadNotificationCountProvider), 2);
      await tester.tap(find.text('Mark all as read'));
      await tester.pumpAndSettle();
      expect(harness.container.read(unreadNotificationCountProvider), 0);
    });

    testWidgets('Unread lists only unread notifications', (tester) async {
      await _pump(tester);

      await tester.tap(find.text('Unread (2)'));
      await tester.pumpAndSettle();

      expect(find.byType(NotificationTile), findsNWidgets(2));
      expect(find.text('RFID reader connected'), findsNothing);
      expect(
        tester.getSemantics(find.bySemanticsLabel('Unread (2)')),
        matchesSemantics(
          label: 'Unread (2)',
          isButton: true,
          hasSelectedState: true,
          isSelected: true,
          hasTapAction: true,
        ),
      );
    });

    testWidgets('Mark all as read clears the dots and greys itself out', (
      tester,
    ) async {
      final harness = await _pump(tester);

      await tester.tap(find.text('Mark all as read'));
      await tester.pumpAndSettle();

      expect(harness.repository.markAllCount, 1);
      expect(_dots(), findsNothing);
      expect(find.text('All notifications read'), findsOneWidget);
      expect(find.text('Unread'), findsOneWidget);
      expect(find.text('Verification · 09:40 AM · Read'), findsOneWidget);

      // Nothing more to mark.
      await tester.tap(find.text('Mark all as read'));
      await tester.pumpAndSettle();
      expect(harness.repository.markAllCount, 1);
    });

    testWidgets('a refused Mark all as read puts the dots back', (
      tester,
    ) async {
      final harness = await _pump(tester);
      harness.repository.markError = StateError('server error');

      await tester.tap(find.text('Mark all as read'));
      await tester.pumpAndSettle();

      expect(_dots(), findsNWidgets(2));
      expect(find.text('2 unread notifications'), findsOneWidget);
    });

    testWidgets('Unread with nothing unread: all caught up', (tester) async {
      await _pump(tester);
      await tester.tap(find.text('Mark all as read'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Unread'));
      await tester.pumpAndSettle();

      expect(find.text('You’re all caught up'), findsOneWidget);
      expect(
        find.text(
          'No unread notifications. Your earlier updates are still '
          'available in All.',
        ),
        findsOneWidget,
      );
      expect(find.byType(NotificationTile), findsNothing);

      await tester.tap(find.text('View all notifications'));
      await tester.pumpAndSettle();
      expect(find.byType(NotificationTile), findsWidgets);
      expect(find.text('You’re all caught up'), findsNothing);
    });

    testWidgets('an empty inbox: no notifications yet', (tester) async {
      await _pump(tester, inbox: const []);

      expect(find.text('No notifications yet'), findsOneWidget);
      expect(
        find.text(
          'Operational and account updates will appear here when you '
          'receive them.',
        ),
        findsOneWidget,
      );
      expect(find.text('All'), findsNothing);
      expect(find.text('Mark all as read'), findsNothing);

      await tester.tap(find.text('Back to dashboard'));
      await tester.pumpAndSettle();
      expect(find.text('dashboard page'), findsOneWidget);
    });

    testWidgets('a failed load says unavailable, and Try again reloads', (
      tester,
    ) async {
      final repository = FakeNotificationsRepository(_inbox)
        ..fetchError = StateError('server error');
      await _pump(tester, repository: repository);

      expect(find.text('Notifications unavailable'), findsOneWidget);
      expect(
        find.text(
          'We couldn’t load your inbox. This request error does not mean '
          'there are no notifications.',
        ),
        findsOneWidget,
      );
      expect(find.text('No notifications yet'), findsNothing);

      repository
        ..fetchError = null
        ..gate = Completer<void>();
      await tester.tap(find.text('Try again'));
      await tester.pump();
      await tester.pump();
      expect(find.byType(NotificationsSkeleton), findsOneWidget);

      repository.gate!.complete();
      await tester.pumpAndSettle();
      expect(repository.fetchCount, 2);
      expect(find.byType(NotificationTile), findsWidgets);
    });

    testWidgets('pulling down reloads the inbox', (tester) async {
      final harness = await _pump(tester);

      await tester.fling(
        find.byType(Scrollable).first,
        const Offset(0, 400),
        1000,
      );
      await tester.pumpAndSettle();

      expect(harness.repository.fetchCount, 2);
      expect(find.byType(NotificationTile), findsWidgets);
    });

    testWidgets('the last notification scrolls clear of the bar', (
      tester,
    ) async {
      await _pump(tester);

      await tester.drag(find.byType(Scrollable).first, const Offset(0, -3000));
      await tester.pumpAndSettle();

      final last = tester.getRect(_tile('Session expiry reminder'));
      final nav = tester.getRect(find.bySemanticsLabel('Main navigation'));
      expect(last.bottom, lessThan(nav.top));
    });

    testWidgets('back goes to the dashboard', (tester) async {
      await _pump(tester);

      await tester.tap(find.bySemanticsLabel('Back'));
      await tester.pumpAndSettle();

      expect(find.text('dashboard page'), findsOneWidget);
    });
  });

  group('details', () {
    testWidgets('opening a notification shows it and marks it read', (
      tester,
    ) async {
      final harness = await _pump(tester);

      await tester.tap(find.text('Location needs your attention'));
      await tester.pumpAndSettle();

      expect(find.byType(NotificationDetailsScreen), findsOneWidget);
      expect(find.text('Notification Details'), findsOneWidget);
      expect(find.text('Notification details'), findsOneWidget);
      expect(find.text('Device readiness'), findsOneWidget);
      expect(find.text('Location needs your attention'), findsOneWidget);
      expect(
        find.text('Check that location services are enabled.'),
        findsOneWidget,
      );
      expect(
        find.bySemanticsLabel('Received: Today · 09:32 AM'),
        findsOneWidget,
      );
      expect(find.bySemanticsLabel('Read status: Read'), findsOneWidget);
      expect(find.text('View Verification Record'), findsNothing);
      // Still inside the tab: the navigation bar shows.
      expect(find.bySemanticsLabel('Main navigation'), findsOneWidget);
      expect(harness.repository.markedRead, ['n-location']);

      await tester.tap(find.bySemanticsLabel('Back'));
      await tester.pumpAndSettle();
      expect(find.byType(NotificationsScreen), findsOneWidget);
      expect(find.text('Device readiness · 09:32 AM · Read'), findsOneWidget);
      expect(find.text('1 unread notification'), findsOneWidget);
    });

    testWidgets('a verification notification links to its record', (
      tester,
    ) async {
      await _pump(tester);
      await tester.tap(find.text('Review an incomplete verification'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('View Verification Record'));
      await tester.pumpAndSettle();

      expect(find.text('record VR-1042 page'), findsOneWidget);
    });

    testWidgets('an earlier notification shows its date', (tester) async {
      await _pump(tester, at: '${RoutePaths.notifications}/n-session');

      expect(
        find.bySemanticsLabel('Received: 10 Oct 2026 · 04:15 PM'),
        findsOneWidget,
      );
    });

    testWidgets('opened directly, it is marked read once loaded', (
      tester,
    ) async {
      final repository = FakeNotificationsRepository(_inbox)
        ..gate = Completer<void>();
      final harness = await _pump(
        tester,
        repository: repository,
        at: '${RoutePaths.notifications}/n-verify',
        settle: false,
      );
      await tester.pump();

      repository.gate!.complete();
      await tester.pumpAndSettle();

      expect(find.text('Review an incomplete verification'), findsOneWidget);
      expect(harness.repository.markedRead, ['n-verify']);
      expect(find.bySemanticsLabel('Read status: Read'), findsOneWidget);
    });

    testWidgets('a notification no longer in the inbox says so', (
      tester,
    ) async {
      await _pump(tester, at: '${RoutePaths.notifications}/missing');

      expect(find.text('Notification unavailable'), findsOneWidget);
    });

    testWidgets('a refused read receipt shows it unread again', (tester) async {
      final harness = await _pump(tester);
      harness.repository.markError = StateError('server error');

      await tester.tap(find.text('Location needs your attention'));
      await tester.pumpAndSettle();

      expect(find.bySemanticsLabel('Read status: Unread'), findsOneWidget);
    });
  });

  group('fits', () {
    for (final (name, size, scale) in [
      ('small phone', const Size(320, 568), 1.0),
      ('landscape', const Size(844, 390), 1.0),
      ('tablet', const Size(820, 1180), 1.0),
      ('200% text', const Size(390, 844), 2.0),
    ]) {
      testWidgets('inbox, empty, unavailable and details on a $name', (
        tester,
      ) async {
        await _pump(tester, size: size, textScale: scale);
        expect(tester.takeException(), isNull);

        await tester.pumpWidget(const SizedBox());
        await _pump(tester, inbox: const [], size: size, textScale: scale);
        expect(tester.takeException(), isNull);
        await tester.ensureVisible(find.text('Back to dashboard'));
        await tester.pumpAndSettle();
        expect(find.text('Back to dashboard').hitTestable(), findsOneWidget);

        await tester.pumpWidget(const SizedBox());
        await _pump(
          tester,
          repository: FakeNotificationsRepository(_inbox)
            ..fetchError = StateError('down'),
          size: size,
          textScale: scale,
        );
        expect(tester.takeException(), isNull);
        await tester.ensureVisible(find.text('Try again'));
        await tester.pumpAndSettle();
        expect(find.text('Try again').hitTestable(), findsOneWidget);

        await tester.pumpWidget(const SizedBox());
        await _pump(
          tester,
          at: '${RoutePaths.notifications}/n-verify',
          size: size,
          textScale: scale,
        );
        expect(tester.takeException(), isNull);
        await tester.scrollUntilVisible(
          find.text('View Verification Record'),
          200,
          scrollable: find.byType(Scrollable).first,
        );
        expect(tester.takeException(), isNull);
      });
    }
  });
}
