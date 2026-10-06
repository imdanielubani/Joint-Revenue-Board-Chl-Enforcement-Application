import 'package:flutter/foundation.dart';

/// Build-time configuration, passed with `--dart-define`.
///
/// ```sh
/// flutter run --dart-define=API_BASE_URL=https://api.example.gov.ng
/// flutter run --dart-define=AUTH_DEMO=true   # debug builds only
/// ```
abstract final class AppEnvironment {
  /// Base URL of the enforcement API. Empty when not configured.
  static const String apiBaseUrl = String.fromEnvironment('API_BASE_URL');

  static bool get hasApi => apiBaseUrl.isNotEmpty;

  /// Signs in against a local demo account instead of the API, so screens
  /// can be tried before a backend is available. Never active in release
  /// builds.
  static bool get authDemoMode =>
      !kReleaseMode && const bool.fromEnvironment('AUTH_DEMO');
}
