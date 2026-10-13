import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/notifications/presentation/providers/notifications_controller.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/rfid_scan_screen.dart';
import 'package:jbr_chl_enforcement/shared/device/rfid/rfid_reader_adapter.dart';

Widget _page(String label) => Scaffold(body: Center(child: Text(label)));

/// A reader whose every detection waits for [answer].
class _FakeDetector implements RfidReaderDetector {
  final List<Completer<bool>> detections = [];

  @override
  Future<bool> detect() {
    final detection = Completer<bool>();
    detections.add(detection);
    return detection.future;
  }

  void answer({required bool connected}) => detections.last.complete(connected);
}

class _Harness {
  _Harness(this.detector, this.container);

  final _FakeDetector detector;
  final ProviderContainer container;

  bool get connected => container.read(rfidReaderConnectedProvider);
}

Future<_Harness> _pump(
  WidgetTester tester, {
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

  final detector = _FakeDetector();
  final container = ProviderContainer(
    overrides: [
      rfidReaderDetectorProvider.overrideWithValue(detector),
      unreadNotificationCountProvider.overrideWithValue(0),
    ],
  );
  addTearDown(container.dispose);
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
        path: RoutePaths.rfidScan,
        name: RouteNames.rfidScan,
        builder: (context, state) => const RfidScanScreen(),
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
  unawaited(router.push(RoutePaths.rfidScan));
  await tester.pumpAndSettle();
  return _Harness(detector, container);
}

/// Long enough for a page transition; the detecting ring never settles.
Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 200));
  }
}

Finder _reader(String status) => find.bySemanticsLabel('RFID reader, $status');

