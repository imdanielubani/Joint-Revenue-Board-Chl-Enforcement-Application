import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final preferencesServiceProvider = Provider<PreferencesService>(
  (ref) => PreferencesService(SharedPreferencesAsync()),
);

/// Small, non-sensitive app settings and flags. Use secure storage for
/// tokens or personal data.
class PreferencesService {
  PreferencesService(this._prefs);

  final SharedPreferencesAsync _prefs;

  Future<bool> getBool(String key, {bool defaultValue = false}) async =>
      await _prefs.getBool(key) ?? defaultValue;

  Future<void> setBool(String key, bool value) => _prefs.setBool(key, value);
}
