import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/core/utils/clock.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/scanned_qr.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/verification_request.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/qr_scan_screen.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/widgets/qr_scanner_overlay.dart';
import 'package:jbr_chl_enforcement/shared/device/permissions/permission_adapter.dart';
import 'package:jbr_chl_enforcement/shared/device/scanner/qr_scanner_adapter.dart';

import '../../../helpers/fakes.dart';

Widget _page(String label) => Scaffold(body: Center(child: Text(label)));

GoRouter _router() => GoRouter(
  initialLocation: RoutePaths.dashboard,
  routes: [
    GoRoute(
      path: RoutePaths.dashboard,
      name: RouteNames.dashboard,
      builder: (context, state) => _page('dashboard page'),
    ),
    GoRoute(
      path: RoutePaths.qrScan,
      name: RouteNames.qrScan,
      builder: (context, state) => const QrScanScreen(),
    ),
    GoRoute(
      path: RoutePaths.manualPlate,
      name: RouteNames.manualPlate,
      builder: (context, state) => _page('plate page'),
    ),
    GoRoute(
      path: RoutePaths.verificationProcessing,
      name: RouteNames.verificationProcessing,
      builder: (context, state) {
        final scan = (state.extra! as QrVerification).code;
        return _page('result ${scan.kind.name} ${scan.value}');
      },
    ),
    GoRoute(
      path: RoutePaths.eTagReceipt,
      name: RouteNames.eTagReceipt,
      builder: (context, state) =>
          _page('receipt ${(state.extra! as ScannedQr).value}'),
    ),
  ],
);

class _Harness {
  _Harness(this.scanner, this.permissions);

  final FakeQrScanner scanner;
  final FakePermissionAdapter permissions;
  DateTime now = DateTime(2026, 10, 13, 10);
}

Future<_Harness> _pump(
  WidgetTester tester, {
  FakeQrScanner? scanner,
  FakePermissionAdapter? permissions,
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
    scanner ?? FakeQrScanner(),
    permissions ?? FakePermissionAdapter(),
  );
  final router = _router();
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        qrScannerFactoryProvider.overrideWithValue(() => harness.scanner),
        permissionAdapterProvider.overrideWithValue(harness.permissions),
        clockProvider.overrideWithValue(() => harness.now),
      ],
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  unawaited(router.push(RoutePaths.qrScan));
  await tester.pumpAndSettle();
  return harness;
}

Finder get _shutter =>
    find.bySemanticsLabel(RegExp('QR and continue to verification\$'));