Finder _button(String label) => find.text(label).hitTestable();

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

  testWidgets('before detecting, as designed', (tester) async {
    final harness = await _pump(tester);

    expect(find.text('RFID verification'), findsOneWidget);
    expect(find.bySemanticsLabel('Notifications'), findsOneWidget);
    expect(find.text('Detect RFID reader'), findsOneWidget);
    expect(
      find.text('Connect the reader to your device, then tap Detect reader.'),
      findsOneWidget,
    );
    expect(_reader('Connection not checked'), findsOneWidget);
    expect(
      find.text('We’ll detect the reader already connected to this device.'),
      findsOneWidget,
    );
    expect(_button('Detect Reader'), findsOneWidget);
    expect(_button('Enter Plate Instead'), findsOneWidget);
    expect(_button('Choose Another Method'), findsOneWidget);
    // Nothing is looked for until the officer asks.
    expect(harness.detector.detections, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('detecting, then detected', (tester) async {
    final harness = await _pump(tester);

    await tester.tap(find.text('Detect Reader'));
    await tester.pump();
    expect(find.text('Detecting your reader'), findsOneWidget);
    expect(
      find.text('Checking the RFID reader already connected to your device.'),
      findsOneWidget,
    );
    expect(_reader('Detecting'), findsOneWidget);
    expect(_button('Stop'), findsOneWidget);
    expect(_button('Choose Another Method'), findsOneWidget);
    expect(find.text('Enter Plate Instead'), findsNothing);

    harness.detector.answer(connected: true);
    await _settle(tester);
    expect(find.text('Reader detected'), findsOneWidget);
    expect(
      find.text(
        'The reader is connected. Select Start scanning to read a haulage '
        'tag.',
      ),
      findsOneWidget,
    );
    expect(_reader('Connected'), findsOneWidget);
    expect(_button('Start Scanning'), findsOneWidget);
    expect(_button('Choose Another Method'), findsOneWidget);
    // The dashboard now shows the reader connected.
    expect(harness.connected, isTrue);
  });

  testWidgets('no reader: disconnected, and Detect Reader Again', (
    tester,
  ) async {
    final harness = await _pump(tester);

    await tester.tap(find.text('Detect Reader'));
    await tester.pump();
    harness.detector.answer(connected: false);
    await _settle(tester);

    expect(find.text('RFID Reader Disconnected'), findsOneWidget);
    expect(
      find.text(
        'Check the cable or approved reader connection, then detect the '
        'reader again. You can continue by plate number.',
      ),
      findsOneWidget,
    );
    expect(_reader('Disconnected'), findsOneWidget);
    expect(
      find.text(
        'No scan failure is treated as a missing tag, invalid tag or No '
        'Active Trip.',
      ),
      findsOneWidget,
    );
    expect(_button('Detect Reader Again'), findsOneWidget);
    expect(_button('Enter Plate Instead'), findsOneWidget);
    expect(_button('Choose Another Method'), findsOneWidget);
    expect(harness.connected, isFalse);

    await tester.tap(find.text('Detect Reader Again'));
    await tester.pump();
    expect(harness.detector.detections, hasLength(2));
    expect(_reader('Detecting'), findsOneWidget);
    harness.detector.answer(connected: true);
    await _settle(tester);
    expect(_reader('Connected'), findsOneWidget);
  });

  testWidgets('Stop abandons the detection', (tester) async {
    final harness = await _pump(tester);

    await tester.tap(find.text('Detect Reader'));
    await tester.pump();
    await tester.tap(find.text('Stop'));
    await tester.pump();
    expect(find.text('Detect RFID reader'), findsOneWidget);

    // The stopped detection's answer changes nothing.
    harness.detector.answer(connected: true);
    await tester.pumpAndSettle();
    expect(find.text('Detect RFID reader'), findsOneWidget);
    expect(harness.connected, isFalse);
  });

  testWidgets('Start Scanning says reading is not available yet', (
    tester,
  ) async {
    final harness = await _pump(tester);
    await tester.tap(find.text('Detect Reader'));
    await tester.pump();
    harness.detector.answer(connected: true);
    await _settle(tester);

    await tester.tap(find.text('Start Scanning'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(
      find.text('Reading haulage tags is not available yet.'),
      findsOneWidget,
    );
    await tester.pump(const Duration(seconds: 4));
    await tester.pumpAndSettle();
  });

  testWidgets('Enter Plate Instead opens plate entry', (tester) async {
    await _pump(tester);

    await tester.tap(find.text('Enter Plate Instead'));
    await tester.pumpAndSettle();
    expect(find.text('plate page'), findsOneWidget);
  });

  testWidgets('Choose Another Method returns to the methods', (tester) async {
    await _pump(tester);

    await tester.tap(find.text('Choose Another Method'));
    await tester.pumpAndSettle();
    expect(find.text('methods page'), findsOneWidget);
  });

  testWidgets('leaving while detecting is safe', (tester) async {
    final harness = await _pump(tester);
    await tester.tap(find.text('Detect Reader'));
    await tester.pump();

    await tester.tap(find.text('Choose Another Method'));
    await _settle(tester);
    harness.detector.answer(connected: true);
    await tester.pumpAndSettle();
    expect(find.text('methods page'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  group('demo reader', () {
    test('the first detection finds nothing, later ones the reader', () async {
      final demo = DemoRfidReaderDetector(delay: Duration.zero);
      expect(await demo.detect(), isFalse);
      expect(await demo.detect(), isTrue);
      expect(await demo.detect(), isTrue);
    });

    test('without the reader SDK, no reader is found', () async {
      expect(await const DeviceRfidReaderDetector().detect(), isFalse);
    });
  });

  group('fits', () {
    for (final (name, size, scale) in [
      ('small phone', const Size(320, 568), 1.0),
      ('landscape', const Size(844, 390), 1.0),
      ('tablet', const Size(820, 1180), 1.0),
      ('200% text', const Size(390, 844), 2.0),
    ]) {
      testWidgets('every state on a $name', (tester) async {
        final harness = await _pump(tester, size: size, textScale: scale);
        expect(tester.takeException(), isNull);

        await tester.ensureVisible(find.text('Detect Reader'));
        await tester.tap(find.text('Detect Reader'));
        await tester.pump();
        expect(tester.takeException(), isNull);

        harness.detector.answer(connected: false);
        await _settle(tester);
        expect(tester.takeException(), isNull);
        await tester.ensureVisible(find.text('Choose Another Method'));
        await tester.pumpAndSettle();
        expect(_button('Choose Another Method'), findsOneWidget);

        await tester.ensureVisible(find.text('Detect Reader Again'));
        await tester.tap(find.text('Detect Reader Again'));
        await tester.pump();
        harness.detector.answer(connected: true);
        await _settle(tester);
        expect(tester.takeException(), isNull);
        await tester.ensureVisible(find.text('Start Scanning'));
        await tester.pumpAndSettle();
        expect(_button('Start Scanning'), findsOneWidget);
      });
    }
  });
}
