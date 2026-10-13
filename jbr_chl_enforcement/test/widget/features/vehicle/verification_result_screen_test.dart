import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/core/utils/clock.dart';
import 'package:jbr_chl_enforcement/features/notifications/presentation/providers/notifications_controller.dart';
import 'package:jbr_chl_enforcement/features/vehicle/domain/entities/e_tag_status.dart';
import 'package:jbr_chl_enforcement/features/vehicle/domain/entities/verification_result.dart';
import 'package:jbr_chl_enforcement/features/vehicle/presentation/screens/verification_result_screen.dart';
import 'package:jbr_chl_enforcement/features/verification/data/repositories/verification_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/repositories/verification_repository.dart';
import 'package:jbr_chl_enforcement/shared/device/location/location_adapter.dart';

import '../../../helpers/fakes.dart';
import '../../../helpers/verification_samples.dart';

final _now = DateTime(2026, 10, 6, 0, 30);

Widget _page(String label) => Scaffold(body: Center(child: Text(label)));

class _Harness {
  _Harness(this.repository, this.location, this.ticks);

  final FakeVerificationRepository repository;
  final FakeLocationReader location;
  final StreamController<DateTime> ticks;
}

Future<_Harness> _pump(
  WidgetTester tester, {
  VerificationResult? result,
  bool noResult = false,
  FakeLocationReader? location,
  Size size = const Size(390, 844),
  double textScale = 1,
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

  final harness = _Harness(
    FakeVerificationRepository(),
    location ?? FakeLocationReader(),
    StreamController<DateTime>.broadcast(),
  );
  addTearDown(harness.ticks.close);
  final shown = noResult ? null : result ?? sampleActiveResult(_now);
  final router = GoRouter(
    initialLocation: RoutePaths.manualPlate,
    routes: [
      GoRoute(
        path: RoutePaths.dashboard,
        name: RouteNames.dashboard,
        builder: (context, state) => _page('dashboard page'),
      ),
      GoRoute(
        path: RoutePaths.notifications,
        name: RouteNames.notifications,
        builder: (context, state) => _page('notifications page'),
      ),
      GoRoute(
        path: RoutePaths.manualPlate,
        name: RouteNames.manualPlate,
        builder: (context, state) => _page('plate page'),
      ),
      GoRoute(
        path: RoutePaths.verificationResult,
        name: RouteNames.verificationResult,
        builder: (context, state) => VerificationResultScreen(
          result: state.extra as VerificationResult?,
        ),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        verificationRepositoryProvider.overrideWithValue(harness.repository),
        locationReaderProvider.overrideWithValue(harness.location),
        unreadNotificationCountProvider.overrideWithValue(2),
        clockProvider.overrideWithValue(() => _now),
        secondTickerProvider.overrideWith((ref) => harness.ticks.stream),
      ],
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  unawaited(router.push(RoutePaths.verificationResult, extra: shown));
  await tester.pumpAndSettle();
  return harness;
}

Finder _row(String label) => find.bySemanticsLabel(label);

Future<void> _reveal(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(
    finder,
    300,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.pumpAndSettle();
}

/// Lets the toast finish and go.
Future<void> _toastGone(WidgetTester tester) async {
  await tester.pump(const Duration(seconds: 4));
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

  testWidgets('an active trip, as designed', (tester) async {
    await _pump(tester);

    expect(find.text('Verification result'), findsOneWidget);
    expect(find.bySemanticsLabel('Notifications, 2 unread'), findsOneWidget);
    expect(find.text('Active CHL trip'), findsOneWidget);
    expect(
      find.text(
        'Review the trip status returned with this vehicle verification.',
      ),
      findsOneWidget,
    );
    for (final row in [
      'Vehicle identity: ABC 123 AA',
      'E-Tag validity: No E-Tag',
      'CHL trip status: Active',
    ]) {
      expect(_row(row), findsOneWidget, reason: row);
    }
    expect(find.text('Current trip'), findsOneWidget);
    expect(_row('From Abeokuta South, Ogun to Ikeja, Lagos'), findsOneWidget);

    await _reveal(tester, find.text('Trip validity countdown'));
    expect(
      find.bySemanticsLabel('Illustrative route from Abeokuta South to Ikeja'),
      findsOneWidget,
    );
    for (final row in [
      'Transaction reference: CHL-2026-08142',
      'Vehicle plate number: ABC 123 AA',
      'Vehicle type: Heavy goods vehicle',
      'Transaction type: CHL levy',
      'Originating state: Ogun',
      'Originating LGA: Abeokuta South',
      'Destination state: Lagos',
      'Trip status: Active',
      'Trip validity countdown: 04 h 21 min 02 sec',
    ]) {
      expect(_row(row), findsOneWidget, reason: row);
    }
    expect(
      _row(
        'Trip start date/time: '
        '${VerificationResultScreen.dateTime(DateTime(2026, 10, 5, 16, 28))}',
      ),
      findsOneWidget,
    );

    await _reveal(tester, find.text('Refresh Trip Status'));
    // In the trip details and in the destination check.
    expect(_row('Destination LGA: Ikeja'), findsNWidgets(2));
    for (final row in [
      'Enforcement point: Ikeja enforcement point',
      'Completion decision: Awaiting central validation',
      'Centrally defined delay: 900 seconds',
    ]) {
      expect(_row(row), findsOneWidget, reason: row);
    }
    expect(find.text('Record location for destination check'), findsOneWidget);
    expect(find.text('Finish Verification'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('the validity countdown ticks, and stops at zero', (
    tester,
  ) async {
    final harness = await _pump(tester);

    harness.ticks.add(_now.add(const Duration(seconds: 1)));
    await tester.pump();
    await tester.pump();
    expect(find.text('04 h 21 min 01 sec'), findsOneWidget);

    harness.ticks.add(_now.add(const Duration(hours: 5)));
    await tester.pump();
    await tester.pump();
    expect(find.text('00 h 00 min 00 sec'), findsOneWidget);
  });

  testWidgets('a valid E-Tag reads as a valid JRB E-Tag', (tester) async {
    await _pump(
      tester,
      result: sampleActiveResult(_now, eTag: ETagStatus.valid),
    );

    expect(_row('E-Tag validity: Valid JRB E-Tag'), findsOneWidget);
  });

  testWidgets('Additional trip information opens and closes', (tester) async {
    await _pump(tester);
    await _reveal(tester, find.text('Additional trip information'));
    expect(find.text('General haulage'), findsNothing);

    await tester.tap(find.text('Additional trip information'));
    await tester.pumpAndSettle();
    expect(_row('Cargo: General haulage'), findsOneWidget);
    expect(_row('Payment reference: PAY-2026-08142'), findsOneWidget);

    tester.semantics.tap(find.semantics.byLabel('Additional trip information'));
    await tester.pumpAndSettle();
    expect(find.text('General haulage'), findsNothing);
  });

  group('destination check', () {
    testWidgets('records the location, then shows what CHL received', (
      tester,
    ) async {
      final harness = await _pump(tester);
      harness.repository.recordGate = Completer<void>();
      await _reveal(tester, find.text('Record location for destination check'));

      await tester.tap(find.text('Record location for destination check'));
      await tester.pump();
      expect(find.text('Recording Location...'), findsOneWidget);
      final recording = tester.widget<OutlinedButton>(
        find.ancestor(
          of: find.text('Recording Location...'),
          matching: find.byType(OutlinedButton),
        ),
      );
      expect(recording.onPressed, isNull);

      harness.repository.recordGate!.complete();
      await tester.pumpAndSettle();
      expect(harness.repository.recordedLocations, hasLength(1));
      expect(find.text('Location received'), findsOneWidget);
      expect(find.text('8.97440°, 7.45281° · ±97 m'), findsOneWidget);
      expect(
        find.text(
          VerificationResultScreen.dateTime(DateTime(2026, 10, 6, 0, 50)),
        ),
        findsOneWidget,
      );
      expect(find.text('Location Record Updated'), findsOneWidget);

      // Recording again, e.g. after moving.
      await tester.tap(find.text('Location Record Updated'));
      await tester.pumpAndSettle();
      expect(harness.location.reads, 2);
      expect(find.text('Location Record Updated'), findsOneWidget);
    });

    for (final (problem, message) in [
      (
        LocationProblem.serviceOff,
        'Turn on location (GPS) to record your location.',
      ),
      (
        LocationProblem.permissionDenied,
        'Allow location access to record your location.',
      ),
      (
        LocationProblem.unavailable,
        'Your location could not be read. Try again.',
      ),
    ]) {
      testWidgets('${problem.name}: says what to do', (tester) async {
        await _pump(tester, location: FakeLocationReader(problem: problem));
        await _reveal(
          tester,
          find.text('Record location for destination check'),
        );

        await tester.tap(find.text('Record location for destination check'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 300));
        expect(find.text(message), findsOneWidget);
        expect(
          find.text('Record location for destination check'),
          findsOneWidget,
        );
        await _toastGone(tester);
      });
    }

    testWidgets('CHL refusing the location says why', (tester) async {
      final harness = await _pump(tester);
      harness.repository.recordError = const VerificationFailure(
        'CHL could not record the location.',
      );
      await _reveal(tester, find.text('Record location for destination check'));

      await tester.tap(find.text('Record location for destination check'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.text('CHL could not record the location.'), findsOneWidget);
      expect(find.text('Location received'), findsNothing);
      await _toastGone(tester);
    });
  });

  testWidgets('Refresh Trip Status asks CHL again', (tester) async {
    final harness = await _pump(tester);
    await _reveal(tester, find.text('Refresh Trip Status'));

    await tester.tap(find.text('Refresh Trip Status'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(harness.repository.refreshes, 1);
    expect(find.text('Trip status updated.'), findsOneWidget);
    await _toastGone(tester);
  });

  testWidgets('a failed refresh says why and keeps the result', (tester) async {
    final harness = await _pump(tester);
    harness.repository.refreshError = const VerificationFailure(
      'CHL is not responding.',
    );
    await _reveal(tester, find.text('Refresh Trip Status'));

    await tester.tap(find.text('Refresh Trip Status'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('CHL is not responding.'), findsOneWidget);
    expect(find.text('Refresh Trip Status'), findsOneWidget);
    await _toastGone(tester);
  });

  testWidgets('Finish Verification returns to the dashboard', (tester) async {
    await _pump(tester);
    await _reveal(tester, find.text('Finish Verification'));

    await tester.tap(find.text('Finish Verification'));
    await tester.pumpAndSettle();
    expect(find.text('dashboard page'), findsOneWidget);
  });

  testWidgets('back returns to the page before', (tester) async {
    await _pump(tester);

    await tester.tap(find.bySemanticsLabel('Back'));
    await tester.pumpAndSettle();
    expect(find.text('plate page'), findsOneWidget);
  });

  testWidgets('no active trip has no design yet', (tester) async {
    await _pump(tester, result: sampleNoTripResult(_now));

    expect(find.text('LND 482 XK'), findsOneWidget);
    expect(find.text('Active CHL trip'), findsNothing);
  });

  testWidgets('opened without a verification', (tester) async {
    await _pump(tester, noResult: true);

    expect(find.text('There is no verification to show.'), findsOneWidget);
  });

  group('fits', () {
    for (final (name, size, scale) in [
      ('small phone', const Size(320, 568), 1.0),
      ('landscape', const Size(844, 390), 1.0),
      ('tablet', const Size(820, 1180), 1.0),
      ('200% text', const Size(390, 844), 2.0),
    ]) {
      testWidgets('the whole page on a $name', (tester) async {
        await _pump(tester, size: size, textScale: scale);
        await tester.tap(find.text('Additional trip information'));
        await tester.pumpAndSettle();
        await _reveal(tester, find.text('Refresh Trip Status'));
        expect(tester.takeException(), isNull);
        expect(find.text('Refresh Trip Status').hitTestable(), findsOneWidget);
      });
    }
  });
}
