import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/storage_keys.dart';
import '../../../../shared/device/permissions/permission_adapter.dart';
import '../../../../shared/storage/preferences_service.dart';

/// Whether device alerts (notifications) are on. Saved on the phone; on
/// unless the officer turned them off.
// TODO(notifications): honour this when push notifications are sent.
final deviceAlertsProvider =
    AsyncNotifierProvider<DeviceAlertsController, bool>(
      DeviceAlertsController.new,
    );

class DeviceAlertsController extends AsyncNotifier<bool> {
  @override
  Future<bool> build() => ref
      .read(preferencesServiceProvider)
      .getBool(StorageKeys.deviceAlerts, defaultValue: true);

  Future<void> set(bool on) async {
    final previous = state.value;
    state = AsyncData(on);
    try {
      await ref
          .read(preferencesServiceProvider)
          .setBool(StorageKeys.deviceAlerts, on);
    } catch (error) {
      debugPrint('Could not save the notifications setting: $error');
      // Show what is actually saved.
      if (ref.mounted && previous != null) state = AsyncData(previous);
    }
  }
}

/// The permissions the app needs in the field.
const List<AppPermission> fieldPermissions = [
  AppPermission.camera,
  AppPermission.location,
];

/// Whether the app has every [fieldPermissions] permission. Checked again
/// whenever the app returns to the foreground, as they can only be turned
/// off in the phone's settings.
final devicePermissionsProvider =
    AsyncNotifierProvider<DevicePermissionsController, bool>(
      DevicePermissionsController.new,
    );

class DevicePermissionsController extends AsyncNotifier<bool> {
  @override
  Future<bool> build() async {
    final lifecycle = AppLifecycleListener(onResume: ref.invalidateSelf);
    ref.onDispose(lifecycle.dispose);

    final permissions = ref.read(permissionAdapterProvider);
    for (final permission in fieldPermissions) {
      if (await permissions.status(permission) != AppPermissionStatus.granted) {
        return false;
      }
    }
    return true;
  }

  /// Turning on asks for whatever is missing (or opens the phone's
  /// settings for anything the officer refused for good). The app cannot
  /// remove its own permissions, so turning off opens the phone's settings
  /// where the officer can.
  Future<void> toggle() async {
    final permissions = ref.read(permissionAdapterProvider);
    if (state.value ?? false) {
      await permissions.openAppSettings();
      return;
    }

    var openSettings = false;
    for (final permission in fieldPermissions) {
      final status = await permissions.status(permission);
      if (status == AppPermissionStatus.granted) continue;
      if (status == AppPermissionStatus.permanentlyDenied ||
          status == AppPermissionStatus.unavailable) {
        openSettings = true;
        continue;
      }
      final result = await permissions.request(permission);
      if (result == AppPermissionStatus.permanentlyDenied) openSettings = true;
    }
    if (openSettings) await permissions.openAppSettings();
    if (ref.mounted) ref.invalidateSelf();
  }

  /// "Review access details": the phone's settings page for this app.
  Future<void> reviewInSettings() =>
      ref.read(permissionAdapterProvider).openAppSettings();
}
