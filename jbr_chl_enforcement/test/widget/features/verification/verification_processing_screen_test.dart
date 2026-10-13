import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/notifications/presentation/providers/notifications_controller.dart';
import 'package:jbr_chl_enforcement/features/vehicle/domain/entities/verification_result.dart';
import 'package:jbr_chl_enforcement/features/verification/data/repositories/verification_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/plate_number.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/scanned_qr.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/verification_request.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/repositories/verification_repository.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/verification_processing_screen.dart';

import '../../../helpers/fakes.dart';
import '../../../helpers/verification_samples.dart';

final _now = DateTime(2026, 10, 6, 0, 30);
final _plate = PlateNumber.tryParse('ABC123AA')!;

Widget _page(String label) => Scaffold(body: Center(child: Text(label)));

/// Long enough for a page transition; the spinners never settle.
Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 200));
  }
}

Future<FakeVerificationRepository> _pump(
  WidgetTester tester,
  VerificationRequest request, {
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

  final repository = FakeVerificationRepository();
  final router = GoRouter(
    initialLocation: RoutePaths.manualPlate,
    routes: [
      GoRoute(
        path: RoutePaths.dashboard,
        name: RouteNames.dashboard,
        builder: (context, state) => _page('dashboard page'),
      ),
      GoRoute(
        path: RoutePaths.manualPlate,
        name: RouteNames.manualPlate,
        builder: (context, state) => _page('plate page'),
      ),
      GoRoute(
        path: RoutePaths.verificationProcessing,
        name: RouteNames.verificationProcessing,
        builder: (context, state) => VerificationProcessingScreen(
          request: state.extra! as VerificationRequest,
        ),
      ),
      GoRoute(
        path: RoutePaths.verificationResult,
        name: RouteNames.verificationResult,
        builder: (context, state) => _page(
          'result for ${(state.extra! as VerificationResult).plate.display}',
        ),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        verificationRepositoryProvider.overrideWithValue(repository),
        unreadNotificationCountProvider.overrideWithValue(0),
      ],
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  unawaited(router.push(RoutePaths.verificationProcessing, extra: request));
  await _settle(tester);
  return repository;
}

Finder _step(String label, String status) =>
    find.bySemanticsLabel('$label, $status');

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

  testWidgets('each check shows as it runs', (tester) async {
    final repository = await _pump(tester, PlateVerification(_plate));

    expect(repository.requests, [PlateVerification(_plate)]);
    expect(find.text('Verification processing'), findsOneWidget);
    expect(find.text('Checking vehicle…'), findsOneWidget);
    expect(
      find.text(
        'Vehicle identity, E-Tag validation and CHL trip status\n'
        'are checked together.',
      ),
      findsOneWidget,
    );
    expect(find.text('ABC 123 AA'), findsOneWidget);
    expect(find.text('Verifying vehicle'), findsOneWidget);
    expect(find.text('Waiting for CHL confirmation'), findsOneWidget);
    expect(find.text('Cancel Verification'), findsOneWidget);

    repository.emit(const StageStarted(VerificationStage.identifyingVehicle));
    await tester.pump();
    expect(_step('Identifying vehicle', 'in progress'), findsOneWidget);
    expect(_step('Validating E-Tag', 'waiting'), findsOneWidget);
    expect(_step('Checking CHL trip', 'waiting'), findsOneWidget);

    repository.emit(const StageStarted(VerificationStage.validatingETag));
    await tester.pump();
    expect(_step('Identifying vehicle', 'done'), findsOneWidget);
    expect(_step('Validating E-Tag', 'in progress'), findsOneWidget);

    repository.emit(const StageStarted(VerificationStage.checkingTrip));
    await tester.pump();
    expect(_step('Validating E-Tag', 'done'), findsOneWidget);
    expect(_step('Checking CHL trip', 'in progress'), findsOneWidget);
  });

  testWidgets('when every check is done, the result opens', (tester) async {
    final repository = await _pump(tester, PlateVerification(_plate));

    repository.emit(VerificationCompleted(sampleActiveResult(_now)));
    await tester.pump();
    for (final step in VerificationStage.values) {
      expect(_step(step.label, 'done'), findsOneWidget);
    }
    // The finished checks stay a moment.
    expect(find.text('result for ABC 123 AA'), findsNothing);

    await tester.pump(VerificationProcessingScreen.finishedPause);
    await _settle(tester);
    expect(find.text('result for ABC 123 AA'), findsOneWidget);
    expect(find.byType(VerificationProcessingScreen), findsNothing);
  });

  testWidgets('a scanned code shows what was scanned until the vehicle is '
      'identified', (tester) async {
    final repository = await _pump(
      tester,
      QrVerification(ScannedQr.read('JRB-CHL-RCPT-000123')),
    );
    expect(find.text('Receipt QR'), findsOneWidget);

    repository.emit(VehicleIdentified(_plate));
    await tester.pump();
    expect(find.text('ABC 123 AA'), findsOneWidget);
    expect(find.text('Receipt QR'), findsNothing);
  });

  testWidgets('a scanned E-Tag says so', (tester) async {
    await _pump(tester, QrVerification(ScannedQr.read('ETAG-7781')));

    expect(find.text('E-Tag QR'), findsOneWidget);
  });

  testWidgets('when CHL cannot be reached: unavailable, and Try again', (
    tester,
  ) async {
    final repository = await _pump(tester, PlateVerification(_plate));
    repository
      ..emit(const StageStarted(VerificationStage.identifyingVehicle))
      ..fail(const VerificationFailure('CHL is not responding.'));
    await tester.pump();

    expect(find.text('Verification unavailable'), findsOneWidget);
    expect(find.text('CHL is not responding.'), findsOneWidget);
    expect(find.text('Try again'), findsOneWidget);
    expect(_step('Identifying vehicle', 'waiting'), findsOneWidget);

    await tester.tap(find.text('Try again'));
    await tester.pump();
    expect(repository.requests, hasLength(2));
    expect(find.text('Verifying vehicle'), findsOneWidget);
    expect(find.text('Try again'), findsNothing);
  });

  testWidgets('any other error reads as a connection problem', (tester) async {
    final repository = await _pump(tester, PlateVerification(_plate));
    repository.fail(StateError('socket closed'));
    await tester.pump();

    expect(
      find.text(
        'CHL could not be reached. Check the connection and try again.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('Cancel stops the verification and goes back', (tester) async {
    final repository = await _pump(tester, PlateVerification(_plate));

    await tester.tap(find.text('Cancel Verification'));
    await _settle(tester);

    expect(repository.cancelled, 1);
    expect(find.text('plate page'), findsOneWidget);
  });

  testWidgets('the back button stops it too', (tester) async {
    final repository = await _pump(tester, PlateVerification(_plate));

    await tester.tap(find.bySemanticsLabel('Back'));
    await _settle(tester);

    expect(repository.cancelled, 1);
    expect(find.text('plate page'), findsOneWidget);
  });

  group('fits', () {
    for (final (name, size, scale) in [
      ('small phone', const Size(320, 568), 1.0),
      ('landscape', const Size(844, 390), 1.0),
      ('200% text', const Size(390, 844), 2.0),
    ]) {
      testWidgets('running and failed on a $name', (tester) async {
        final repository = await _pump(
          tester,
          PlateVerification(_plate),
          size: size,
          textScale: scale,
        );
        repository.emit(const StageStarted(VerificationStage.validatingETag));
        await tester.pump();
        expect(tester.takeException(), isNull);
        expect(find.text('Cancel Verification').hitTestable(), findsOneWidget);

        repository.fail(const VerificationFailure('CHL is not responding.'));
        await tester.pump();
        expect(tester.takeException(), isNull);
        expect(find.text('Try again').hitTestable(), findsOneWidget);
      });
    }
  });
}
