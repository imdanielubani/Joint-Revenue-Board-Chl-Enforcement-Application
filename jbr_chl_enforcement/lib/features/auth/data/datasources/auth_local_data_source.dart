import 'dart:convert';

import '../../../../core/constants/storage_keys.dart';
import '../../../../shared/storage/preferences_service.dart';
import '../../../../shared/storage/secure_storage_service.dart';
import '../../domain/entities/auth_session.dart';
import '../models/auth_token_model.dart';

/// Keeps the remembered session (encrypted) and the "Remember Session"
/// choice on the device.
class AuthLocalDataSource {
  const AuthLocalDataSource(this._secureStorage, this._preferences);

  final SecureStorageService _secureStorage;
  final PreferencesService _preferences;

  Future<void> saveSession(AuthSession session) => _secureStorage.write(
    StorageKeys.authSession,
    jsonEncode(AuthTokenModel.toJson(session)),
  );

  /// The remembered session, or null if none is stored or it is unreadable.
  Future<AuthSession?> readSession() async {
    final raw = await _secureStorage.read(StorageKeys.authSession);
    if (raw == null) return null;
    try {
      return AuthTokenModel.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } on Object {
      await clearSession();
      return null;
    }
  }

  Future<void> clearSession() => _secureStorage.delete(StorageKeys.authSession);

  Future<bool> readRememberSession() =>
      _preferences.getBool(StorageKeys.rememberSession);

  Future<void> saveRememberSession(bool value) =>
      _preferences.setBool(StorageKeys.rememberSession, value);
}
