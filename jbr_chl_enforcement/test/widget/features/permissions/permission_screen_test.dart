import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/screens/login_screen.dart';
import 'package:jbr_chl_enforcement/features/permissions/presentation/screens/permission_screen.dart';
import 'package:jbr_chl_enforcement/shared/device/permissions/permission_adapter.dart';
import 'package:jbr_chl_enforcement/shared/storage/preferences_service.dart';

import '../../../helpers/fakes.dart';

Widget _app(FakePermissionAdapter adapter) {
  final router = GoRouter(
    initialLocation: RoutePaths.permissions,
    routes: [
      GoRoute(
        path: RoutePaths.permissions,
        name: RouteNames.permissions,
        builder: (context, state) => const PermissionScreen(),
      ),
      GoRoute(
        path: RoutePaths.login,
        name: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      permissionAdapterProvider.overrideWithValue(adapter),
      preferencesServiceProvider.overrideWithValue(FakePreferencesService()),
    ],
    child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
  );
}

FakePermissionAdapter _allPending() => FakePermissionAdapter(
  statuses: {
    for (final permission in AppPermission.values)
      permission: AppPermissionStatus.denied,
  },
  locationServiceEnabled: false,
);

/// Simulates leaving the app for system settings and coming back.
void _returnFromSettings(WidgetTester tester) {
  for (final state in [
    AppLifecycleState.inactive,
    AppLifecycleState.hidden,
    AppLifecycleState.paused,
    AppLifecycleState.hidden,
    AppLifecycleState.inactive,
    AppLifecycleState.resumed,
  ]) {
    tester.binding.handleAppLifecycleStateChanged(state);
  }
}

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
  _Device('Pixel 9', 412, 915, top: 24, bottom: 24),
  _Device('iPhone SE', 375, 667, top: 20),
  _Device('iPhone 15 Pro', 393, 852, top: 59, bottom: 34),
  _Device('iPhone 15 Pro Max', 430, 932, top: 59, bottom: 34),
  _Device('narrow 320x568', 320, 568, top: 20),
  _Device('iPad Pro 12.9', 1024, 1366, top: 24, bottom: 20),
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
  _Device(
    'small Android, 200% text',
    360,
    640,
    top: 24,
    bottom: 48,
    textScale: 2,
  ),
];

void main() {
  setUpAll(() async {
    final loader = FontLoader('Poppins');
    for (final weight in ['Regular', 'SemiBold', 'Bold']) {
      loader.addFont(
        rootBundle.load('assets/fonts/poppins/Poppins-$weight.ttf'),
      );
    }
    await loader.load();
  });

  testWidgets('walks through every step, then opens sign-in', (tester) async {
    final adapter = _allPending();
    await tester.pumpWidget(_app(adapter));
    await tester.pumpAndSettle();

    // Notifications: allow.
    expect(find.text('Permission'), findsOneWidget);
    expect(find.text('Allow notifications'), findsOneWidget);
    expect(
      find.text(
        'Get repeat-vehicle alerts, payment confirmations and sync updates.',
      ),
      findsOneWidget,
    );
    await tester.tap(find.text('Allow Notifications'));
    await tester.pumpAndSettle();
    expect(adapter.requested, [AppPermission.notifications]);

    // Camera: decline.
    expect(find.text('Allow camera'), findsOneWidget);
    await tester.tap(find.text('Don’t Allow'));
    await tester.pumpAndSettle();
    expect(adapter.requested, [AppPermission.notifications]);

    // Location: allow.
    expect(find.text('Allow Location'), findsNWidgets(2));
    await tester.tap(find.widgetWithText(FilledButton, 'Allow Location'));
    await tester.pumpAndSettle();
    expect(adapter.requested.last, AppPermission.location);

    // GPS disabled: single button, opens location settings.
    expect(find.text('GPS is disabled'), findsOneWidget);
    expect(find.text('Don’t Allow'), findsNothing);
    await tester.tap(find.text('Turn On Location'));
    await tester.pumpAndSettle();
    expect(adapter.locationSettingsOpened, 1);
    expect(find.text('GPS is disabled'), findsOneWidget);

    _returnFromSettings(tester);
    await tester.pumpAndSettle();

    expect(find.byType(PermissionScreen), findsNothing);
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('goes straight to sign-in when nothing is pending', (
    tester,
  ) async {
    await tester.pumpWidget(_app(FakePermissionAdapter.allGranted()));
    await tester.pumpAndSettle();

    expect(find.byType(LoginScreen), findsOneWidget);
  });

  for (final device in _devices) {
    for (final gpsStep in [false, true]) {
      final stepName = gpsStep ? 'GPS step' : 'two-button step';
      testWidgets('$stepName fits the safe area on ${device.name}', (
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

        final adapter = gpsStep
            ? FakePermissionAdapter(locationServiceEnabled: false)
            : _allPending();
        await tester.pumpWidget(_app(adapter));
        await tester.pumpAndSettle();

        expect(tester.takeException(), isNull);

        final safeArea = Rect.fromLTRB(
          device.left,
          device.top,
          device.width - device.right,
          device.height - device.bottom,
        ).inflate(0.5);
        bool inside(Rect rect) =>
            safeArea.contains(rect.topLeft) &&
            safeArea.contains(rect.bottomRight);

        final header = tester.getRect(find.text('Permission'));
        final primary = tester.getRect(find.byType(FilledButton));
        expect(inside(header), isTrue, reason: 'header $header');
        expect(inside(primary), isTrue, reason: 'primary button $primary');
        expect(primary.height, greaterThanOrEqualTo(48));

        if (!gpsStep) {
          final secondary = tester.getRect(find.byType(TextButton));
          expect(inside(secondary), isTrue, reason: 'secondary $secondary');
          expect(primary.bottom, lessThanOrEqualTo(secondary.top));
        }
      });
    }
  }
}
