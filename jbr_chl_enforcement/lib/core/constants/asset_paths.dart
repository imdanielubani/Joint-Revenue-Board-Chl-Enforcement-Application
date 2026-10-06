/// Paths to bundled assets. Keep in sync with the `assets:` list in
/// pubspec.yaml.
abstract final class AssetPaths {
  // Logo
  static const String logoMark = 'assets/images/logo/logo.png';
  static const String logoFull = 'assets/images/logo/jrb_chl_logo_full.png';

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
