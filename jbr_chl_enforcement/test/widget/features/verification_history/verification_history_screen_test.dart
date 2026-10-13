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
import 'package:jbr_chl_enforcement/features/chl_trips/domain/entities/trip_status.dart';
import 'package:jbr_chl_enforcement/features/vehicle/domain/entities/e_tag_status.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/verification_method.dart';
import 'package:jbr_chl_enforcement/features/verification_history/data/repositories/history_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/verification_history/domain/entities/verification_record.dart';
import 'package:jbr_chl_enforcement/features/verification_history/presentation/screens/history_record_details_screen.dart';
import 'package:jbr_chl_enforcement/features/verification_history/presentation/screens/verification_history_screen.dart';
import 'package:jbr_chl_enforcement/features/verification_history/presentation/widgets/history_filter_sheet.dart';
import 'package:jbr_chl_enforcement/features/verification_history/presentation/widgets/history_record_tile.dart';
import 'package:jbr_chl_enforcement/shared/ui/widgets/card_list_skeleton.dart';

import '../../../helpers/fakes.dart';

final _now = DateTime(2026, 10, 13, 10);

/// The records in the designs: five today, one on 26 Sept (inside the last
/// 30 days) and one on 6 Sept (outside).
final _records = [
  VerificationRecord(
    id: 'r1',
    plateNumber: 'ABC 123 AA',
    tripStatus: TripStatus.active,
    method: VerificationMethod.manualPlate,
    outcome: VerificationOutcome.verified,
    recordedAt: DateTime(2026, 10, 13, 9, 34),
  ),
  VerificationRecord(
    id: 'r2',
    plateNumber: 'LND 482 XK',
    tripStatus: TripStatus.noActive,
    method: VerificationMethod.manualPlate,
    outcome: VerificationOutcome.checked,
    recordedAt: DateTime(2026, 10, 13, 9, 21),
  ),
  VerificationRecord(
    id: 'r3',
    plateNumber: 'KJA 719 FG',
    tripStatus: TripStatus.active,
    method: VerificationMethod.qrCode,
    outcome: VerificationOutcome.verified,
    recordedAt: DateTime(2026, 10, 13, 9, 8),
  ),
  VerificationRecord(
    id: 'r4',
    plateNumber: 'AKD 308 TY',
    tripStatus: TripStatus.active,
    method: VerificationMethod.manualPlate,
    outcome: VerificationOutcome.verified,
    recordedAt: DateTime(2026, 10, 13, 8, 56),
  ),
  VerificationRecord(
    id: 'r5',
    plateNumber: 'GGE 651 PL',
    eTagStatus: ETagStatus.valid,
    method: VerificationMethod.qrCode,
    outcome: VerificationOutcome.validated,
    recordedAt: DateTime(2026, 10, 13, 8, 42),
  ),
  VerificationRecord(
    id: 'r6',
    plateNumber: 'BDG 204 XY',
    method: VerificationMethod.qrCode,
    outcome: VerificationOutcome.notCompleted,
    recordedAt: DateTime(2026, 9, 26, 10, 18),
  ),
  VerificationRecord(
    id: 'r7',
    plateNumber: 'APP 610 KS',
    eTagStatus: ETagStatus.invalid,
    method: VerificationMethod.qrCode,
    outcome: VerificationOutcome.checked,
    recordedAt: DateTime(2026, 9, 6, 14, 46),
  ),
];

Widget _page(String label) => Scaffold(body: Center(child: Text(label)));

GoRouter _router() => GoRouter(
  initialLocation: RoutePaths.history,
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
              builder: (context, state) => const VerificationHistoryScreen(),
              routes: [
                GoRoute(
                  path: ':id',
                  name: RouteNames.historyRecord,
                  builder: (context, state) => HistoryRecordDetailsScreen(
                    id: state.pathParameters['id']!,
                  ),
                ),
              ],
            ),
          ],
        ),
        for (final (path, name) in [
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
  ],
);

