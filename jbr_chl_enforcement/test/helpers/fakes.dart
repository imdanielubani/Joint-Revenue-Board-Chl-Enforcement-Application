import 'package:jbr_chl_enforcement/shared/device/permissions/permission_adapter.dart';
import 'package:jbr_chl_enforcement/shared/storage/preferences_service.dart';

/// In-memory [PreferencesService].
class FakePreferencesService implements PreferencesService {
  FakePreferencesService([Map<String, bool>? values]) : values = values ?? {};

  final Map<String, bool> values;

  @override
  Future<bool> getBool(String key, {bool defaultValue = false}) async =>
      values[key] ?? defaultValue;

  @override
  Future<void> setBool(String key, bool value) async => values[key] = value;
}

/// Scriptable [PermissionAdapter] that records what was called.
class FakePermissionAdapter implements PermissionAdapter {
  FakePermissionAdapter({
    Map<AppPermission, AppPermissionStatus>? statuses,
    this.locationServiceEnabled = true,
    this.statusAfterRequest = AppPermissionStatus.granted,
  }) : statuses = {
         for (final permission in AppPermission.values)
           permission: AppPermissionStatus.granted,
         ...?statuses,
       };

  /// All granted, GPS on: nothing for the permission screen to show.
  factory FakePermissionAdapter.allGranted() => FakePermissionAdapter();

  final Map<AppPermission, AppPermissionStatus> statuses;
  bool locationServiceEnabled;
  AppPermissionStatus statusAfterRequest;

  final List<AppPermission> requested = [];
  int appSettingsOpened = 0;
  int locationSettingsOpened = 0;

  @override
  Future<AppPermissionStatus> status(AppPermission permission) async =>
      statuses[permission]!;

  @override
  Future<AppPermissionStatus> request(AppPermission permission) async {
    requested.add(permission);
    return statuses[permission] = statusAfterRequest;
  }

  @override
  Future<bool> isLocationServiceEnabled() async => locationServiceEnabled;

  @override
  Future<bool> openAppSettings() async {
    appSettingsOpened++;
    return true;
  }

  @override
  Future<bool> openLocationSettings() async {
    locationSettingsOpened++;
    return true;
  }
}
