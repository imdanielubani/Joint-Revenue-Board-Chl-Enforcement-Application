import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/notifications/presentation/providers/notifications_controller.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/scanned_qr.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/manual_plate_entry_screen.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/ocr_capture_screen.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/qr_scan_screen.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/rfid_scan_screen.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/verification_hub_screen.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/verify_e_tag_screen.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/widgets/verification_method_tile.dart';
import 'package:jbr_chl_enforcement/shared/device/scanner/qr_scanner_adapter.dart';

import '../../../helpers/fakes.dart';

const _home = 'home page';

/// The real verification routes above a stand-in dashboard. With [push],
/// [first] is opened on top of the dashboard; otherwise it is the only page.
GoRouter _router(String first, {bool push = true}) {
  final router = GoRouter(
    initialLocation: push ? RoutePaths.dashboard : first,
    routes: [
      GoRoute(
        path: RoutePaths.dashboard,
        name: RouteNames.dashboard,
        builder: (context, state) =>
            const Scaffold(body: Center(child: Text(_home))),
      ),
      GoRoute(
        path: RoutePaths.notifications,
        name: RouteNames.notifications,
        builder: (context, state) =>
            const Scaffold(body: Center(child: Text('notifications page'))),
      ),
      GoRoute(
        path: RoutePaths.verifyTrip,
        name: RouteNames.verifyTrip,
        builder: (context, state) => const VerificationHubScreen(),
      ),
      GoRoute(
        path: RoutePaths.verifyETag,
        name: RouteNames.verifyETag,
        builder: (context, state) => const VerifyETagScreen(),
      ),
      GoRoute(
        path: RoutePaths.rfidScan,
        name: RouteNames.rfidScan,
        builder: (context, state) => const RfidScanScreen(),
      ),
      GoRoute(
        path: RoutePaths.qrScan,
        name: RouteNames.qrScan,
        builder: (context, state) => QrScanScreen(
          target: QrScanTarget.fromQuery(state.uri.queryParameters['for']),
        ),
      ),
      GoRoute(
        path: RoutePaths.manualPlate,
        name: RouteNames.manualPlate,
        builder: (context, state) => const ManualPlateEntryScreen(),
      ),
      GoRoute(
        path: RoutePaths.ocrCapture,
        name: RouteNames.ocrCapture,
        builder: (context, state) => const OcrCaptureScreen(),
      ),
    ],
  );
  return router;
}

Future<void> _pump(
  WidgetTester tester,
  String first, {
  bool push = true,
  Size size = const Size(390, 844),
  EdgeInsets safeArea = const EdgeInsets.only(top: 47, bottom: 34),
  double textScale = 1,
  int unread = 3,
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

  final router = _router(first, push: push);
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        unreadNotificationCountProvider.overrideWithValue(unread),
        qrScannerFactoryProvider.overrideWithValue(FakeQrScanner.new),
      ],
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  if (push) {
    // Opened from the dashboard, as in the app.
    unawaited(router.push(first));
    await tester.pumpAndSettle();
  }
}

List<String> _cardTitles(WidgetTester tester) => tester
    .widgetList<VerificationMethodTile>(find.byType(VerificationMethodTile))
    .map((tile) => tile.option.title)
    .toList();

