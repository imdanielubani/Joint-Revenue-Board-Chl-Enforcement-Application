import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_failure.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_session.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/officer.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/repositories/auth_repository.dart';
import 'package:jbr_chl_enforcement/shared/device/permissions/permission_adapter.dart';
import 'package:jbr_chl_enforcement/shared/storage/preferences_service.dart';
import 'package:jbr_chl_enforcement/shared/storage/secure_storage_service.dart';

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

/// In-memory [SecureStorageService].
class FakeSecureStorageService implements SecureStorageService {
  final Map<String, String> values = {};

  @override
  Future<String?> read(String key) async => values[key];

  @override
  Future<void> write(String key, String value) async => values[key] = value;

  @override
  Future<void> delete(String key) async => values.remove(key);
}

/// Scriptable [AuthRepository].
class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({this.failure, this.delay = Duration.zero});

  /// Fails with this when set; otherwise signs in as [officer].
  AuthFailure? failure;
  Duration delay;

  static const Officer officer = Officer(
    id: 'o-1',
    name: 'Test Officer',
    email: 'officer@jbr.com',
  );

  final List<({String email, String password, bool remember})> calls = [];

  @override
  Future<AuthSession> signIn({
    required String email,
    required String password,
    required bool rememberSession,
  }) async {
    calls.add((email: email, password: password, remember: rememberSession));
    if (delay > Duration.zero) await Future<void>.delayed(delay);
    final failure = this.failure;
    if (failure != null) throw AuthException(failure);
    return const AuthSession(accessToken: 'token', officer: officer);
  }
}
