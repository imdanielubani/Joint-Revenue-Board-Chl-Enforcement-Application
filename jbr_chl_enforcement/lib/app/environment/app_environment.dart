import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Which backend a build talks to. Each installs as its own app on Android
/// (`--flavor`), so dev, staging and production can sit side by side.
enum AppFlavor {
  dev('DEV'),
  staging('STAGING'),
  prod('');

  const AppFlavor(this.bannerLabel);

  /// Shown in the corner of every screen, so a test build is never taken
  /// for the real one. Empty for production.
  final String bannerLabel;

  /// The flavor for Flutter's `--flavor` ([flavor]) or, where the platform
  /// has none set up (iOS for now), the `APP_ENV` define ([define]).
  /// Unknown or missing means dev.
  static AppFlavor resolve(String? flavor, String define) {
    final name = (flavor?.isNotEmpty ?? false) ? flavor! : define;
    return switch (name.trim().toLowerCase()) {
      'prod' || 'production' => AppFlavor.prod,
      'staging' => AppFlavor.staging,
      _ => AppFlavor.dev,
    };
  }
}

/// Build-time configuration: the flavor, and the defines in
/// `config/<flavor>.json`.
///
/// ```sh
/// flutter run --flavor dev --dart-define-from-file=config/dev.json
/// flutter build apk --flavor prod --dart-define-from-file=config/prod.json
/// flutter run --flavor dev --dart-define=AUTH_DEMO=true   # sample data
/// ```
///
/// For iteime_backend on this computer: `http://10.0.2.2:4000/api/v1` from
/// the Android emulator (the default in `config/dev.json`),
/// `http://localhost:4000/api/v1` from the iOS simulator or a browser,
/// `http://<computer's LAN address>:4000/api/v1` from a phone on the same
/// Wi-Fi.
abstract final class AppEnvironment {
  static final AppFlavor flavor = AppFlavor.resolve(
    appFlavor,
    const String.fromEnvironment('APP_ENV'),
  );

  static bool get isProduction => flavor == AppFlavor.prod;

  /// Base URL of the enforcement API (iteime_backend), ending in `/api/v1`,
  /// exactly as given. See [hasApi].
  static const String apiBaseUrl = String.fromEnvironment('API_BASE_URL');

  /// Whether [apiBaseUrl] may be used: set, and `https` in release builds
  /// (an officer's phone never sends credentials in clear text). Without
  /// it, sign-in says "Sign-in is unavailable. Contact your administrator."
  static bool get hasApi => isUsableApiUrl(apiBaseUrl, release: kReleaseMode);

  @visibleForTesting
  static bool isUsableApiUrl(String url, {required bool release}) {
    final uri = Uri.tryParse(url.trim());
    if (uri == null || !uri.hasAuthority) return false;
    return uri.scheme == 'https' || (!release && uri.scheme == 'http');
  }

  /// Signs in against a local demo account instead of the API, so screens
  /// can be tried before a backend is available. Never active in release
  /// builds or the production flavor.
  static bool get authDemoMode =>
      !kReleaseMode && !isProduction && const bool.fromEnvironment('AUTH_DEMO');
}
