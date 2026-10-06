import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart' as ph;

/// Runtime permissions the app asks for.
enum AppPermission { notifications, camera, location }

enum AppPermissionStatus {
  granted,

  /// Not granted yet; the system dialog can still be shown.
  denied,

  /// Blocked by the user; only the app's settings page can change it.
  permanentlyDenied,

  /// Not applicable or not changeable on this device (e.g. parental
  /// controls, or a platform without this permission).
  unavailable,
}

final permissionAdapterProvider = Provider<PermissionAdapter>(
  (ref) => const PermissionAdapter(),
);

/// Wraps the permission and location plugins so the rest of the app does not
/// depend on them directly.
class PermissionAdapter {
  const PermissionAdapter();

  Future<AppPermissionStatus> status(AppPermission permission) =>
      _guard(() async => _map(await _plugin(permission).status));

  Future<AppPermissionStatus> request(AppPermission permission) =>
      _guard(() async => _map(await _plugin(permission).request()));

  /// Whether the device's location service (GPS) is switched on.
  Future<bool> isLocationServiceEnabled() async {
    try {
      return await Geolocator.isLocationServiceEnabled();
    } catch (error) {
      debugPrint('Location service check failed: $error');
      return true;
    }
  }

  /// Opens this app's page in system settings. Returns false if it could not.
  Future<bool> openAppSettings() => _open(ph.openAppSettings);

  /// Opens the device's location settings. Returns false if it could not.
  Future<bool> openLocationSettings() => _open(Geolocator.openLocationSettings);

  static Future<bool> _open(Future<bool> Function() open) async {
    try {
      return await open();
    } catch (error) {
      debugPrint('Opening settings failed: $error');
      return false;
    }
  }

  static ph.Permission _plugin(AppPermission permission) =>
      switch (permission) {
        AppPermission.notifications => ph.Permission.notification,
        AppPermission.camera => ph.Permission.camera,
        AppPermission.location => ph.Permission.locationWhenInUse,
      };

  static AppPermissionStatus _map(ph.PermissionStatus status) =>
      switch (status) {
        ph.PermissionStatus.granted ||
        ph.PermissionStatus.limited ||
        ph.PermissionStatus.provisional => AppPermissionStatus.granted,
        ph.PermissionStatus.denied => AppPermissionStatus.denied,
        ph.PermissionStatus.permanentlyDenied =>
          AppPermissionStatus.permanentlyDenied,
        ph.PermissionStatus.restricted => AppPermissionStatus.unavailable,
      };

  /// Platforms without a permission (e.g. some on web) throw; treat those as
  /// unavailable rather than failing the caller.
  static Future<AppPermissionStatus> _guard(
    Future<AppPermissionStatus> Function() call,
  ) async {
    try {
      return await call();
    } catch (error) {
      debugPrint('Permission call failed: $error');
      return AppPermissionStatus.unavailable;
    }
  }
}
