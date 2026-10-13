import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/data/repositories/sync_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/domain/entities/sync_status.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/domain/repositories/sync_repository.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/presentation/providers/sync_controller.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/presentation/widgets/offline_sync_sheet.dart';
import 'package:jbr_chl_enforcement/shared/device/connectivity/connectivity_adapter.dart';
import 'package:jbr_chl_enforcement/shared/ui/widgets/ring_spinner.dart';

/// Sync queue whose answers the test decides.
class _FakeSyncRepository implements SyncRepository {
  _FakeSyncRepository(this.pending);

  int pending;
  final _changes = StreamController<int>.broadcast();
  final List<Completer<void>> calls = [];

  @override
  Stream<int> watchPendingCount() async* {
    yield pending;
    yield* _changes.stream;
  }

  @override
  Future<void> synchronize() {
    final call = Completer<void>();
    calls.add(call);
    return call.future;
  }

  /// CHL acknowledges the latest call; the queue empties.
  void acknowledge() {
    pending = 0;
    _changes.add(0);
    calls.last.complete();
  }

  void fail() => calls.last.completeError(StateError('server error'));

  void dispose() => _changes.close();
}

class _Harness {
  _Harness(this.container, this.repository, this.connection);

  final ProviderContainer container;
  final _FakeSyncRepository repository;
  final StreamController<bool> connection;

  SyncPhase get phase => container.read(syncControllerProvider);
}

const _opener = 'Open offline sync';

