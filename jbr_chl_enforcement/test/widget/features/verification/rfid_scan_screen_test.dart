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
import 'package:jbr_chl_enforcement/features/vehicle/domain/entities/verification_result.dart';
import 'package:jbr_chl_enforcement/features/verification/data/repositories/verification_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/haulage_tag.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/plate_number.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/unresolved_verification.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/verification_request.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/repositories/verification_repository.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/rfid_scan_screen.dart';
import 'package:jbr_chl_enforcement/shared/device/rfid/rfid_reader_adapter.dart';

import '../../../helpers/fakes.dart';
import '../../../helpers/verification_samples.dart';

final _now = DateTime(2026, 10, 14, 9, 30);

Widget _page(String label) => Scaffold(body: Center(child: Text(label)));

/// A reader whose every detection and read waits to be answered.
class _FakeReader implements RfidReader {
  final List<Completer<bool>> detections = [];
  final List<Completer<String>> reads = [];

  @override
  Future<bool> detect() {
    final detection = Completer<bool>();
    detections.add(detection);
    return detection.future;
  }

  @override
  Future<String> readTag() {
    final read = Completer<String>();
    reads.add(read);
    return read.future;
  }

  void answer({required bool connected}) => detections.last.complete(connected);

  void read(String reference) => reads.last.complete(reference);

  void lose() => reads.last.completeError(const RfidReaderLost());
}

class _Harness {
  _Harness(this.reader, this.verifications, this.container);

  final _FakeReader reader;
  final FakeVerificationRepository verifications;
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

  final reader = _FakeReader();
  final verifications = FakeVerificationRepository();
  final container = ProviderContainer(
    overrides: [
      rfidReaderProvider.overrideWithValue(reader),
      verificationRepositoryProvider.overrideWithValue(verifications),
      unreadNotificationCountProvider.overrideWithValue(0),
      clockProvider.overrideWithValue(() => _now),
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
      GoRoute(
        path: RoutePaths.verificationResult,
        name: RouteNames.verificationResult,
        builder: (context, state) => _page(switch (state.extra) {
          final VerificationResult result =>
            'result for ${result.plate.display}',
          VehicleNotFound(:final checkedAt) => 'not found at $checkedAt',
          VerificationUnavailable() => 'unavailable',
          _ => 'no result',
        }),
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
  return _Harness(reader, verifications, container);
}

/// Long enough for a page transition; the turning ring never settles.
Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 200));
  }
}

Finder _reader(String status) => find.bySemanticsLabel('RFID reader, $status');

Finder _button(String label) => find.text(label).hitTestable();

/// Detects the reader, connected.
Future<void> _connect(WidgetTester tester, _Harness harness) async {
  await tester.tap(find.text('Detect Reader'));
  await tester.pump();
  harness.reader.answer(connected: true);
  await _settle(tester);
}

