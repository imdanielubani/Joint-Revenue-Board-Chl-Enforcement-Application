import '../../../../shared/device/permissions/permission_adapter.dart';

/// Steps of the permission screen, in the order they are shown.
enum PermissionStep {
  notifications(AppPermission.notifications),
  camera(AppPermission.camera),
  location(AppPermission.location),

  /// Shown when the device's location service (GPS) is switched off.
  gpsDisabled(null);

  const PermissionStep(this.permission);

  /// Runtime permission this step asks for, or null for [gpsDisabled].
  final AppPermission? permission;
}
