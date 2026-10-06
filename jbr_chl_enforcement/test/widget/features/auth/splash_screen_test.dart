import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/app/app.dart';
import 'package:jbr_chl_enforcement/app/app_providers.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/launch_controller.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/screens/login_screen.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/screens/splash_screen.dart';
import 'package:jbr_chl_enforcement/features/permissions/presentation/screens/permission_screen.dart';
import 'package:jbr_chl_enforcement/shared/device/permissions/permission_adapter.dart';
import 'package:jbr_chl_enforcement/shared/storage/preferences_service.dart';

import '../../../helpers/fakes.dart';

void main() {
  Future<void> pumpApp(
    WidgetTester tester, {
    FakePermissionAdapter? permissions,
  }) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appVersionProvider.overrideWith((ref) async => '1.0.0'),
          permissionAdapterProvider.overrideWithValue(
            permissions ?? FakePermissionAdapter.allGranted(),
          ),
          preferencesServiceProvider.overrideWithValue(
            FakePreferencesService(),
          ),
        ],
        child: const ChlEnforcementApp(),
      ),
    );
    await tester.pump();
  }

  Future<void> finishLaunch(WidgetTester tester) async {
    await tester.pump(LaunchController.minimumStageDuration * 2);
    await tester.pump(SplashScreen.readyHoldDuration);
    await tester.pumpAndSettle();
  }

  testWidgets('shows launch branding and the first stage', (tester) async {
    await pumpApp(tester);

    expect(find.byType(SplashScreen), findsOneWidget);
    expect(find.text('SAFE ROADS\nFAIR REVENUE\nA STRONGER NIGERIA'), findsOne);
    expect(find.text('Compliant Roads\nProsperous Nigeria'), findsOne);
    expect(find.text('VERIFY  |  ENFORCE  |  COMPLY  |  BUILD'), findsOne);
    expect(find.text('Checking secure session...'), findsOne);
    expect(find.text('Powered by Cyber1 System Network · v1.0.0'), findsOne);
    expect(tester.takeException(), isNull);

    await finishLaunch(tester);
  });

  testWidgets('steps through each stage then opens sign-in', (tester) async {
    await pumpApp(tester);

    await tester.pump(LaunchController.minimumStageDuration);
    expect(find.text('Loading offline vehicle cache…'), findsOne);

    await tester.pump(LaunchController.minimumStageDuration);
    expect(find.text('Ready...'), findsOne);
    expect(find.byType(SplashScreen), findsOneWidget);

    await tester.pump(SplashScreen.readyHoldDuration);
    await tester.pumpAndSettle();
    expect(find.byType(SplashScreen), findsNothing);
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('opens the permission screen when permissions are pending', (
    tester,
  ) async {
    await pumpApp(
      tester,
      permissions: FakePermissionAdapter(
        statuses: {AppPermission.camera: AppPermissionStatus.denied},
      ),
    );

    await finishLaunch(tester);

    expect(find.byType(PermissionScreen), findsOneWidget);
    expect(find.text('Allow camera'), findsOneWidget);
  });
}