Future<_Harness> _pump(
  WidgetTester tester, {
  int pending = 2,
  bool online = true,
  Size size = const Size(390, 844),
  double textScale = 1,
  bool open = true,
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

  final repository = _FakeSyncRepository(pending);
  addTearDown(repository.dispose);
  final connection = StreamController<bool>.broadcast();
  addTearDown(connection.close);
  final container = ProviderContainer(
    overrides: [
      syncRepositoryProvider.overrideWithValue(repository),
      internetStatusProvider.overrideWith((ref) async* {
        yield online;
        yield* connection.stream;
      }),
    ],
  );
  addTearDown(container.dispose);

  final router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => Scaffold(
          body: Center(
            child: TextButton(
              onPressed: () => showOfflineSyncSheet(context),
              child: const Text(_opener),
            ),
          ),
        ),
      ),
      GoRoute(
        path: RoutePaths.syncQueue,
        name: RouteNames.syncQueue,
        builder: (context, state) =>
            const Scaffold(body: Text('sync queue page')),
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
  if (open) await _open(tester);
  return _Harness(container, repository, connection);
}

Future<void> _open(WidgetTester tester) async {
  await tester.tap(find.text(_opener));
  await tester.pumpAndSettle();
}

/// The spinner never settles, so pump a few frames instead.
Future<void> _settleWhileSpinning(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

Finder _button(String label) =>
    find.ancestor(of: find.text(label), matching: find.byType(TextButton));

bool _enabled(WidgetTester tester, String label) =>
    tester.widget<TextButton>(_button(label)).onPressed != null;

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

  group('overview', () {
    testWidgets('shows the queue and the connection', (tester) async {
      await _pump(tester);

      expect(find.text('Saved work'), findsWidgets);
      expect(find.text('Offline synchronization'), findsOneWidget);
      expect(
        find.text(
          '2 local verification records are waiting. Sync now opens '
          'progress; records remain queued until acknowledgement.',
        ),
        findsOneWidget,
      );
      expect(find.bySemanticsLabel('Connection: Online'), findsOneWidget);
      expect(
        find.bySemanticsLabel('Saved work: 2 verification records'),
        findsOneWidget,
      );
      expect(_enabled(tester, 'Sync now'), isTrue);
      expect(_enabled(tester, 'View queue'), isTrue);
      expect(find.byType(RingSpinner), findsNothing);
    });

    testWidgets('one record reads in the singular', (tester) async {
      await _pump(tester, pending: 1);

      expect(
        find.textContaining('1 local verification record is waiting.'),
        findsOneWidget,
      );
      expect(
        find.bySemanticsLabel('Saved work: 1 verification record'),
        findsOneWidget,
      );
    });

    testWidgets('nothing to send: Sync now is disabled', (tester) async {
      await _pump(tester, pending: 0);

      expect(
        find.textContaining('No local verification records are waiting.'),
        findsOneWidget,
      );
      expect(
        find.bySemanticsLabel('Saved work: No records awaiting sync'),
        findsOneWidget,
      );
      expect(_enabled(tester, 'Sync now'), isFalse);
    });

    testWidgets('View queue closes the card and opens the queue', (
      tester,
    ) async {
      await _pump(tester);

      await tester.tap(find.text('View queue'));
      await tester.pumpAndSettle();

      expect(find.byType(OfflineSyncSheet), findsNothing);
      expect(find.text('sync queue page'), findsOneWidget);
    });

    testWidgets('the close button closes the card', (tester) async {
      await _pump(tester);

      await tester.tap(find.bySemanticsLabel('Close synchronization'));
      await tester.pumpAndSettle();

      expect(find.byType(OfflineSyncSheet), findsNothing);
      expect(find.text(_opener), findsOneWidget);
    });
  });

  group('no internet connection', () {
    testWidgets('says so, with one way out', (tester) async {
      await _pump(tester, online: false);

      expect(find.text('No internet connection'), findsOneWidget);
      expect(
        find.text(
          'Synchronization cannot start while offline. Saved records stay '
          'in the queue until connectivity returns.',
        ),
        findsOneWidget,
      );
      expect(find.bySemanticsLabel('Connection: Offline'), findsOneWidget);
      expect(
        find.bySemanticsLabel('Saved work: 2 verification records'),
        findsOneWidget,
      );
      expect(find.text('Sync now'), findsNothing);

      await tester.tap(find.text('Return to settings'));
      await tester.pumpAndSettle();
      expect(find.byType(OfflineSyncSheet), findsNothing);
    });

    testWidgets('turns to the overview when the connection returns', (
      tester,
    ) async {
      final harness = await _pump(tester, online: false);
      expect(find.text('No internet connection'), findsOneWidget);

      harness.connection.add(true);
      await tester.pumpAndSettle();

      expect(find.text('Offline synchronization'), findsOneWidget);
      expect(_enabled(tester, 'Sync now'), isTrue);
    });

    testWidgets('shows when the connection drops on the overview', (
      tester,
    ) async {
      final harness = await _pump(tester);

      harness.connection.add(false);
      await tester.pumpAndSettle();

      expect(find.text('No internet connection'), findsOneWidget);
    });
  });

  group('synchronizing', () {
    testWidgets('Sync now shows progress with a spinner', (tester) async {
      final harness = await _pump(tester);

      await tester.tap(find.text('Sync now'));
      await _settleWhileSpinning(tester);

      expect(harness.repository.calls, hasLength(1));
      expect(harness.phase, SyncPhase.syncing);
      expect(find.text('Synchronizing records'), findsOneWidget);
      expect(find.byType(RingSpinner), findsOneWidget);
      expect(find.text('Pending · awaiting acknowledgement'), findsOneWidget);
      // Still queued until acknowledged.
      expect(
        find.bySemanticsLabel('Saved work: 2 verification records'),
        findsOneWidget,
      );
      expect(find.text('Continue'), findsOneWidget);
      expect(find.text('Stop waiting'), findsOneWidget);

      harness.repository.acknowledge();
      await tester.pumpAndSettle();
    });

    testWidgets('acknowledgement shows the result and empties the queue', (
      tester,
    ) async {
      final harness = await _pump(tester);
      await tester.tap(find.text('Sync now'));
      await _settleWhileSpinning(tester);

      harness.repository.acknowledge();
      await tester.pumpAndSettle();

      expect(harness.phase, SyncPhase.acknowledged);
      expect(find.text('Records acknowledged'), findsOneWidget);
      expect(find.byType(RingSpinner), findsNothing);
      expect(
        find.bySemanticsLabel('Saved work: No records awaiting sync'),
        findsOneWidget,
      );
      expect(harness.container.read(pendingSyncCountProvider), 0);

      await tester.tap(find.text('Return to settings'));
      await tester.pumpAndSettle();
      expect(find.byType(OfflineSyncSheet), findsNothing);

      // Opening again starts from the overview.
      await _open(tester);
      expect(find.text('Offline synchronization'), findsOneWidget);
      expect(_enabled(tester, 'Sync now'), isFalse);
    });

    testWidgets('View queue after the acknowledgement opens the queue', (
      tester,
    ) async {
      final harness = await _pump(tester);
      await tester.tap(find.text('Sync now'));
      await _settleWhileSpinning(tester);
      harness.repository.acknowledge();
      await tester.pumpAndSettle();

      await tester.tap(find.text('View queue'));
      await tester.pumpAndSettle();

      expect(find.text('sync queue page'), findsOneWidget);
    });

    testWidgets('a second tap does not send the records twice', (tester) async {
      final harness = await _pump(tester);

      final controller = harness.container.read(
        syncControllerProvider.notifier,
      );
      unawaited(controller.start());
      unawaited(controller.start());
      await _settleWhileSpinning(tester);

      expect(harness.repository.calls, hasLength(1));

      harness.repository.acknowledge();
      await tester.pumpAndSettle();
    });

    testWidgets('Continue closes the card and the sync carries on', (
      tester,
    ) async {
      final harness = await _pump(tester);
      await tester.tap(find.text('Sync now'));
      await _settleWhileSpinning(tester);

      await tester.tap(find.text('Continue'));
      await _settleWhileSpinning(tester);
      expect(find.byType(OfflineSyncSheet), findsNothing);
      expect(harness.phase, SyncPhase.syncing);

      // Opening again shows the progress.
      await tester.tap(find.text(_opener));
      await _settleWhileSpinning(tester);
      expect(find.text('Synchronizing records'), findsOneWidget);

      harness.repository.acknowledge();
      await tester.pumpAndSettle();
      expect(find.text('Records acknowledged'), findsOneWidget);
    });

    testWidgets('closing the card also leaves the sync running', (
      tester,
    ) async {
      final harness = await _pump(tester);
      await tester.tap(find.text('Sync now'));
      await _settleWhileSpinning(tester);

      await tester.tap(find.bySemanticsLabel('Close and keep synchronizing'));
      await _settleWhileSpinning(tester);

      expect(find.byType(OfflineSyncSheet), findsNothing);
      expect(harness.phase, SyncPhase.syncing);
      harness.repository.acknowledge();
      await tester.pumpAndSettle();
      expect(harness.phase, SyncPhase.acknowledged);
    });
  });

  group('interrupted', () {
    testWidgets('a failed sync keeps the records and offers a retry', (
      tester,
    ) async {
      final harness = await _pump(tester);
      await tester.tap(find.text('Sync now'));
      await _settleWhileSpinning(tester);

      harness.repository.fail();
      await tester.pumpAndSettle();

      expect(harness.phase, SyncPhase.interrupted);
      expect(find.text('Synchronization interrupted'), findsOneWidget);
      expect(
        find.text(
          'No acknowledgement was received. Saved records remain queued. '
          'Retry safely without creating another copy.',
        ),
        findsOneWidget,
      );
      expect(
        find.bySemanticsLabel('Saved work: 2 verification records'),
        findsOneWidget,
      );

      await tester.tap(find.text('Retry sync'));
      await _settleWhileSpinning(tester);
      expect(harness.repository.calls, hasLength(2));
      expect(find.text('Synchronizing records'), findsOneWidget);

      harness.repository.acknowledge();
      await tester.pumpAndSettle();
      expect(find.text('Records acknowledged'), findsOneWidget);
    });

    testWidgets('Stop waiting interrupts, and a late answer is ignored', (
      tester,
    ) async {
      final harness = await _pump(tester);
      await tester.tap(find.text('Sync now'));
      await _settleWhileSpinning(tester);

      await tester.tap(find.text('Stop waiting'));
      await tester.pumpAndSettle();
      expect(find.text('Synchronization interrupted'), findsOneWidget);

      harness.repository.calls.last.complete();
      await tester.pumpAndSettle();
      expect(harness.phase, SyncPhase.interrupted);
    });

    testWidgets('no acknowledgement within a minute interrupts', (
      tester,
    ) async {
      final harness = await _pump(tester);
      await tester.tap(find.text('Sync now'));
      await _settleWhileSpinning(tester);

      await tester.pump(SyncController.acknowledgementTimeout);
      await tester.pumpAndSettle();

      expect(harness.phase, SyncPhase.interrupted);
      expect(find.text('Synchronization interrupted'), findsOneWidget);
    });

    testWidgets('stays on show after closing, until retried', (tester) async {
      final harness = await _pump(tester);
      await tester.tap(find.text('Sync now'));
      await _settleWhileSpinning(tester);
      harness.repository.fail();
      await tester.pumpAndSettle();

      await tester.tap(find.bySemanticsLabel('Close synchronization'));
      await tester.pumpAndSettle();
      await _open(tester);

      expect(find.text('Synchronization interrupted'), findsOneWidget);
    });

    testWidgets('retrying offline shows no internet connection', (
      tester,
    ) async {
      final harness = await _pump(tester);
      await tester.tap(find.text('Sync now'));
      await _settleWhileSpinning(tester);
      harness.repository.fail();
      await tester.pumpAndSettle();

      harness.connection.add(false);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Retry sync'));
      await tester.pumpAndSettle();

      expect(harness.repository.calls, hasLength(1));
      expect(find.text('No internet connection'), findsOneWidget);
    });

    testWidgets('View queue opens the queue', (tester) async {
      final harness = await _pump(tester);
      await tester.tap(find.text('Sync now'));
      await _settleWhileSpinning(tester);
      harness.repository.fail();
      await tester.pumpAndSettle();

      await tester.tap(find.text('View queue'));
      await tester.pumpAndSettle();

      expect(find.text('sync queue page'), findsOneWidget);
    });
  });

  group('fits', () {
    /// Scrolls the card until [label] shows and checks it can be tapped.
    Future<void> reach(WidgetTester tester, String label) async {
      await tester.scrollUntilVisible(
        find.text(label),
        100,
        scrollable: find
            .descendant(
              of: find.byType(OfflineSyncSheet),
              matching: find.byType(Scrollable),
            )
            .first,
      );
      expect(find.text(label).hitTestable(), findsOneWidget, reason: label);
    }

    for (final (name, size, scale) in [
      ('small phone', const Size(320, 568), 1.0),
      ('landscape', const Size(844, 390), 1.0),
      ('tablet', const Size(820, 1180), 1.0),
      ('200% text', const Size(390, 844), 2.0),
    ]) {
      testWidgets('every state on a $name', (tester) async {
        final harness = await _pump(tester, size: size, textScale: scale);
        expect(tester.takeException(), isNull);
        await reach(tester, 'View queue');

        await reach(tester, 'Sync now');
        await tester.tap(find.text('Sync now'));
        await _settleWhileSpinning(tester);
        expect(find.text('Synchronizing records'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await reach(tester, 'Stop waiting');

        harness.repository.fail();
        await tester.pumpAndSettle();
        expect(find.text('Synchronization interrupted'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await reach(tester, 'View queue');

        await reach(tester, 'Retry sync');
        await tester.tap(find.text('Retry sync'));
        await _settleWhileSpinning(tester);
        harness.repository.acknowledge();
        await tester.pumpAndSettle();
        expect(find.text('Records acknowledged'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await reach(tester, 'Return to settings');

        await tester.tap(find.text('Return to settings'));
        await tester.pumpAndSettle();
        harness.connection.add(false);
        await tester.pumpAndSettle();
        await _open(tester);
        expect(find.text('No internet connection'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await reach(tester, 'Return to settings');
      });
    }
  });
}