/// Connects, then reads a tag.
Future<void> _readTag(WidgetTester tester, _Harness harness) async {
  await _connect(tester, harness);
  await tester.tap(find.text('Start Scanning'));
  await tester.pump();
  harness.reader.read('E2000017221101441890ABC1');
  await _settle(tester);
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
    expect(harness.reader.detections, isEmpty);
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

    harness.reader.answer(connected: true);
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
    harness.reader.answer(connected: false);
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
    expect(harness.reader.detections, hasLength(2));
    expect(_reader('Detecting'), findsOneWidget);
    harness.reader.answer(connected: true);
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
    harness.reader.answer(connected: true);
    await tester.pumpAndSettle();
    expect(find.text('Detect RFID reader'), findsOneWidget);
    expect(harness.connected, isFalse);
  });

  group('reading a haulage tag', () {
    testWidgets('scanning, then the tag detected', (tester) async {
      final harness = await _pump(tester);
      await _connect(tester, harness);

      await tester.tap(find.text('Start Scanning'));
      await tester.pump();
      expect(find.text('Scanning for haulage tag'), findsOneWidget);
      expect(
        find.text(
          'Hold the reader near the physical E-Tag. Keep other vehicle tags '
          'outside the reading area.',
        ),
        findsOneWidget,
      );
      expect(_reader('Connected'), findsOneWidget);
      expect(_button('Stop'), findsOneWidget);
      expect(_button('Choose Another Method'), findsOneWidget);

      harness.reader.read('E2000017221101441890ABC1');
      await _settle(tester);
      expect(find.text('Haulage tag detected'), findsOneWidget);
      expect(
        find.text(
          'A tag was detected. Verify it to resolve the vehicle, validate the '
          'E-Tag and check its CHL trip.',
        ),
        findsOneWidget,
      );
      expect(
        find.text(
          'A detected tag is not yet a verified vehicle. Raw tag references '
          'are hidden.',
        ),
        findsOneWidget,
      );
      // The raw reference is never shown.
      expect(find.textContaining('E2000017'), findsNothing);
      expect(_button('Verify Detected Tag'), findsOneWidget);
      expect(_button('Choose Another Method'), findsOneWidget);
    });

    testWidgets('Stop while scanning goes back to the reader', (tester) async {
      final harness = await _pump(tester);
      await _connect(tester, harness);
      await tester.tap(find.text('Start Scanning'));
      await tester.pump();

      await tester.tap(find.text('Stop'));
      await tester.pump();
      expect(find.text('Reader detected'), findsOneWidget);

      harness.reader.read('E2000017221101441890ABC1');
      await tester.pumpAndSettle();
      expect(find.text('Reader detected'), findsOneWidget);
    });

    testWidgets('a reader lost while scanning: communication unavailable', (
      tester,
    ) async {
      final harness = await _pump(tester);
      await _connect(tester, harness);
      await tester.tap(find.text('Start Scanning'));
      await tester.pump();

      harness.reader.lose();
      await _settle(tester);
      expect(find.text('Reader communication unavailable'), findsOneWidget);
      expect(
        find.text(
          'The reader could not complete the scan. Reconnect and retry, or '
          'verify by plate. No tag or trip finding has been made.',
        ),
        findsOneWidget,
      );
      expect(_reader('Communication error'), findsOneWidget);
      expect(_button('Detect Reader Again'), findsOneWidget);
      expect(_button('Enter Plate Instead'), findsOneWidget);
      expect(_button('Choose Another Method'), findsOneWidget);
      expect(harness.connected, isFalse);

      await tester.tap(find.text('Detect Reader Again'));
      await tester.pump();
      expect(_reader('Detecting'), findsOneWidget);
      harness.reader.answer(connected: true);
      await _settle(tester);
      expect(find.text('Reader detected'), findsOneWidget);
    });

    testWidgets('a tag that is not JRB’s is not verified', (tester) async {
      final harness = await _pump(tester);
      await _connect(tester, harness);
      await tester.tap(find.text('Start Scanning'));
      await tester.pump();

      harness.reader.read('3034257BF7194E4000000001');
      await _settle(tester);
      expect(find.text('Tag Not Part of JRB CHL Architecture'), findsOneWidget);
      expect(
        find.text(
          'This local confirmed response identifies an unknown tag. Vehicle '
          'identity and CHL trip status remain unconfirmed.',
        ),
        findsOneWidget,
      );
      expect(_reader('Connected'), findsOneWidget);
      expect(_button('Scan Another Tag'), findsOneWidget);
      expect(_button('Enter Plate Instead'), findsOneWidget);
      expect(_button('Choose Another Method'), findsOneWidget);
      // Nothing is sent to CHL, and the raw reference stays hidden.
      expect(harness.verifications.requests, isEmpty);
      expect(find.textContaining('3034257B'), findsNothing);

      await tester.tap(find.text('Scan Another Tag'));
      await tester.pump();
      expect(find.text('Scanning for haulage tag'), findsOneWidget);
      harness.reader.read('E2000017221101441890ABC1');
      await _settle(tester);
      expect(_button('Verify Detected Tag'), findsOneWidget);
    });
  });

  group('verifying the tag', () {
    testWidgets('verifying, then the verification result', (tester) async {
      final harness = await _pump(tester);
      await _readTag(tester, harness);

      await tester.tap(find.text('Verify Detected Tag'));
      await tester.pump();
      expect(find.text('Haulage tag detected'), findsOneWidget);
      expect(
        find.text(
          'Resolving vehicle identity, E-Tag validation and CHL trip status '
          'through the shared verification response.',
        ),
        findsOneWidget,
      );
      expect(_reader('Connected'), findsOneWidget);
      expect(_button('Stop'), findsOneWidget);
      expect(harness.verifications.requests, [
        const TagVerification(HaulageTag('E2000017221101441890ABC1')),
      ]);

      harness.verifications.emit(VehicleIdentified(_abc));
      await tester.pump();
      harness.verifications.emit(
        VerificationCompleted(sampleActiveResult(_now)),
      );
      await _settle(tester);
      expect(find.text('result for ABC 123 AA'), findsOneWidget);
      expect(find.byType(RfidScanScreen), findsNothing);
    });

    testWidgets('no such vehicle opens Vehicle Not Found', (tester) async {
      final harness = await _pump(tester);
      await _readTag(tester, harness);
      await tester.tap(find.text('Verify Detected Tag'));
      await tester.pump();

      harness.verifications.emit(const NoVehicleFound());
      await _settle(tester);
      expect(find.text('not found at $_now'), findsOneWidget);
    });

    testWidgets('CHL failing opens Verification Unavailable', (tester) async {
      final harness = await _pump(tester);
      await _readTag(tester, harness);
      await tester.tap(find.text('Verify Detected Tag'));
      await tester.pump();

      harness.verifications.fail(
        const VerificationFailure('CHL is not responding.'),
      );
      await _settle(tester);
      expect(find.text('unavailable'), findsOneWidget);
    });

    testWidgets('Stop while verifying keeps the tag', (tester) async {
      final harness = await _pump(tester);
      await _readTag(tester, harness);
      await tester.tap(find.text('Verify Detected Tag'));
      await tester.pump();

      await tester.tap(find.text('Stop'));
      await tester.pump();
      expect(harness.verifications.cancelled, 1);
      expect(_button('Verify Detected Tag'), findsOneWidget);

      await tester.tap(find.text('Verify Detected Tag'));
      await tester.pump();
      expect(harness.verifications.requests, hasLength(2));
    });

    testWidgets('leaving while verifying stops it', (tester) async {
      final harness = await _pump(tester);
      await _readTag(tester, harness);
      await tester.tap(find.text('Verify Detected Tag'));
      await tester.pump();

      await tester.tap(find.text('Choose Another Method'));
      await _settle(tester);
      expect(find.text('methods page'), findsOneWidget);
      expect(harness.verifications.cancelled, 1);
    });
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
    harness.reader.answer(connected: true);
    await tester.pumpAndSettle();
    expect(find.text('methods page'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  group('demo reader', () {
    test('the first detection finds nothing, later ones the reader', () async {
      final demo = DemoRfidReader(delay: Duration.zero);
      expect(await demo.detect(), isFalse);
      expect(await demo.detect(), isTrue);
      expect(await demo.detect(), isTrue);
    });

    test('reads a foreign tag, then loses the reader, then ABC 123 AA’s '
        'tag', () async {
      final demo = DemoRfidReader(delay: Duration.zero);
      expect(await demo.readTag(), DemoRfidReader.foreignTag);
      await expectLater(demo.readTag(), throwsA(isA<RfidReaderLost>()));
      expect(await demo.readTag(), DemoRfidReader.tag);
      expect(await demo.readTag(), DemoRfidReader.tag);
    });

    test('without the reader SDK, no reader is found', () async {
      const device = DeviceRfidReader();
      expect(await device.detect(), isFalse);
      await expectLater(device.readTag(), throwsA(isA<RfidReaderLost>()));
    });

    test('a read tag never shows its reference', () {
      expect(const HaulageTag('E2000017').toString(), 'HaulageTag');
    });

    test('JRB tags', () {
      for (final reference in [
        DemoRfidReader.tag,
        'e2000017221101441890abc1',
        ' E2000017221101441890ABC1 ',
      ]) {
        expect(HaulageTag(reference).isJrb, isTrue, reason: reference);
      }
      for (final reference in [
        DemoRfidReader.foreignTag,
        'E2000017',
        'E2000017221101441890ABCG',
        '',
      ]) {
        expect(HaulageTag(reference).isJrb, isFalse, reason: reference);
      }
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

        Future<void> tap(String label) async {
          await tester.ensureVisible(find.text(label));
          await tester.pumpAndSettle();
          await tester.tap(find.text(label));
          await tester.pump();
          expect(tester.takeException(), isNull);
        }

        Future<void> visible(String label) async {
          await tester.ensureVisible(find.text(label));
          await tester.pump(const Duration(milliseconds: 300));
          expect(tester.takeException(), isNull);
          expect(_button(label), findsOneWidget);
        }

        await tap('Detect Reader');
        harness.reader.answer(connected: false);
        await _settle(tester);
        await visible('Choose Another Method');

        await tap('Detect Reader Again');
        harness.reader.answer(connected: true);
        await _settle(tester);
        await visible('Start Scanning');

        await tap('Start Scanning');
        await visible('Stop');
        harness.reader.read('E2000017221101441890ABC1');
        await _settle(tester);
        await visible('Verify Detected Tag');

        await tap('Verify Detected Tag');
        await visible('Stop');
      });

      testWidgets('the scan errors on a $name', (tester) async {
        final harness = await _pump(tester, size: size, textScale: scale);
        await tester.ensureVisible(find.text('Detect Reader'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Detect Reader'));
        await tester.pump();
        harness.reader.answer(connected: true);
        await _settle(tester);

        await tester.ensureVisible(find.text('Start Scanning'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Start Scanning'));
        await tester.pump();
        harness.reader.read('3034257BF7194E4000000001');
        await _settle(tester);
        expect(tester.takeException(), isNull);
        await tester.ensureVisible(find.text('Choose Another Method'));
        await tester.pump(const Duration(milliseconds: 300));
        expect(_button('Choose Another Method'), findsOneWidget);

        await tester.ensureVisible(find.text('Scan Another Tag'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Scan Another Tag'));
        await tester.pump();
        harness.reader.lose();
        await _settle(tester);
        expect(tester.takeException(), isNull);
        await tester.ensureVisible(find.text('Choose Another Method'));
        await tester.pump(const Duration(milliseconds: 300));
        expect(_button('Choose Another Method'), findsOneWidget);
      });
    }
  });
}

final _abc = PlateNumber.tryParse('ABC123AA')!;
