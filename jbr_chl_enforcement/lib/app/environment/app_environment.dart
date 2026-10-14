import 'package:flutter/foundation.dart';

/// Build-time configuration, passed with `--dart-define`.
///
/// ```sh
/// flutter run --dart-define=API_BASE_URL=https://api.example.gov.ng/api/v1
/// flutter run --dart-define=AUTH_DEMO=true   # debug builds only
/// ```
///
/// For iteime_backend on this computer: `http://10.0.2.2:4000/api/v1` from
/// the Android emulator, `http://localhost:4000/api/v1` from the iOS
/// simulator or a browser, `http://<computer's LAN address>:4000/api/v1`
/// from a phone on the same Wi-Fi.
abstract final class AppEnvironment {
  /// Base URL of the enforcement API (iteime_backend), ending in `/api/v1`.
  /// Empty when not configured.
  static const String apiBaseUrl = String.fromEnvironment('API_BASE_URL');

  static bool get hasApi => apiBaseUrl.isNotEmpty;

  /// Signs in against a local demo account instead of the API, so screens
  /// can be tried before a backend is available. Never active in release
  /// builds.
  static bool get authDemoMode =>
      !kReleaseMode && const bool.fromEnvironment('AUTH_DEMO');
}
