import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/shared/device/location/location_adapter.dart';
import 'package:jbr_chl_enforcement/shared/device/permissions/permission_adapter.dart';

import '../../helpers/fakes.dart';

void main() {
  Future<ProviderContainer> start(
    WidgetTester tester,
    FakePermissionAdapter permissions,
  ) async {
    final container = ProviderContainer(
      overrides: [permissionAdapterProvider.overrideWithValue(permissions)],
    );
    addTearDown(container.dispose);
    final subscription = container.listen(gpsStatusProvider, (_, _) {});
    addTearDown(subscription.close);
    await tester.pumpAndSettle();
    return container;
  }

  /// Background and back, through every state a phone passes.
  void returnToApp(WidgetTester tester) {
    tester.binding
      ..handleAppLifecycleStateChanged(AppLifecycleState.inactive)
      ..handleAppLifecycleStateChanged(AppLifecycleState.hidden)
      ..handleAppLifecycleStateChanged(AppLifecycleState.paused)
      ..handleAppLifecycleStateChanged(AppLifecycleState.hidden)
      ..handleAppLifecycleStateChanged(AppLifecycleState.inactive)
      ..handleAppLifecycleStateChanged(AppLifecycleState.resumed);
  }

  testWidgets('online when the service is on and location is allowed', (
    tester,
  ) async {
    final container = await start(tester, FakePermissionAdapter.allGranted());

    expect(container.read(gpsStatusProvider).value, isTrue);
  });

  testWidgets('offline without location permission', (tester) async {
    final container = await start(
      tester,
      FakePermissionAdapter(
        statuses: {AppPermission.location: AppPermissionStatus.denied},
      ),
    );

    expect(container.read(gpsStatusProvider).value, isFalse);
  });

  testWidgets('offline when the location service is off', (tester) async {
    final container = await start(
      tester,
      FakePermissionAdapter(locationServiceEnabled: false),
    );

    expect(container.read(gpsStatusProvider).value, isFalse);
  });

  testWidgets('goes online after location is allowed in the phone settings', (
    tester,
  ) async {
    final permissions = FakePermissionAdapter(
      statuses: {AppPermission.location: AppPermissionStatus.denied},
    );
    final container = await start(tester, permissions);
    expect(container.read(gpsStatusProvider).value, isFalse);

    // Allowed in the phone's settings while the app was in the background.
    permissions.statuses[AppPermission.location] = AppPermissionStatus.granted;
    returnToApp(tester);
    await tester.pumpAndSettle();

    expect(container.read(gpsStatusProvider).value, isTrue);
  });

  testWidgets('goes offline after location is turned off and back', (
    tester,
  ) async {
    final permissions = FakePermissionAdapter.allGranted();
    final container = await start(tester, permissions);
    expect(container.read(gpsStatusProvider).value, isTrue);

    permissions.locationServiceEnabled = false;
    returnToApp(tester);
    await tester.pumpAndSettle();

    expect(container.read(gpsStatusProvider).value, isFalse);
  });

  testWidgets('keeps the last answer while checking again', (tester) async {
    final container = await start(tester, FakePermissionAdapter.allGranted());

    returnToApp(tester);
    // Before the new check finishes, the tile does not flicker to empty.
    expect(container.read(gpsStatusProvider).value, isTrue);
    await tester.pumpAndSettle();
  });
}
