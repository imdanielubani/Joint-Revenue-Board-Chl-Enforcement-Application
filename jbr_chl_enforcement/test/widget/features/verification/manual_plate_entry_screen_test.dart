import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/theme/app_colors.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/vehicle/presentation/screens/verification_result_screen.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/plate_number.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/manual_plate_entry_screen.dart';
import 'package:jbr_chl_enforcement/shared/ui/widgets/app_button.dart';

const _home = 'home page';

Future<void> _pump(
  WidgetTester tester, {
  Size size = const Size(390, 844),
  EdgeInsets safeArea = const EdgeInsets.only(top: 47, bottom: 34),
  double keyboard = 0,
  double textScale = 1,
}) async {
  final viewPadding = FakeViewPadding(
    left: safeArea.left * 3,
    top: safeArea.top * 3,
    right: safeArea.right * 3,
    bottom: safeArea.bottom * 3,
  );
  tester.view
    ..physicalSize = size * 3
    ..devicePixelRatio = 3
    ..viewPadding = viewPadding
    // The keyboard covers the bottom inset, as on a device.
    ..padding = keyboard > 0
        ? FakeViewPadding(
            left: viewPadding.left,
            top: viewPadding.top,
            right: viewPadding.right,
          )
        : viewPadding
    ..viewInsets = FakeViewPadding(bottom: keyboard * 3);
  tester.platformDispatcher.textScaleFactorTestValue = textScale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

  final router = GoRouter(
    initialLocation: RoutePaths.dashboard,
    routes: [
      GoRoute(
        path: RoutePaths.dashboard,
        name: RouteNames.dashboard,
        builder: (context, state) =>
            const Scaffold(body: Center(child: Text(_home))),
      ),
      GoRoute(
        path: RoutePaths.manualPlate,
        name: RouteNames.manualPlate,
        builder: (context, state) => const ManualPlateEntryScreen(),
      ),
      GoRoute(
        path: RoutePaths.verificationResult,
        name: RouteNames.verificationResult,
        builder: (context, state) =>
            VerificationResultScreen(plate: state.extra as PlateNumber?),
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    MaterialApp.router(theme: AppTheme.light, routerConfig: router),
  );
  await tester.pumpAndSettle();
  unawaited(router.push(RoutePaths.manualPlate));
  await tester.pumpAndSettle();
}

Finder get _field => find.byType(TextField);

/// The grey dashes of the plate guide.
Finder get _dashes => find.byWidgetPredicate(
  (widget) =>
      widget is Container &&
      widget.decoration is BoxDecoration &&
      (widget.decoration! as BoxDecoration).color == AppColors.plateGuide,
);

String _text(WidgetTester tester) =>
    tester.widget<TextField>(_field).controller!.text;

VoidCallback? _verifyAction(WidgetTester tester) =>
    tester.widget<AppButton>(find.byType(AppButton)).onPressed;

Future<void> _type(WidgetTester tester, String text) async {
  await tester.enterText(_field, text);
  await tester.pump();
}

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

  testWidgets('shows the design content, empty and disabled', (tester) async {
    await _pump(tester);

    expect(find.text('Manual plate entry'), findsOneWidget);
    expect(find.text('Enter vehicle plate'), findsOneWidget);
    expect(
      find.text('Spaces, hyphens and lowercase are corrected\nautomatically.'),
      findsOneWidget,
    );
    expect(find.text('Vehicle plate'), findsOneWidget);
    expect(_text(tester), isEmpty);
    expect(find.text('Verify Plate'), findsOneWidget);
    expect(_verifyAction(tester), isNull);
    // Not focused on open: the keyboard waits for the officer.
    expect(tester.testTextInput.isVisible, isFalse);
  });

  testWidgets('screen readers hear the label with the field', (tester) async {
    await _pump(tester);
    await _type(tester, 'abc123aa');

    final node = tester.getSemantics(find.byType(EditableText));
    expect(node.label, 'Vehicle plate');
    expect(node.value, 'ABC 123 AA');
  });

  testWidgets('dashes show the standard plate slots still to type', (
    tester,
  ) async {
    await _pump(tester);
    expect(_dashes, findsNWidgets(8));

    for (final (typed, left) in [
      ('ab', 6),
      ('abc12', 3),
      ('abc123a', 1),
      ('abc123aa', 0),
    ]) {
      await _type(tester, typed);
      expect(_dashes, findsNWidgets(left), reason: typed);
    }

    // Older and special plates are accepted without a guide.
    await _type(tester, 'la123abc');
    expect(_text(tester), 'LA 123 ABC');
    expect(_dashes, findsNothing);
    expect(_verifyAction(tester), isNotNull);
  });

  testWidgets('the first dash starts just after the typed text', (
    tester,
  ) async {
    await _pump(tester);
    await _type(tester, 'abc12');

    final editable = tester
        .state<EditableTextState>(find.byType(EditableText))
        .renderEditable;
    final caret = editable.localToGlobal(
      editable.getLocalRectForCaret(const TextPosition(offset: 6)).centerLeft,
    );
    final firstDash = tester.getRect(_dashes.first);
    expect(firstDash.left, greaterThan(caret.dx));
    expect(firstDash.left - caret.dx, lessThan(10));
    // Level with the text.
    expect(firstDash.center.dy, moreOrLessEquals(caret.dy, epsilon: 4));
  });

  testWidgets('screen readers do not hear the dashes', (tester) async {
    await _pump(tester);
    await _type(tester, 'ab');

    final node = tester.getSemantics(find.byType(EditableText));
    expect(node.label, 'Vehicle plate');
    expect(node.value, 'AB');
  });

  testWidgets('formats the plate and enables Verify Plate', (tester) async {
    await _pump(tester);

    await _type(tester, 'ab');
    expect(_text(tester), 'AB');
    expect(_verifyAction(tester), isNull);

    await _type(tester, 'abc-123 aa');
    expect(_text(tester), 'ABC 123 AA');
    expect(_verifyAction(tester), isNotNull);
  });

  testWidgets('Verify Plate opens the result for the plate', (tester) async {
    await _pump(tester);
    await _type(tester, 'lnd-482-xk');

    await tester.tap(find.text('Verify Plate'));
    await tester.pumpAndSettle();

    final result = tester.widget<VerificationResultScreen>(
      find.byType(VerificationResultScreen),
    );
    expect(result.plate, PlateNumber.tryParse('LND482XK'));
    expect(find.text('LND 482 XK'), findsOneWidget);
    // The keyboard was closed before leaving.
    expect(tester.testTextInput.isVisible, isFalse);

    // Back returns with the plate still there to correct.
    await tester.tap(find.bySemanticsLabel('Back'));
    await tester.pumpAndSettle();
    expect(_text(tester), 'LND 482 XK');
  });

  testWidgets('the keyboard Done key verifies a complete plate', (
    tester,
  ) async {
    await _pump(tester);
    await _type(tester, 'kja719fg');

    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();
    expect(find.byType(VerificationResultScreen), findsOneWidget);
  });

  testWidgets('the Done key does nothing while the plate is too short', (
    tester,
  ) async {
    await _pump(tester);
    await _type(tester, 'ab');

    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();
    expect(find.byType(VerificationResultScreen), findsNothing);
    expect(find.byType(ManualPlateEntryScreen), findsOneWidget);
  });

  testWidgets('back returns to the previous page', (tester) async {
    await _pump(tester);

    await tester.tap(find.bySemanticsLabel('Back'));
    await tester.pumpAndSettle();
    expect(find.text(_home), findsOneWidget);
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
      // A keyboard covers at most half the screen (e.g. 195 px on an
      // iPhone in landscape).
      for (final keyboard in [0.0, (size.height / 2).clamp(0.0, 300.0)]) {
        final state = keyboard > 0 ? 'keyboard open' : 'keyboard closed';
        testWidgets('$name, $state', (tester) async {
          await _pump(
            tester,
            size: size,
            safeArea: safeArea,
            keyboard: keyboard,
            textScale: textScale,
          );
          await _type(tester, 'abcde12345');
          expect(tester.takeException(), isNull);

          final floor = keyboard > 0
              ? size.height - keyboard
              : size.height - safeArea.bottom;
          // Space under the 73 px header.
          final bodyHeight = floor - safeArea.top - 73;
          final buttonFinder = find.byType(AppButton);
          expect(find.text('Manual plate entry'), findsOneWidget);

          if (bodyHeight >= 160) {
            // Pinned 10 px above the keyboard or the bottom inset, with the
            // field scrollable into view above it.
            final button = tester.getRect(buttonFinder);
            expect(button.bottom, moreOrLessEquals(floor - 10));
            expect(button.width, lessThanOrEqualTo(560));
            await tester.ensureVisible(_field);
            await tester.pumpAndSettle();
            expect(tester.getRect(_field).bottom, lessThan(button.top));
          } else {
            // Too short to pin: the button scrolls with the form and can be
            // brought fully above the keyboard.
            await tester.scrollUntilVisible(
              buttonFinder,
              50,
              // The page list, not the field's own horizontal scroller.
              scrollable: find.byWidgetPredicate(
                (widget) =>
                    widget is Scrollable &&
                    widget.axisDirection == AxisDirection.down,
              ),
            );
            await tester.ensureVisible(buttonFinder);
            await tester.pumpAndSettle();
            expect(
              tester.getRect(buttonFinder).bottom,
              lessThanOrEqualTo(floor),
            );
          }
          expect(tester.takeException(), isNull);
        });
      }
    }
  });
}