Future<void> _tapShutter(WidgetTester tester) async {
  await tester.ensureVisible(_shutter);
  await tester.tap(_shutter);
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

  testWidgets('a CHL receipt, as designed', (tester) async {
    await _pump(tester);

    expect(find.text('CHL receipt verification'), findsOneWidget);
    expect(find.text('Scan CHL receipt QR'), findsOneWidget);
    expect(
      find.text('Point your camera at the QR code on the CHL receipt.'),
      findsOneWidget,
    );
    expect(
      find.text(
        'Keep the receipt steady and fit the entire QR inside the guide.',
      ),
      findsOneWidget,
    );
    expect(find.byKey(const Key('camera preview')), findsOneWidget);
    expect(find.text('Scan receipt'), findsOneWidget);
    expect(
      find.bySemanticsLabel('Scan receipt QR and continue to verification'),
      findsOneWidget,
    );
    expect(find.text('Enter plate instead'), findsOneWidget);
    expect(find.bySemanticsLabel('Close receipt QR scanner'), findsOneWidget);
  });

  testWidgets('Scan with a code in view continues to verification', (
    tester,
  ) async {
    final harness = await _pump(tester);

    harness.scanner.see('  JRB-CHL-RCPT-000123 ');
    await tester.pump();
    harness.now = harness.now.add(const Duration(milliseconds: 600));
    await _tapShutter(tester);

    expect(find.text('result qrCode JRB-CHL-RCPT-000123'), findsOneWidget);
    // The scanner page was replaced, so its camera is released.
    expect(harness.scanner.disposed, isTrue);
  });

  testWidgets('the same scanner opens the receipt for an E-Tag', (
    tester,
  ) async {
    final harness = await _pump(tester);

    harness.scanner.see('ETAG-7781-0042');
    await tester.pump();
    await _tapShutter(tester);

    // Not verified: an E-Tag opens its receipt.
    expect(find.text('receipt ETAG-7781-0042'), findsOneWidget);
    expect(harness.scanner.disposed, isTrue);
  });

  testWidgets('Scan with nothing in view: no QR code detected', (tester) async {
    await _pump(tester);

    await _tapShutter(tester);

    expect(
      find.text(
        'No QR code detected. Keep the complete receipt QR inside the frame.',
      ),
      findsOneWidget,
    );
    expect(find.text('Retry Scanning'), findsOneWidget);
    expect(find.text('Enter Plate Instead'), findsOneWidget);
    expect(_shutter, findsNothing);
    // The camera keeps running behind the message.

    await tester.tap(find.text('Retry Scanning'));
    await tester.pumpAndSettle();
    expect(_shutter, findsOneWidget);
    expect(find.textContaining('No QR code detected'), findsNothing);
  });

  testWidgets('a code seen too long ago is not in view any more', (
    tester,
  ) async {
    final harness = await _pump(tester);

    harness.scanner.see('JRB-CHL-RCPT-000123');
    await tester.pump();
    harness.now = harness.now.add(const Duration(seconds: 2));
    await _tapShutter(tester);

    expect(find.textContaining('No QR code detected'), findsOneWidget);
  });

  testWidgets('a code that cannot be decoded is unreadable', (tester) async {
    final harness = await _pump(tester);

    harness.scanner.see(null);
    await tester.pump();
    await _tapShutter(tester);

    expect(
      find.text(
        'Unable to read this receipt QR. Improve lighting and try again.',
      ),
      findsOneWidget,
    );
    expect(find.text('Retry Scanning'), findsOneWidget);
  });

  testWidgets('a blank code is unreadable too', (tester) async {
    final harness = await _pump(tester);

    harness.scanner.see('   ');
    await tester.pump();
    await _tapShutter(tester);

    expect(
      find.text(
        'Unable to read this receipt QR. Improve lighting and try again.',
      ),
      findsOneWidget,
    );
  });

  group('camera access', () {
    testWidgets('denied: explains, and Retry asks again', (tester) async {
      final harness = await _pump(
        tester,
        scanner: FakeQrScanner(status: QrCameraStatus.permissionDenied),
        permissions: FakePermissionAdapter(
          statuses: {AppPermission.camera: AppPermissionStatus.denied},
        ),
      );

      expect(find.text('Camera permission denied'), findsOneWidget);
      expect(
        find.text(
          'Restore camera access in device settings, or enter the vehicle '
          'plate.',
        ),
        findsOneWidget,
      );
      expect(
        find.text('You can still verify by plate number.'),
        findsOneWidget,
      );
      expect(find.byKey(const Key('camera preview')), findsNothing);
      expect(_shutter, findsNothing);

      await tester.tap(find.text('Retry Camera Access'));
      await tester.pumpAndSettle();

      expect(harness.permissions.requested, [AppPermission.camera]);
      expect(harness.scanner.starts, 1);
      expect(find.text('Camera permission denied'), findsNothing);
      expect(_shutter, findsOneWidget);
    });

    testWidgets('blocked: Retry opens the settings, and coming back with '
        'access restarts the camera', (tester) async {
      final harness = await _pump(
        tester,
        scanner: FakeQrScanner(status: QrCameraStatus.permissionDenied),
        permissions: FakePermissionAdapter(
          statuses: {
            AppPermission.camera: AppPermissionStatus.permanentlyDenied,
          },
          statusAfterRequest: AppPermissionStatus.permanentlyDenied,
        ),
      );

      await tester.tap(find.text('Retry Camera Access'));
      await tester.pumpAndSettle();
      expect(harness.permissions.appSettingsOpened, 1);
      expect(harness.scanner.starts, 0);

      // The officer allows the camera in settings and comes back.
      harness.permissions.statuses[AppPermission.camera] =
          AppPermissionStatus.granted;
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();

      expect(harness.scanner.starts, 1);
      expect(_shutter, findsOneWidget);
    });

    testWidgets('no camera: says so, and Retry starts it again', (
      tester,
    ) async {
      final harness = await _pump(
        tester,
        scanner: FakeQrScanner(status: QrCameraStatus.unavailable),
      );

      expect(find.text('Camera unavailable'), findsOneWidget);
      await tester.tap(find.text('Retry Camera Access'));
      await tester.pumpAndSettle();

      expect(harness.scanner.starts, 1);
      expect(harness.permissions.requested, isEmpty);
      expect(_shutter, findsOneWidget);
    });

    testWidgets('while starting, no scan line yet', (tester) async {
      await _pump(
        tester,
        scanner: FakeQrScanner(status: QrCameraStatus.starting),
      );
      expect(_shutter, findsOneWidget);
    });
  });

  testWidgets('Enter plate instead replaces the scanner', (tester) async {
    final harness = await _pump(tester);

    await tester.ensureVisible(find.text('Enter plate instead'));
    await tester.tap(find.text('Enter plate instead'));
    await tester.pumpAndSettle();
    expect(find.text('plate page'), findsOneWidget);
    expect(harness.scanner.disposed, isTrue);
  });

  testWidgets('close returns to the page before', (tester) async {
    await _pump(tester);

    await tester.tap(find.bySemanticsLabel('Close receipt QR scanner'));
    await tester.pumpAndSettle();
    expect(find.text('dashboard page'), findsOneWidget);
  });

  testWidgets('screen readers can scan and close', (tester) async {
    final harness = await _pump(tester);

    harness.scanner.see('JRB-CHL-RCPT-000123');
    await tester.pump();
    tester.semantics.tap(
      find.semantics.byLabel('Scan receipt QR and continue to verification'),
    );
    await tester.pumpAndSettle();
    expect(find.text('result qrCode JRB-CHL-RCPT-000123'), findsOneWidget);
  });

  group('fits', () {
    for (final (name, size, scale) in [
      ('small phone', const Size(320, 568), 1.0),
      ('landscape', const Size(844, 390), 1.0),
      ('tablet', const Size(820, 1180), 1.0),
      ('200% text', const Size(390, 844), 2.0),
    ]) {
      testWidgets('every state on a $name', (tester) async {
        for (final status in [
          QrCameraStatus.running,
          QrCameraStatus.permissionDenied,
        ]) {
          await tester.pumpWidget(const SizedBox());
          await _pump(
            tester,
            size: size,
            textScale: scale,
            scanner: FakeQrScanner(status: status),
          );
          expect(tester.takeException(), isNull);
          final frame = tester.getSize(find.byType(QrScanFrame));
          expect(frame.height, inInclusiveRange(230, 440));

          final enterPlate = find.textContaining(
            RegExp('Enter [Pp]late [Ii]nstead'),
          );
          await tester.ensureVisible(enterPlate);
          await tester.pumpAndSettle();
          expect(enterPlate.hitTestable(), findsOneWidget);

          if (status == QrCameraStatus.running) {
            // And with the "No QR code detected" note.
            await _tapShutter(tester);
            expect(tester.takeException(), isNull);
            await tester.ensureVisible(find.text('Retry Scanning'));
            await tester.pumpAndSettle();
            expect(find.text('Retry Scanning').hitTestable(), findsOneWidget);
          }
        }
      });
    }
  });
}