Future<FakeHistoryRepository> _pump(
  WidgetTester tester, {
  List<VerificationRecord>? records,
  FakeHistoryRepository? repository,
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

  final fake = repository ?? FakeHistoryRepository(records ?? _records);
  final router = _router();
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        historyRepositoryProvider.overrideWithValue(fake),
        clockProvider.overrideWithValue(() => _now),
      ],
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  if (settle) await tester.pumpAndSettle();
  return fake;
}

Finder _scrollable() => find.byType(Scrollable).first;

Future<void> _reveal(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(finder, 200, scrollable: _scrollable());
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
}

Future<void> _openFilters(WidgetTester tester) async {
  await tester.tap(find.bySemanticsLabel(RegExp('^Filter history')));
  await tester.pumpAndSettle();
}

/// Opens the dropdown showing [current] and chooses [choice].
Future<void> _pick(WidgetTester tester, String current, String choice) async {
  await tester.tap(find.text(current).last);
  await tester.pumpAndSettle();
  await tester.tap(find.text(choice).last);
  await tester.pumpAndSettle();
}

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

  testWidgets('shows the skeleton while loading', (tester) async {
    final repository = FakeHistoryRepository(_records)
      ..gate = Completer<void>();
    await _pump(tester, repository: repository, settle: false);
    await tester.pump();

    expect(find.byType(CardListSkeleton), findsOneWidget);
    expect(find.text(VerificationHistoryScreen.loadingLabel), findsOneWidget);
    expect(find.text('Last 30 days'), findsNothing);

    repository.gate!.complete();
    await tester.pumpAndSettle();
    expect(find.byType(HistoryRecordTile), findsWidgets);
  });

  testWidgets('lists the last 30 days by day', (tester) async {
    await _pump(tester);

    expect(find.text('My Activity'), findsOneWidget);
    expect(find.text('Verification history'), findsOneWidget);
    expect(find.text('Review your trip and E-Tag checks.'), findsOneWidget);
    expect(find.text('Last 30 days'), findsOneWidget);
    expect(find.text('View All History'), findsOneWidget);
    expect(find.text('6 personal records · Last 30 days'), findsOneWidget);
    expect(find.text('Filters'), findsOneWidget);
    expect(find.text('Today'), findsOneWidget);
    expect(find.text('ABC 123 AA'), findsOneWidget);
    expect(find.text('Active trip'), findsWidgets);
    expect(find.text('Manual plate · 09:34 AM'), findsOneWidget);
    expect(find.text('No active trip'), findsOneWidget);
    expect(find.text('Receipt QR · 09:08 AM'), findsOneWidget);
    expect(
      find.bySemanticsLabel(
        'ABC 123 AA, Active trip, Manual plate, Completed, Today, 09:34 AM',
      ),
      findsOneWidget,
    );

    await _reveal(tester, find.text('BDG 204 XY'));
    expect(find.text('26 Sept 2026'), findsOneWidget);
    expect(find.text('Verification unavailable'), findsOneWidget);
    expect(find.text('Receipt QR · 10:18 AM'), findsOneWidget);
    expect(find.text('Not completed'), findsOneWidget);
    // Older than 30 days.
    expect(find.text('APP 610 KS'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('View All History adds older records', (tester) async {
    await _pump(tester);

    await tester.tap(find.text('View All History'));
    await tester.pumpAndSettle();

    expect(
      find.text('7 personal records · All available dates'),
      findsOneWidget,
    );
    await _reveal(tester, find.text('APP 610 KS'));
    expect(find.text('6 Sept 2026'), findsOneWidget);
    expect(find.text('E-Tag invalid'), findsOneWidget);
    expect(find.text('Tag QR · 02:46 PM'), findsOneWidget);
  });

  testWidgets('tapping a record opens it in the tab', (tester) async {
    await _pump(tester);

    await tester.tap(find.text('LND 482 XK'));
    await tester.pumpAndSettle();

    expect(find.byType(HistoryRecordDetailsScreen), findsOneWidget);
    expect(find.text('Verification Record'), findsOneWidget);
    expect(find.text('LND 482 XK'), findsOneWidget);
    expect(find.bySemanticsLabel('Main navigation'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Back'));
    await tester.pumpAndSettle();
    expect(find.byType(VerificationHistoryScreen), findsOneWidget);
  });

  testWidgets('screen readers can open a record and switch period', (
    tester,
  ) async {
    await _pump(tester);

    tester.semantics.tap(find.semantics.byLabel('View All History'));
    await tester.pumpAndSettle();
    expect(
      find.text('7 personal records · All available dates'),
      findsOneWidget,
    );

    tester.semantics.tap(find.semantics.byLabel(RegExp('^ABC 123 AA, ')));
    await tester.pumpAndSettle();
    expect(find.byType(HistoryRecordDetailsScreen), findsOneWidget);
  });

  group('filters', () {
    testWidgets('the card counts matches and applies only on Show', (
      tester,
    ) async {
      await _pump(tester);
      await _openFilters(tester);

      expect(find.text('Filter history'), findsOneWidget);
      expect(
        find.text(
          'Choose the checks you want to see.\n'
          'Changes apply only when you confirm.',
        ),
        findsOneWidget,
      );
      expect(find.text('Last 30 days').last, findsOneWidget);
      expect(find.text('All methods'), findsOneWidget);
      expect(find.text('All results'), findsOneWidget);
      expect(find.text('All statuses'), findsOneWidget);
      expect(find.text('Show'), findsOneWidget);
      expect(find.textContaining('matching record'), findsNothing);

      await _pick(tester, 'All methods', 'Manual plate');
      expect(find.text('3 matching records'), findsOneWidget);
      await _pick(tester, 'All results', 'No active trip');
      await _pick(tester, 'All statuses', 'Completed');
      expect(find.text('1 matching record'), findsOneWidget);
      // Nothing changes behind the card until it is confirmed.
      expect(find.text('6 personal records · Last 30 days'), findsOneWidget);

      await tester.tap(find.text('Show 1 record'));
      await tester.pumpAndSettle();

      expect(find.byType(HistoryFilterSheet), findsNothing);
      expect(find.text('1 matching record · Last 30 days'), findsOneWidget);
      expect(
        find.bySemanticsLabel('Filter history, 3 active filters'),
        findsOneWidget,
      );
      expect(find.byType(HistoryRecordTile), findsOneWidget);
      expect(find.text('LND 482 XK'), findsOneWidget);
      for (final chip in [
        'Remove method filter: Manual plate',
        'Remove result filter: No active trip',
        'Remove completion filter: Completed',
      ]) {
        expect(find.bySemanticsLabel(chip), findsOneWidget);
      }
    });

    testWidgets('a chip removes its filter; Clear all removes them all', (
      tester,
    ) async {
      await _pump(tester);
      await _openFilters(tester);
      await _pick(tester, 'All methods', 'Receipt QR');
      await _pick(tester, 'All statuses', 'Not completed');
      await tester.tap(find.text('Show 1 record'));
      await tester.pumpAndSettle();
      expect(find.text('BDG 204 XY'), findsOneWidget);

      await tester.tap(find.bySemanticsLabel(RegExp('^Remove completion')));
      await tester.pumpAndSettle();
      expect(find.text('2 matching records · Last 30 days'), findsOneWidget);
      expect(
        find.bySemanticsLabel('Filter history, 1 active filter'),
        findsOneWidget,
      );

      await tester.tap(find.text('Clear all'));
      await tester.pumpAndSettle();
      expect(find.text('6 personal records · Last 30 days'), findsOneWidget);
      expect(find.text('Clear all'), findsNothing);
      expect(find.bySemanticsLabel('Filter history'), findsOneWidget);
    });

    testWidgets('screen readers can remove a chip', (tester) async {
      await _pump(tester);
      await _openFilters(tester);
      await _pick(tester, 'All results', 'E-Tag valid');
      await tester.tap(find.text('Show 1 record'));
      await tester.pumpAndSettle();

      tester.semantics.tap(
        find.semantics.byLabel('Remove result filter: E-Tag valid'),
      );
      await tester.pumpAndSettle();
      expect(find.text('6 personal records · Last 30 days'), findsOneWidget);
    });

    testWidgets('the date range is the page switch', (tester) async {
      await _pump(tester);
      await _openFilters(tester);
      await _pick(tester, 'Last 30 days', 'All available dates');
      await tester.tap(find.text('Show'));
      await tester.pumpAndSettle();

      expect(
        find.text('7 personal records · All available dates'),
        findsOneWidget,
      );
      // The date range is not a filter chip.
      expect(find.text('Clear all'), findsNothing);

      await tester.tap(find.text('Last 30 days'));
      await tester.pumpAndSettle();
      await _openFilters(tester);
      expect(find.text('Last 30 days').last, findsOneWidget);
      expect(find.text('All available dates'), findsNothing);
    });

    testWidgets('Reset clears the card but applies nothing yet', (
      tester,
    ) async {
      await _pump(tester);
      await tester.tap(find.text('View All History'));
      await tester.pumpAndSettle();
      await _openFilters(tester);
      await _pick(tester, 'All methods', 'Tag QR');
      // GGE 651 PL today and APP 610 KS on 6 Sept.
      expect(find.text('2 matching records'), findsOneWidget);

      await tester.tap(find.text('Reset'));
      await tester.pumpAndSettle();

      expect(find.byType(HistoryFilterSheet), findsOneWidget);
      expect(find.text('All methods'), findsOneWidget);
      expect(find.text('Last 30 days').last, findsOneWidget);
      expect(find.text('Show'), findsOneWidget);
      expect(
        find.text('7 personal records · All available dates'),
        findsOneWidget,
      );
    });

    testWidgets('closing the card keeps the filters as they were', (
      tester,
    ) async {
      await _pump(tester);
      await _openFilters(tester);
      await _pick(tester, 'All methods', 'Tag QR');
      await tester.tap(find.text('Show 1 record'));
      await tester.pumpAndSettle();

      await _openFilters(tester);
      await _pick(tester, 'Tag QR', 'Manual plate');
      await tester.tap(find.bySemanticsLabel('Cancel history filters'));
      await tester.pumpAndSettle();

      expect(find.byType(HistoryFilterSheet), findsNothing);
      expect(find.text('GGE 651 PL'), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('Tag QR\$')), findsOneWidget);
    });

    testWidgets('no match: Adjust filters reopens the card, Clear all '
        'filters shows everything', (tester) async {
      await _pump(tester);
      await _openFilters(tester);
      await _pick(tester, 'All methods', 'Tag QR');
      await _pick(tester, 'All results', 'No active trip');
      expect(find.text('0 matching records'), findsOneWidget);
      await tester.tap(find.text('Show 0 records'));
      await tester.pumpAndSettle();

      expect(find.text('0 matching records · Last 30 days'), findsOneWidget);
      expect(find.text('No matching records'), findsOneWidget);
      expect(
        find.text(
          'Try a different date range or remove a filter. Your '
          'verification history has not been deleted.',
        ),
        findsOneWidget,
      );
      expect(find.byType(HistoryRecordTile), findsNothing);

      await tester.tap(find.text('Adjust filters'));
      await tester.pumpAndSettle();
      expect(find.byType(HistoryFilterSheet), findsOneWidget);
      expect(find.text('Tag QR').last, findsOneWidget);
      await tester.tap(find.bySemanticsLabel('Cancel history filters'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Clear all filters'));
      await tester.pumpAndSettle();
      expect(find.text('6 personal records · Last 30 days'), findsOneWidget);
      expect(find.text('No matching records'), findsNothing);
    });
  });

  testWidgets('nothing in 30 days points to all history', (tester) async {
    await _pump(tester, records: [_records.last]);

    expect(find.text('Nothing in the last 30 days'), findsOneWidget);
    await tester.tap(find.text('View All History').last);
    await tester.pumpAndSettle();

    expect(find.text('APP 610 KS'), findsOneWidget);
  });

  testWidgets('no records at all: no verifications yet', (tester) async {
    await _pump(tester, records: const []);

    expect(find.text('No verifications yet'), findsOneWidget);
    expect(
      find.text(
        'Your plate, receipt QR and E-Tag checks will appear here after '
        'verification.',
      ),
      findsOneWidget,
    );
    expect(find.text('Last 30 days'), findsNothing);
    expect(find.byType(FilledButton), findsNothing);
  });

  testWidgets('a failed load says unavailable, and Try again reloads', (
    tester,
  ) async {
    final repository = FakeHistoryRepository(_records)
      ..fetchError = StateError('server error');
    await _pump(tester, repository: repository);

    expect(find.text('History unavailable'), findsOneWidget);
    expect(find.text('No verifications yet'), findsNothing);

    repository
      ..fetchError = null
      ..gate = Completer<void>();
    await tester.tap(find.text('Try again'));
    await tester.pump();
    await tester.pump();
    expect(find.byType(CardListSkeleton), findsOneWidget);

    repository.gate!.complete();
    await tester.pumpAndSettle();
    expect(repository.fetchCount, 2);
    expect(find.byType(HistoryRecordTile), findsWidgets);
  });

  testWidgets('pulling down reloads the history', (tester) async {
    final repository = await _pump(tester);

    await tester.fling(_scrollable(), const Offset(0, 400), 1000);
    await tester.pumpAndSettle();

    expect(repository.fetchCount, 2);
  });

  testWidgets('the last record scrolls clear of the bar', (tester) async {
    await _pump(tester);

    await tester.drag(_scrollable(), const Offset(0, -4000));
    await tester.pumpAndSettle();

    final last = tester.getRect(
      find.ancestor(
        of: find.text('BDG 204 XY'),
        matching: find.byType(HistoryRecordTile),
      ),
    );
    final nav = tester.getRect(find.bySemanticsLabel('Main navigation'));
    expect(last.bottom, lessThan(nav.top));
  });

  testWidgets('back goes to the dashboard', (tester) async {
    await _pump(tester);

    await tester.tap(find.bySemanticsLabel('Back'));
    await tester.pumpAndSettle();

    expect(find.text('dashboard page'), findsOneWidget);
  });

  group('fits', () {
    for (final (name, size, scale) in [
      ('small phone', const Size(320, 568), 1.0),
      ('landscape', const Size(844, 390), 1.0),
      ('tablet', const Size(820, 1180), 1.0),
      ('200% text', const Size(390, 844), 2.0),
    ]) {
      testWidgets('list, filters, empty and unavailable on a $name', (
        tester,
      ) async {
        await _pump(tester, size: size, textScale: scale);
        expect(tester.takeException(), isNull);
        await _reveal(tester, find.text('BDG 204 XY'));
        expect(tester.takeException(), isNull);

        await tester.drag(_scrollable(), const Offset(0, 4000));
        await tester.pumpAndSettle();
        await tester.tap(find.bySemanticsLabel(RegExp('^Filter history')));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.ensureVisible(find.text('Show'));
        await tester.pumpAndSettle();
        expect(find.text('Show').hitTestable(), findsOneWidget);
        await tester.tap(find.text('Show'));
        await tester.pumpAndSettle();

        await tester.pumpWidget(const SizedBox());
        await _pump(tester, records: const [], size: size, textScale: scale);
        expect(tester.takeException(), isNull);

        await tester.pumpWidget(const SizedBox());
        await _pump(
          tester,
          repository: FakeHistoryRepository(_records)
            ..fetchError = StateError('down'),
          size: size,
          textScale: scale,
        );
        expect(tester.takeException(), isNull);
        await tester.ensureVisible(find.text('Try again'));
        await tester.pumpAndSettle();
        expect(find.text('Try again').hitTestable(), findsOneWidget);
      });
    }
  });
}
