import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/core/utils/clock.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_session.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/officer.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/session_provider.dart';
import 'package:jbr_chl_enforcement/features/vehicle/presentation/screens/unresolved_verification_screen.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/plate_number.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/scanned_qr.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/unresolved_verification.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/verification_request.dart';
import 'package:jbr_chl_enforcement/features/verification_history/domain/entities/verification_record_details.dart';

final _checkedAt = DateTime(2026, 10, 3, 9, 41);
final _plate = PlateVerification(PlateNumber.tryParse('ABC123AA')!);
const _lagos = RecordLocation(latitude: 6.6018, longitude: 3.3515);

Widget _page(String label) => Scaffold(body: Center(child: Text(label)));

class _Harness {
  _Harness(this.ticks, this.router);

  final StreamController<DateTime> ticks;
  final GoRouter router;
}

Future<_Harness> _pump(
  WidgetTester tester,
  UnresolvedVerification outcome, {
  bool signedIn = true,
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

  final ticks = StreamController<DateTime>.broadcast();
  addTearDown(ticks.close);
  final router = GoRouter(
    initialLocation: RoutePaths.verifyTrip,
    routes: [
      GoRoute(
        path: RoutePaths.dashboard,
        name: RouteNames.dashboard,
        builder: (context, state) => _page('dashboard page'),
      ),
      GoRoute(
        path: RoutePaths.verifyTrip,
        name: RouteNames.verifyTrip,
        builder: (context, state) => _page('methods page'),
      ),
      GoRoute(
        path: RoutePaths.manualPlate,
        name: RouteNames.manualPlate,
        builder: (context, state) => _page('plate page'),
      ),
      GoRoute(
        path: RoutePaths.verificationProcessing,
        name: RouteNames.verificationProcessing,
        builder: (context, state) =>
            _page('processing ${(state.extra! as VerificationRequest).plate}'),
      ),
      GoRoute(
        path: RoutePaths.verificationResult,
        name: RouteNames.verificationResult,
        builder: (context, state) => UnresolvedVerificationScreen(
          outcome: state.extra! as UnresolvedVerification,
        ),
      ),
    ],
  );
  addTearDown(router.dispose);

  final container = ProviderContainer(
    overrides: [
      clockProvider.overrideWithValue(() => _checkedAt),
      secondTickerProvider.overrideWith((ref) => ticks.stream),
    ],
  );
  addTearDown(container.dispose);
  if (signedIn) {
    container
        .read(sessionProvider.notifier)
        .start(
          const AuthSession(
            accessToken: 'token',
            officer: Officer(
              id: '1',
              name: 'Daniel John',
              email: 'officer@jbr.com',
            ),
          ),
        );
  }

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  unawaited(router.push(RoutePaths.manualPlate));
  await tester.pumpAndSettle();
  unawaited(router.push(RoutePaths.verificationResult, extra: outcome));
  await tester.pumpAndSettle();
  return _Harness(ticks, router);
}

Finder _row(String label) => find.bySemanticsLabel(label);

/// Scrolls [finder] fully into view.
Future<void> _reveal(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(
    finder,
    300,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.ensureVisible(finder);
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

  group('wording', () {
    test('checked how long ago', () {
      final at = DateTime(2026, 10, 3, 9, 41);
      expect(
        UnresolvedVerificationScreen.checkedAgo(at, at),
        'Checked just now',
      );
      expect(
        UnresolvedVerificationScreen.checkedAgo(
          at,
          at.add(const Duration(seconds: 59)),
        ),
        'Checked just now',
      );
      expect(
        UnresolvedVerificationScreen.checkedAgo(
          at,
          at.add(const Duration(minutes: 5)),
        ),
        'Checked 5 min ago',
      );
      expect(
        UnresolvedVerificationScreen.checkedAgo(
          at,
          at.add(const Duration(hours: 2)),
        ),
        'Checked at 09:41',
      );
    });

    test('checked at', () {
      expect(
        UnresolvedVerificationScreen.checkedAt(DateTime(2026, 10, 3, 9, 41)),
        '3 Oct 2026, 09:41',
      );
    });

    test('GPS', () {
      expect(UnresolvedVerificationScreen.gps(_lagos), '6.6018° N, 3.3515° E');
      expect(
        UnresolvedVerificationScreen.gps(
          const RecordLocation(latitude: -33.8688, longitude: -70.6693),
        ),
        '33.8688° S, 70.6693° W',
      );
    });

    test('method', () {
      expect(UnresolvedVerificationScreen.method(_plate), 'Manual plate');
      expect(
        UnresolvedVerificationScreen.method(
          QrVerification(ScannedQr.read('JRB-CHL-RCPT-000123')),
        ),
        'Receipt QR',
      );
      expect(
        UnresolvedVerificationScreen.method(
          QrVerification(ScannedQr.read('ETAG-7781')),
        ),
        'Tag QR',
      );
    });
  });

  group('vehicle not found', () {
    VehicleNotFound notFound({
      VerificationRequest? request,
      RecordLocation? location = _lagos,
    }) => VehicleNotFound(
      request: request ?? _plate,
      checkedAt: _checkedAt,
      location: location,
    );

    testWidgets('as designed', (tester) async {
      await _pump(tester, notFound());

      expect(find.text('Verification result'), findsOneWidget);
      expect(find.text('Vehicle Not Found'), findsOneWidget);
      expect(find.bySemanticsLabel('Notifications'), findsOneWidget);
      expect(
        find.text(
          'We couldn’t find a vehicle for this plate. Check the number and '
          'try again.',
        ),
        findsOneWidget,
      );
      expect(find.text('Checked just now'), findsOneWidget);
      expect(find.text('ABC123AA'), findsOneWidget);
      expect(_row('Plate ABC 123 AA'), findsOneWidget);
      for (final row in [
        'Vehicle identity: Not resolved',
        'E-Tag validity: Not verified',
        'CHL trip status: Not resolved',
      ]) {
        expect(_row(row), findsOneWidget, reason: row);
      }
      expect(find.text('Verification details'), findsOneWidget);
      expect(find.text('Manual plate'), findsNothing);
      expect(find.text('Check Plate Again').hitTestable(), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('Verification details opens and closes', (tester) async {
      await _pump(tester, notFound());

      await tester.tap(find.text('Verification details'));
      await tester.pumpAndSettle();
      for (final row in [
        'Verification method: Manual plate',
        'Checked at: 3 Oct 2026, 09:41',
        'GPS: 6.6018° N, 3.3515° E',
        'Agent: Daniel John',
      ]) {
        expect(_row(row), findsOneWidget, reason: row);
      }

      tester.semantics.tap(find.semantics.byLabel('Verification details'));
      await tester.pumpAndSettle();
      expect(find.text('Manual plate'), findsNothing);
    });

    testWidgets('what was not recorded says so', (tester) async {
      await _pump(tester, notFound(location: null), signedIn: false);

      await tester.tap(find.text('Verification details'));
      await tester.pumpAndSettle();
      expect(_row('GPS: Not recorded'), findsOneWidget);
      expect(_row('Agent: Not recorded'), findsOneWidget);
    });

    testWidgets('the check time moves on', (tester) async {
      final harness = await _pump(tester, notFound());

      harness.ticks.add(_checkedAt.add(const Duration(minutes: 3)));
      await tester.pump();
      await tester.pump();
      expect(find.text('Checked 3 min ago'), findsOneWidget);
    });

    testWidgets('Check Plate Again returns to plate entry', (tester) async {
      await _pump(tester, notFound());

      await tester.tap(find.text('Check Plate Again'));
      await tester.pumpAndSettle();
      expect(find.text('plate page'), findsOneWidget);
    });

    testWidgets('a scanned code offers to enter the plate', (tester) async {
      await _pump(
        tester,
        notFound(request: QrVerification(ScannedQr.read('ETAG-7781'))),
      );

      expect(
        find.text(
          'We couldn’t find a vehicle for this code. Scan it again or enter '
          'the plate instead.',
        ),
        findsOneWidget,
      );
      expect(_row('Scanned E-Tag QR code'), findsOneWidget);
      expect(find.text('Check Plate Again'), findsNothing);

      await tester.tap(find.text('Enter Plate Instead'));
      await tester.pumpAndSettle();
      expect(find.text('plate page'), findsOneWidget);
    });
  });

  group('verification unavailable', () {
    final unavailable = VerificationUnavailable(
      request: _plate,
      checkedAt: _checkedAt,
    );

    testWidgets('as designed', (tester) async {
      await _pump(tester, unavailable);

      expect(find.text('Verification Unavailable'), findsOneWidget);
      expect(find.bySemanticsLabel('Notifications'), findsOneWidget);
      expect(
        find.text(
          'CHL verification could not be completed. Please retry when the '
          'service or connection is available.',
        ),
        findsOneWidget,
      );
      expect(find.text('Checked just now'), findsOneWidget);
      expect(find.text('ABC123AA'), findsOneWidget);
      expect(
        find.text(
          'No trip conclusion has been made. This is not a No Active Trip or '
          'invalid E-Tag finding.',
        ),
        findsOneWidget,
      );
      for (final row in [
        'Vehicle identity: Not verified',
        'E-Tag validity: Not verified',
        'CHL trip status: Not resolved',
      ]) {
        expect(_row(row), findsOneWidget, reason: row);
      }
      expect(find.text('Verification details'), findsNothing);
      await _reveal(tester, find.text('Choose another method'));
      expect(find.text('Try again').hitTestable(), findsOneWidget);
      expect(find.text('Choose another method').hitTestable(), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('a scanned receipt says what was scanned', (tester) async {
      await _pump(
        tester,
        VerificationUnavailable(
          request: QrVerification(ScannedQr.read('JRB-CHL-RCPT-000123')),
          checkedAt: _checkedAt,
        ),
      );

      expect(find.text('Receipt QR'), findsOneWidget);
      expect(_row('Scanned receipt QR code'), findsOneWidget);
    });

    testWidgets('Try again verifies the same request again', (tester) async {
      await _pump(tester, unavailable);
      await _reveal(tester, find.text('Try again'));

      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();
      expect(find.text('processing ABC 123 AA'), findsOneWidget);
    });

    testWidgets('Choose another method returns to the methods', (tester) async {
      await _pump(tester, unavailable);
      await _reveal(tester, find.text('Choose another method'));

      await tester.tap(find.text('Choose another method'));
      await tester.pumpAndSettle();
      expect(find.text('methods page'), findsOneWidget);
    });
  });

  group('fits', () {
    for (final (name, size, scale) in [
      ('small phone', const Size(320, 568), 1.0),
      ('landscape', const Size(844, 390), 1.0),
      ('tablet', const Size(820, 1180), 1.0),
      ('200% text', const Size(390, 844), 2.0),
    ]) {
      testWidgets('both pages on a $name', (tester) async {
        final harness = await _pump(
          tester,
          VehicleNotFound(
            request: _plate,
            checkedAt: _checkedAt,
            location: _lagos,
          ),
          size: size,
          textScale: scale,
        );
        await tester.ensureVisible(find.text('Verification details'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Verification details'));
        await tester.pumpAndSettle();
        await _reveal(tester, find.text('Check Plate Again'));
        expect(tester.takeException(), isNull);
        expect(find.text('Check Plate Again').hitTestable(), findsOneWidget);

        unawaited(
          harness.router.pushReplacement(
            RoutePaths.verificationResult,
            extra: VerificationUnavailable(
              request: _plate,
              checkedAt: _checkedAt,
            ),
          ),
        );
        await tester.pumpAndSettle();
        await _reveal(tester, find.text('Choose another method'));
        expect(tester.takeException(), isNull);
        expect(
          find.text('Choose another method').hitTestable(),
          findsOneWidget,
        );
      });
    }
  });
}
