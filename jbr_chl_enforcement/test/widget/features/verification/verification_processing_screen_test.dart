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
import 'package:jbr_chl_enforcement/features/verification/domain/entities/unresolved_verification.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/haulage_tag.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/verification_request.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/repositories/verification_repository.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/verification_processing_screen.dart';
import 'package:jbr_chl_enforcement/shared/device/location/location_adapter.dart';

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
  FakeLocationReader? location,
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
        path: RoutePaths.eTagReceipt,
        name: RouteNames.eTagReceipt,
        builder: (context, state) =>
            _page('receipt ${(state.extra! as ScannedQr).value}'),
      ),
      GoRoute(
        path: RoutePaths.verificationResult,
        name: RouteNames.verificationResult,
        builder: (context, state) => _page(switch (state.extra) {
          final VerificationResult result =>
            'result for ${result.plate.display}',
          VehicleNotFound(:final location) =>
            'not found at ${location?.latitude}',
          VerificationUnavailable(:final request) =>
            'unavailable: ${request.plate}',
          _ => 'no result',
        }),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        verificationRepositoryProvider.overrideWithValue(repository),
        unreadNotificationCountProvider.overrideWithValue(0),
        locationReaderProvider.overrideWithValue(
          location ?? FakeLocationReader(),
        ),
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

  group('GPS on every verification', () {
    testWidgets('the location is read first and sent with the request', (
      tester,
    ) async {
      final location = FakeLocationReader();
      final repository = await _pump(
        tester,
        PlateVerification(_plate),
        location: location,
      );

      expect(location.reads, 1);
      expect(repository.locations.single.latitude, 8.974402);
    });

    testWidgets('while it is read, the first check shows as running', (
      tester,
    ) async {
      final location = FakeLocationReader()..gate = Completer<void>();
      final repository = await _pump(
        tester,
        PlateVerification(_plate),
        location: location,
      );

      expect(_step('Identifying vehicle', 'in progress'), findsOneWidget);
      expect(repository.requests, isEmpty);

      location.gate!.complete();
      await tester.pump();
      expect(repository.requests, hasLength(1));
    });

    for (final (problem, message) in [
      (
        LocationProblem.serviceOff,
        'Turn on location (GPS) to verify. Every verification records its '
            'location.',
      ),
      (
        LocationProblem.permissionDenied,
        'Allow location access to verify. Every verification records its '
            'location.',
      ),
      (
        LocationProblem.unavailable,
        'Your location could not be read. Move to open sky and try again.',
      ),
    ]) {
      testWidgets('${problem.name}: not verified, and says why', (
        tester,
      ) async {
        final repository = await _pump(
          tester,
          PlateVerification(_plate),
          location: FakeLocationReader(problem: problem),
        );
        await _settle(tester);

        expect(repository.requests, isEmpty);
        expect(find.text('plate page'), findsOneWidget);
        expect(find.text(message), findsOneWidget);
        await tester.pump(const Duration(seconds: 4));
        await _settle(tester);
      });
    }
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
    expect(find.text('QR code'), findsOneWidget);

    repository.emit(VehicleIdentified(_plate));
    await tester.pump();
    expect(find.text('ABC 123 AA'), findsOneWidget);
    expect(find.text('QR code'), findsNothing);
  });

  testWidgets('a read haulage tag says so until the vehicle is identified', (
    tester,
  ) async {
    final repository = await _pump(
      tester,
      const TagVerification(HaulageTag('E2000017')),
    );
    expect(find.text('Haulage tag'), findsOneWidget);

    repository.emit(VehicleIdentified(_plate));
    await tester.pump();
    expect(find.text('ABC 123 AA'), findsOneWidget);
  });

  testWidgets('a scanned E-Tag ends in its receipt', (tester) async {
    final repository = await _pump(
      tester,
      QrVerification(ScannedQr.read('ETAG-7781')),
    );
    expect(find.text('E-Tag'), findsOneWidget);

    repository.emit(VerificationCompleted(sampleActiveResult(_now)));
    await tester.pump();
    await tester.pump(VerificationProcessingScreen.finishedPause);
    await _settle(tester);
    expect(find.text('receipt ETAG-7781'), findsOneWidget);
  });

  testWidgets('a scanned E-Tag can be Vehicle Not Found too', (tester) async {
    final repository = await _pump(
      tester,
      QrVerification(ScannedQr.read('ETAG-7781')),
    );
    repository.emit(const NoVehicleFound());
    await _settle(tester);
    expect(find.text('not found at 8.974402'), findsOneWidget);
  });

  testWidgets('no such vehicle opens Vehicle Not Found', (tester) async {
    final repository = await _pump(tester, PlateVerification(_plate));
    repository
      ..emit(const StageStarted(VerificationStage.identifyingVehicle))
      ..emit(const NoVehicleFound());
    await _settle(tester);

    // Found nowhere, at the officer's location.
    expect(find.text('not found at 8.974402'), findsOneWidget);
    expect(find.byType(VerificationProcessingScreen), findsNothing);
  });

  for (final (name, error) in [
    ('CHL failing', const VerificationFailure('CHL is not responding.')),
    ('any other error', StateError('socket closed')),
  ]) {
    testWidgets('$name opens Verification Unavailable', (tester) async {
      final repository = await _pump(tester, PlateVerification(_plate));
      repository
        ..emit(const StageStarted(VerificationStage.identifyingVehicle))
        ..fail(error);
      await _settle(tester);

      expect(find.text('unavailable: ABC 123 AA'), findsOneWidget);
      expect(find.byType(VerificationProcessingScreen), findsNothing);
    });
  }

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
      testWidgets('running on a $name', (tester) async {
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
      });
    }
  });
}