void main() {
  setUpAll(() async {
    // Real font so the layout checks measure text as on a device.
    final loader = FontLoader('Poppins');
    for (final weight in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
      loader.addFont(
        rootBundle.load('assets/fonts/poppins/Poppins-$weight.ttf'),
      );
    }
    await loader.load();
  });

  group('Verify CHL Trip', () {
    testWidgets('offers the three methods', (tester) async {
      await _pump(tester, RoutePaths.verifyTrip);

      expect(find.text('Verification'), findsOneWidget);
      expect(find.text('Choose verification method'), findsOneWidget);
      expect(
        find.text('Use the method that works best in the field'),
        findsOneWidget,
      );
      expect(_cardTitles(tester), [
        'Enter plate manually',
        'Scan E-Tag QR code',
        'Haulage tag',
      ]);
      expect(
        find.bySemanticsLabel(
          'Haulage tag. Connect a reader and scan the haulage tag.',
        ),
        findsOneWidget,
      );
      expect(
        find.bySemanticsLabel(
          'Scan E-Tag QR code. Read the code on the physical JRB E-Tag.',
        ),
        findsOneWidget,
      );
      expect(
        find.bySemanticsLabel(
          'Enter plate manually. Type the vehicle registration number.',
        ),
        findsOneWidget,
      );
    });

    for (final (title, screen) in [
      ('Enter plate manually', ManualPlateEntryScreen),
      ('Scan E-Tag QR code', QrScanScreen),
      ('Haulage tag', RfidScanScreen),
    ]) {
      testWidgets('$title opens its page, and back returns', (tester) async {
        await _pump(tester, RoutePaths.verifyTrip);

        await tester.tap(find.text(title));
        await tester.pumpAndSettle();
        expect(find.byType(screen), findsOneWidget);

        await tester.tap(
          find.bySemanticsLabel(
            screen == QrScanScreen ? 'Close receipt QR scanner' : 'Back',
          ),
        );
        await tester.pumpAndSettle();
        expect(find.byType(VerificationHubScreen), findsOneWidget);
        expect(find.byType(screen), findsNothing);
      });
    }

    testWidgets('the bell shows unread notifications and opens them', (
      tester,
    ) async {
      await _pump(tester, RoutePaths.verifyTrip);

      expect(find.bySemanticsLabel('Notifications, 3 unread'), findsOneWidget);
      expect(find.text('3'), findsOneWidget);

      await tester.tap(find.bySemanticsLabel('Notifications, 3 unread'));
      await tester.pumpAndSettle();
      expect(find.text('notifications page'), findsOneWidget);
    });

    testWidgets('no unread notifications: a plain bell', (tester) async {
      await _pump(tester, RoutePaths.verifyTrip, unread: 0);

      expect(find.bySemanticsLabel('Notifications'), findsOneWidget);
      expect(find.text('0'), findsNothing);
    });

    testWidgets('back returns to the dashboard', (tester) async {
      await _pump(tester, RoutePaths.verifyTrip);

      await tester.tap(find.bySemanticsLabel('Back'));
      await tester.pumpAndSettle();
      expect(find.text(_home), findsOneWidget);
    });

    testWidgets('opened directly, back goes to the dashboard', (tester) async {
      await _pump(tester, RoutePaths.verifyTrip, push: false);

      await tester.tap(find.bySemanticsLabel('Back'));
      await tester.pumpAndSettle();
      expect(find.text(_home), findsOneWidget);
    });
  });

  group('Verify E-Tag', () {
    testWidgets('offers RFID and QR', (tester) async {
      await _pump(tester, RoutePaths.verifyETag);

      expect(find.text('Verification'), findsOneWidget);
      expect(find.text('Verify e-tag'), findsOneWidget);
      expect(
        find.text(
          'Read the physical JRB E-Tag using RFID or QR,\n'
          'then review the vehicle and CHL trip result.',
        ),
        findsOneWidget,
      );
      expect(_cardTitles(tester), ['Read RFID tag', 'Scan E-Tag QR code']);
      expect(
        find.bySemanticsLabel(
          'Scan E-Tag QR code. Read the physical JRB E-Tag.',
        ),
        findsOneWidget,
      );
    });

    for (final (title, screen) in [
      ('Read RFID tag', RfidScanScreen),
      ('Scan E-Tag QR code', QrScanScreen),
    ]) {
      testWidgets('$title opens its page', (tester) async {
        await _pump(tester, RoutePaths.verifyETag);

        await tester.tap(find.text(title));
        await tester.pumpAndSettle();
        expect(find.byType(screen), findsOneWidget);
        if (screen == QrScanScreen) {
          // The scanner is worded for an E-Tag.
          expect(find.text('Scan E-Tag QR'), findsOneWidget);
        }

        await tester.tap(
          find.bySemanticsLabel(
            screen == QrScanScreen ? 'Close E-Tag QR scanner' : 'Back',
          ),
        );
        await tester.pumpAndSettle();
        expect(find.byType(VerifyETagScreen), findsOneWidget);
      });
    }
  });

  testWidgets('"E-Tag" is never split across lines', (tester) async {
    await _pump(tester, RoutePaths.verifyTrip);

    final description = find.textContaining('Read the code on the physical');
    final paragraph = tester.renderObject<RenderParagraph>(description);
    final text = paragraph.text.toPlainText();
    double lineOf(int offset) =>
        paragraph.getOffsetForCaret(TextPosition(offset: offset), Rect.zero).dy;
    // "E" and the "T" after the hyphen sit on the same line.
    expect(lineOf(text.indexOf('E-')), lineOf(text.indexOf('Tag')));
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
      for (final page in [RoutePaths.verifyTrip, RoutePaths.verifyETag]) {
        testWidgets('$page on $name', (tester) async {
          await _pump(
            tester,
            page,
            size: size,
            safeArea: safeArea,
            textScale: textScale,
          );
          expect(tester.takeException(), isNull);

          // Every card can be scrolled fully into view above the bottom
          // system bar, and cards never exceed the tablet width cap.
          final cards = find.byType(VerificationMethodTile);
          final last = cards.last;
          await tester.drag(find.byType(ListView), const Offset(0, -3000));
          await tester.pumpAndSettle();
          final visibleBottom = size.height - safeArea.bottom;
          expect(
            tester.getBottomLeft(last).dy,
            lessThanOrEqualTo(visibleBottom),
          );
          for (final card in tester.widgetList(cards)) {
            expect(
              tester.getSize(find.byWidget(card)).width,
              lessThanOrEqualTo(560),
            );
          }
          expect(tester.takeException(), isNull);
        });
      }
    }
  });
}
