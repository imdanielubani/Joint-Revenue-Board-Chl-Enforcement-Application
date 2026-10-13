import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/notifications/presentation/providers/notifications_controller.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/data/repositories/sync_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/domain/entities/sync_queue_item.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/domain/entities/sync_status.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/domain/repositories/sync_repository.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/presentation/providers/sync_controller.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/presentation/screens/sync_queue_screen.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/presentation/widgets/offline_sync_sheet.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/presentation/widgets/sync_queue_item_tile.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/verification_method.dart';
import 'package:jbr_chl_enforcement/shared/device/connectivity/connectivity_adapter.dart';

import '../../../helpers/fakes.dart';

/// The two records in the design.
final _designQueue = [
  SyncQueueItem(
    id: 'SYN-Q-001',
    plateNumber: 'FKJ803XY',
    method: VerificationMethod.manualPlate,
    savedAt: DateTime(2026, 10, 13, 9),
  ),
  SyncQueueItem(
    id: 'SYN-Q-002',
    plateNumber: 'AAA420AB',
    method: VerificationMethod.qrCode,
    savedAt: DateTime(2026, 10, 13, 9, 25),
  ),
];

/// A queue that cannot be read.
class _BrokenRepository implements SyncRepository {
  @override
  Stream<List<SyncQueueItem>> watchQueue() =>
      Stream.error(StateError('storage unavailable'));

  @override
  Future<void> synchronize() async {}
}

class _Harness {
  _Harness(this.container, this.repository);

  final ProviderContainer container;
  final FakeSyncRepository repository;
}

