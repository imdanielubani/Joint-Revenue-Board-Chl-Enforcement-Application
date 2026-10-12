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
  FakeAuthRepository({
    this.failure,
    this.delay = Duration.zero,
    this.role = agentRole,
    this.resetFailure,
    this.resetDelay = Duration.zero,
  });

  static const String agentRole = 'Enforcement Agent';

  /// Fails with this when set; otherwise signs in as [officer] with [role].
  AuthFailure? failure;
  Duration delay;

  /// The signed-in officer's role; change it to test agent access.
  String? role;

  /// Password reset fails with this when set; otherwise succeeds.
  AuthFailure? resetFailure;
  Duration resetDelay;
  final List<String> resetRequests = [];

  static const Officer officer = Officer(
    id: 'o-1',
    name: 'Test Officer',
    email: 'officer@jbr.com',
    role: agentRole,
  );

  final List<({String email, String password})> calls = [];

  /// Sessions kept on the device, with the Remember Session choice.
  final List<({AuthSession session, bool remember})> kept = [];

  @override
  Future<AuthSession> signIn({
    required String email,
    required String password,
  }) async {
    calls.add((email: email, password: password));
    if (delay > Duration.zero) await Future<void>.delayed(delay);
    final failure = this.failure;
    if (failure != null) throw AuthException(failure);
    return AuthSession(
      accessToken: 'token',
      officer: Officer(
        id: officer.id,
        name: officer.name,
        email: officer.email,
        role: role,
      ),
    );
  }

  @override
  Future<void> keepSession(
    AuthSession session, {
    required bool rememberSession,
  }) async => kept.add((session: session, remember: rememberSession));

  @override
  Future<void> requestPasswordReset({required String email}) async {
    resetRequests.add(email);
    if (resetDelay > Duration.zero) await Future<void>.delayed(resetDelay);
    final failure = resetFailure;
    if (failure != null) throw AuthException(failure);
  }
}
