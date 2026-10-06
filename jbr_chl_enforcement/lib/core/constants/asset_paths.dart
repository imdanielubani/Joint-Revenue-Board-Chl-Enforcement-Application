/// Paths to bundled assets. Keep in sync with the `assets:` list in
/// pubspec.yaml.
abstract final class AssetPaths {
  // Logo
  static const String logoMark = 'assets/images/logo/logo.png';
  static const String logoFull = 'assets/images/logo/jrb_chl_logo_full.png';

  /// Wide logo (shield and wordmark), 2:1, transparent background.
  static const String logoWordmark =
      'assets/images/logo/jrb_chl_logo_wordmark.png';

  // Form and alert icons
  static const String iconEmail = 'assets/icons/auth/email.svg';
  static const String iconLock = 'assets/icons/auth/lock.svg';
  static const String iconCheck = 'assets/icons/auth/check.svg';
  static const String iconLoading = 'assets/icons/auth/loading.svg';
  static const String iconWarningCircle =
      'assets/icons/alerts/warning_circle.svg';
  static const String iconCheckCircle = 'assets/icons/alerts/check_circle.svg';

  // Backgrounds
  static const String launchBackground =
      'assets/images/backgrounds/launch_background.png';

  // Permission icons
  static const String permissionNotifications =
      'assets/icons/permissions/notifications.svg';
  static const String permissionCamera = 'assets/icons/permissions/camera.svg';
  static const String permissionLocation =
      'assets/icons/permissions/location.svg';
  static const String permissionGpsDisabled =
      'assets/icons/permissions/gps_disabled.svg';
}