Future<_Harness> _pump(
  WidgetTester tester, {
  List<SyncQueueItem>? items,
  bool online = true,
  Size size = const Size(390, 844),
  double textScale = 1,
  double bottomInset = 34,
  SyncRepository? override,
}) async {
  final padding = FakeViewPadding(top: 47 * 3, bottom: bottomInset * 3);
  tester.view
    ..physicalSize = size * 3
    ..devicePixelRatio = 3
    ..padding = padding
    ..viewPadding = padding;
  tester.platformDispatcher.textScaleFactorTestValue = textScale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

  final repository = FakeSyncRepository(0)..items = items ?? _designQueue;
  addTearDown(repository.dispose);
  final container = ProviderContainer(
    overrides: [
      syncRepositoryProvider.overrideWithValue(override ?? repository),
      internetStatusProvider.overrideWith((ref) => Stream.value(online)),
      unreadNotificationCountProvider.overrideWithValue(0),
    ],
  );
  addTearDown(container.dispose);

  // Settings underneath, as when opened from App settings.
  final router = GoRouter(
    initialLocation: RoutePaths.settings,
    routes: [
      GoRoute(
        path: RoutePaths.settings,
        name: RouteNames.settings,
        builder: (context, state) =>
            const Scaffold(body: Center(child: Text('settings page'))),
      ),
      GoRoute(
        path: RoutePaths.syncQueue,
        name: RouteNames.syncQueue,
        builder: (context, state) => const SyncQueueScreen(),
      ),
      GoRoute(
        path: RoutePaths.notifications,
        name: RouteNames.notifications,
        builder: (context, state) =>
            const Scaffold(body: Text('notifications page')),
      ),
      GoRoute(
        path: RoutePaths.dashboard,
        name: RouteNames.dashboard,
        builder: (context, state) =>
            const Scaffold(body: Text('dashboard page')),
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  unawaited(router.pushNamed(RouteNames.syncQueue));
  await tester.pumpAndSettle();
  return _Harness(container, repository);
}

/// The ring spinner never settles, so pump a few frames instead.
Future<void> _settleWhileSpinning(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

Finder _syncNow() => find.descendant(
  of: find.byType(SyncQueueScreen),
  matching: find.text('Sync now'),
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

  test('labels how each record was taken', () {
    expect(VerificationMethod.manualPlate.queueLabel, 'Manual plate');
    expect(VerificationMethod.qrCode.queueLabel, 'Receipt QR');
    expect(VerificationMethod.rfid.queueLabel, 'RFID tag');
    expect(VerificationMethod.ocr.queueLabel, 'Plate OCR');
  });

  test('summarises the queue', () {
    expect(
      SyncQueueScreen.summary(2, syncing: false),
      '2 verification records · Awaiting synchronization',
    );
    expect(
      SyncQueueScreen.summary(1, syncing: false),
      '1 verification record · Awaiting synchronization',
    );
    expect(
      SyncQueueScreen.summary(2, syncing: true),
      '2 verification records · Synchronizing',
    );
  });

  group('with records', () {
    testWidgets('lists each queued record', (tester) async {
      await _pump(tester);

      expect(find.text('My Preferences'), findsOneWidget);
      expect(find.text('Sync queue'), findsOneWidget);
      expect(
        find.text('Review locally saved records awaiting acknowledgement.'),
        findsOneWidget,
      );
      expect(
        find.text('2 verification records · Awaiting synchronization'),
        findsOneWidget,
      );
      expect(find.byType(SyncQueueItemTile), findsNWidgets(2));
      expect(find.text('FKJ 803 XY'), findsOneWidget);
      expect(find.text('Manual plate · Verification record'), findsOneWidget);
      expect(find.text('SYN-Q-001 · Queued'), findsOneWidget);
      expect(find.text('AAA 420 AB'), findsOneWidget);
      expect(find.text('Receipt QR · Verification record'), findsOneWidget);
      expect(find.text('SYN-Q-002 · Queued'), findsOneWidget);
      expect(
        find.bySemanticsLabel(
          'FKJ 803 XY. Manual plate · Verification record. '
          'SYN-Q-001 · Queued',
        ),
        findsOneWidget,
      );
      expect(
        find.textContaining('Records stay queued until CHL acknowledges'),
        findsOneWidget,
      );
      expect(_syncNow(), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('Sync now sits at the bottom, clear of the inset', (
      tester,
    ) async {
      await _pump(tester);

      final button = tester.getRect(
        find.ancestor(of: _syncNow(), matching: find.byType(FilledButton)),
      );
      expect(button.left, 16);
      expect(button.right, 390 - 16);
      expect(button.height, 52);
      expect(button.bottom, 844 - 34);
    });

    testWidgets('without a system inset, Sync now keeps 16 px below', (
      tester,
    ) async {
      await _pump(tester, bottomInset: 0);

      final button = tester.getRect(
        find.ancestor(of: _syncNow(), matching: find.byType(FilledButton)),
      );
      expect(button.bottom, 844 - 16);
    });

    testWidgets('Sync now starts the sync and shows its progress', (
      tester,
    ) async {
      final harness = await _pump(tester);

      await tester.tap(_syncNow());
      await _settleWhileSpinning(tester);

      expect(harness.repository.calls, hasLength(1));
      expect(find.byType(OfflineSyncSheet), findsOneWidget);
      expect(find.text('Synchronizing records'), findsOneWidget);
      expect(
        find.text('2 verification records · Synchronizing'),
        findsOneWidget,
      );

      harness.repository.acknowledge();
      await tester.pumpAndSettle();
      expect(find.text('Records acknowledged'), findsOneWidget);

      // Already on the queue: View queue only closes the card.
      await tester.tap(find.text('View queue'));
      await tester.pumpAndSettle();
      expect(find.byType(OfflineSyncSheet), findsNothing);
      expect(find.byType(SyncQueueScreen), findsOneWidget);
      expect(find.text('Nothing waiting to sync'), findsOneWidget);
    });

    testWidgets('a running sync is shown, not started again', (tester) async {
      final harness = await _pump(tester);
      await tester.tap(_syncNow());
      await _settleWhileSpinning(tester);
      await tester.tap(find.text('Continue'));
      await _settleWhileSpinning(tester);

      await tester.tap(_syncNow());
      await _settleWhileSpinning(tester);

      expect(harness.repository.calls, hasLength(1));
      expect(find.text('Synchronizing records'), findsOneWidget);
      harness.repository.acknowledge();
      await tester.pumpAndSettle();
    });

    testWidgets('offline, Sync now explains and sends nothing', (tester) async {
      final harness = await _pump(tester, online: false);

      await tester.tap(_syncNow());
      await tester.pumpAndSettle();

      expect(harness.repository.calls, isEmpty);
      expect(find.text('No internet connection'), findsOneWidget);
      expect(harness.container.read(syncControllerProvider), SyncPhase.idle);
    });

    testWidgets('back returns to settings', (tester) async {
      await _pump(tester);

      await tester.tap(find.bySemanticsLabel('Back'));
      await tester.pumpAndSettle();

      expect(find.text('settings page'), findsOneWidget);
    });

    testWidgets('the bell opens notifications', (tester) async {
      await _pump(tester);

      await tester.tap(find.bySemanticsLabel('Notifications'));
      await tester.pumpAndSettle();

      expect(find.text('notifications page'), findsOneWidget);
    });

    for (final (name, size, scale) in [
      ('small phone', const Size(320, 568), 1.0),
      ('landscape', const Size(844, 390), 1.0),
      ('tablet', const Size(820, 1180), 1.0),
      ('200% text', const Size(390, 844), 2.0),
    ]) {
      testWidgets('fits on a $name, Sync now always in view', (tester) async {
        await _pump(tester, size: size, textScale: scale);

        expect(tester.takeException(), isNull);
        expect(_syncNow().hitTestable(), findsOneWidget);
        // The list builds lazily: scroll until the note exists, then into view.
        await tester.scrollUntilVisible(
          find.textContaining('Records stay queued'),
          100,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.ensureVisible(find.textContaining('Records stay queued'));
        await tester.pumpAndSettle();
        expect(
          find.textContaining('Records stay queued').hitTestable(),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      });
    }
  });

  group('empty', () {
    testWidgets('says nothing is waiting', (tester) async {
      await _pump(tester, items: const []);

      expect(find.text('Sync queue'), findsOneWidget);
      expect(find.text('Nothing waiting to sync'), findsOneWidget);
      expect(
        find.text('No records are awaiting acknowledgement.'),
        findsOneWidget,
      );
      expect(find.byType(SyncQueueItemTile), findsNothing);
      expect(_syncNow(), findsNothing);
    });

    testWidgets('Back to settings returns to settings', (tester) async {
      await _pump(tester, items: const []);

      await tester.tap(find.text('Back to settings'));
      await tester.pumpAndSettle();

      expect(find.text('settings page'), findsOneWidget);
    });

    for (final (name, size, scale) in [
      ('small phone', const Size(320, 568), 1.0),
      ('landscape', const Size(844, 390), 1.0),
      ('200% text', const Size(390, 844), 2.0),
    ]) {
      testWidgets('fits on a $name', (tester) async {
        await _pump(tester, items: const [], size: size, textScale: scale);

        expect(tester.takeException(), isNull);
        await tester.ensureVisible(find.text('Back to settings'));
        await tester.pumpAndSettle();
        expect(find.text('Back to settings').hitTestable(), findsOneWidget);
      });
    }
  });

  testWidgets('a queue that cannot be read says so', (tester) async {
    await _pump(tester, override: _BrokenRepository());

    expect(find.text('Sync queue unavailable'), findsOneWidget);
    expect(_syncNow(), findsNothing);
  });
}
