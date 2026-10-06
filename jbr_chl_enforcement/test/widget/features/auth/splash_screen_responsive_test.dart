import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/app/app_providers.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/screens/splash_screen.dart';
import 'package:jbr_chl_enforcement/shared/device/permissions/permission_adapter.dart';
import 'package:jbr_chl_enforcement/shared/storage/preferences_service.dart';

import '../../../helpers/fakes.dart';

/// A device screen in logical pixels, with its system bar insets.
class _Device {
  const _Device(
    this.name,
    this.width,
    this.height, {
    this.top = 0,
    this.bottom = 0,
    this.left = 0,
    this.right = 0,
    this.textScale = 1,
  });

  final String name;
  final double width;
  final double height;
  final double top;
  final double bottom;
  final double left;
  final double right;
  final double textScale;
}

const _devices = [
  _Device('small Android, 3-button nav', 360, 640, top: 24, bottom: 48),
  _Device('Android 360x800', 360, 800, top: 24, bottom: 48),
  _Device('Pixel 9', 412, 915, top: 24, bottom: 24),
  _Device('iPhone SE', 375, 667, top: 20),
  _Device('iPhone 13 mini', 375, 812, top: 50, bottom: 34),
  _Device('iPhone 15 Pro', 393, 852, top: 59, bottom: 34),
  _Device('iPhone 15 Pro Max', 430, 932, top: 59, bottom: 34),
  _Device('narrow 320x568', 320, 568, top: 20),
  _Device('iPad mini', 744, 1133, top: 24, bottom: 20),
  _Device('iPad Pro 12.9', 1024, 1366, top: 24, bottom: 20),
  _Device('Android tablet', 800, 1280, top: 24, bottom: 48),
  _Device('Galaxy Fold inner', 673, 841, top: 24, bottom: 24),
  _Device('iPhone landscape', 852, 393, bottom: 21, left: 59, right: 59),
  _Device('Android landscape', 800, 360, top: 24, right: 48),
  _Device(
    'iPhone 15 Pro, 200% text',
    393,
    852,
    top: 59,
    bottom: 34,
    textScale: 2,
  ),
];

void main() {
  setUpAll(() async {
    final loader = FontLoader('Poppins');
    for (final weight in ['Medium', 'SemiBold']) {
      loader.addFont(
        rootBundle.load('assets/fonts/poppins/Poppins-$weight.ttf'),
      );
    }
    await loader.load();
  });

  for (final device in _devices) {
    testWidgets('launch screen fits the safe area on ${device.name}', (
      tester,
    ) async {
      const dpr = 3.0;
      tester.view
        ..physicalSize = Size(device.width * dpr, device.height * dpr)
        ..devicePixelRatio = dpr
        ..padding = FakeViewPadding(
          top: device.top * dpr,
          bottom: device.bottom * dpr,
          left: device.left * dpr,
          right: device.right * dpr,
        );
      tester.platformDispatcher.textScaleFactorTestValue = device.textScale;
      addTearDown(() {
        tester.view.reset();
        tester.platformDispatcher.clearTextScaleFactorTestValue();
      });

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            appVersionProvider.overrideWith((ref) async => '1.0.0'),
            permissionAdapterProvider.overrideWithValue(
              FakePermissionAdapter.allGranted(),
            ),
            preferencesServiceProvider.overrideWithValue(
              FakePreferencesService(),
            ),
          ],
          child: MaterialApp(theme: AppTheme.light, home: const SplashScreen()),
        ),
      );
      await tester.pump();

      // No overflow or layout errors.
      expect(tester.takeException(), isNull);

      final safeArea = Rect.fromLTRB(
        device.left,
        device.top,
        device.width - device.right,
        device.height - device.bottom,
      ).inflate(0.5);

      final tagline = tester.getRect(
        find.text('SAFE ROADS\nFAIR REVENUE\nA STRONGER NIGERIA'),
      );
      final slogan = tester.getRect(
        find.text('Compliant Roads\nProsperous Nigeria'),
      );
      final pillars = tester.getRect(
        find.text('VERIFY  |  ENFORCE  |  COMPLY  |  BUILD'),
      );
      final status = tester.getRect(find.text('Checking secure session...'));
      final footer = tester.getRect(find.textContaining('Powered by'));

      for (final rect in [tagline, slogan, pillars, status, footer]) {
        expect(
          safeArea.contains(rect.topLeft) &&
              safeArea.contains(rect.bottomRight),
          isTrue,
          reason: '$rect is outside the safe area $safeArea',
        );
      }

      // Blocks keep their order without overlapping.
      expect(tagline.bottom, lessThanOrEqualTo(slogan.top));
      expect(pillars.bottom, lessThanOrEqualTo(status.top));
      expect(status.bottom, lessThanOrEqualTo(footer.top));

      // Let the stages finish, then remove the screen before it navigates
      // (this test has no router), so no timers are left pending.
      await tester.pump(const Duration(seconds: 2));
      await tester.pumpWidget(const SizedBox());
    });
  }
}
