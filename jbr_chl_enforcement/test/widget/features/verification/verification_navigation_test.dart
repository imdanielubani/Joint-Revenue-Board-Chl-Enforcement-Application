import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/core/navigation/app_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/dashboard/data/repositories/dashboard_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/dashboard/presentation/screens/dashboard_screen.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/manual_plate_entry_screen.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/qr_scan_screen.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/verification_hub_screen.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/screens/verify_e_tag_screen.dart';
import 'package:jbr_chl_enforcement/shared/device/connectivity/connectivity_adapter.dart';
import 'package:jbr_chl_enforcement/shared/device/location/location_adapter.dart';

/// The app's own router, starting on the dashboard tab.
Future<void> _pumpApp(WidgetTester tester) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final container = ProviderContainer(
    overrides: [
      dashboardRepositoryProvider.overrideWithValue(
        const LocalDashboardRepository(),
      ),
      internetStatusProvider.overrideWith((ref) => Stream.value(true)),
      gpsStatusProvider.overrideWith((ref) => Stream.value(true)),
    ],
  );
  addTearDown(container.dispose);
  final router = container.read(appRouterProvider)..go(RoutePaths.dashboard);

  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _back(WidgetTester tester) async {
  await tester.tap(find.bySemanticsLabel('Back'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('dashboard → Verify CHL Trip → method → back → back', (
    tester,
  ) async {
    await _pumpApp(tester);
    expect(find.byType(DashboardScreen), findsOneWidget);

    await tester.tap(find.text('Verify CHL Trip'));
    await tester.pumpAndSettle();
    expect(find.byType(VerificationHubScreen), findsOneWidget);

    await tester.tap(find.text('Enter plate manually'));
    await tester.pumpAndSettle();
    expect(find.byType(ManualPlateEntryScreen), findsOneWidget);

    await _back(tester);
    expect(find.byType(VerificationHubScreen), findsOneWidget);

    await _back(tester);
    expect(find.byType(DashboardScreen), findsOneWidget);
  });

  testWidgets('dashboard → Verify E-Tag → QR → back → back', (tester) async {
    await _pumpApp(tester);

    await tester.tap(find.text('Verify E-Tag'));
    await tester.pumpAndSettle();
    expect(find.byType(VerifyETagScreen), findsOneWidget);

    await tester.tap(find.text('Scan E-Tag QR code'));
    await tester.pumpAndSettle();
    expect(find.byType(QrScanScreen), findsOneWidget);

    await _back(tester);
    expect(find.byType(VerifyETagScreen), findsOneWidget);

    await _back(tester);
    expect(find.byType(DashboardScreen), findsOneWidget);
  });
}
