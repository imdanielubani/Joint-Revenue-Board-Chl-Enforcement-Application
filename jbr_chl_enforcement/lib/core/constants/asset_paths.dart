/// Paths to bundled assets. Keep in sync with the `assets:` list in
/// pubspec.yaml.
abstract final class AssetPaths {
  // Logo
  static const String logoMark = 'assets/images/logo/logo.png';
  static const String logoFull = 'assets/images/logo/jrb_chl_logo_full.png';

  /// Wide logo (shield and wordmark), 2:1, transparent background.
  /// JRB CHL shield on its own (dashboard header).
  static const String logoShield = 'assets/images/logo/jrb_chl_shield.png';

  static const String logoWordmark =
      'assets/images/logo/jrb_chl_logo_wordmark.png';

  // Form and alert icons
  static const String iconEmail = 'assets/icons/auth/email.svg';
  static const String iconLock = 'assets/icons/auth/lock.svg';
  static const String iconCheck = 'assets/icons/auth/check.svg';
  static const String iconLoading = 'assets/icons/auth/loading.svg';
  static const String iconMailBadge = 'assets/icons/auth/mail_badge.svg';
  static const String iconBack = 'assets/icons/navigation/back.svg';
  static const String iconCheckCircleFilled =
      'assets/icons/alerts/check_circle_filled.svg';
  static const String iconWarningCircle =
      'assets/icons/alerts/warning_circle.svg';
  static const String iconCheckCircle = 'assets/icons/alerts/check_circle.svg';

  // Bottom navigation
  static const String navDashboard = 'assets/icons/navigation/dashboard.svg';
  static const String navHistory = 'assets/icons/navigation/history.svg';
  static const String navNotifications =
      'assets/icons/navigation/notifications.svg';
  static const String navProfile = 'assets/icons/navigation/profile.svg';

  // Dashboard
  static const String iconSos = 'assets/icons/dashboard/sos.svg';
  static const String iconBell = 'assets/icons/dashboard/bell.svg';
  static const String iconPin = 'assets/icons/dashboard/pin.svg';
  static const String iconTag = 'assets/icons/dashboard/tag.svg';
  static const String iconScan = 'assets/icons/dashboard/scan.svg';
  static const String iconInternet = 'assets/icons/dashboard/internet.svg';
  static const String iconGps = 'assets/icons/dashboard/gps.svg';
  static const String iconRfid = 'assets/icons/dashboard/rfid.svg';
  static const String iconSync = 'assets/icons/dashboard/sync.svg';
  static const String iconScans = 'assets/icons/dashboard/scans.svg';
  static const String iconTick = 'assets/icons/dashboard/tick.svg';
  static const String iconClock = 'assets/icons/dashboard/clock.svg';
  static const String iconIssues = 'assets/icons/dashboard/issues.svg';
  static const String iconRecentActive =
      'assets/icons/dashboard/recent_active.svg';
  static const String iconRecentNoActive =
      'assets/icons/dashboard/recent_no_active.svg';
  static const String iconRecentEscalated =
      'assets/icons/dashboard/recent_escalated.svg';

  // Verification methods
  static const String iconMethodRfid = 'assets/icons/verification/rfid.svg';
  static const String iconMethodQr = 'assets/icons/verification/qr_code.svg';
  static const String iconMethodKeyboard =
      'assets/icons/verification/keyboard.svg';
  static const String iconMethodCamera = 'assets/icons/verification/camera.svg';
  static const String iconChevronRight =
      'assets/icons/verification/chevron_right.svg';

  // Status sheets
  static const String iconShieldOff = 'assets/icons/status/shield_off.svg';
  static const String iconTimerOff = 'assets/icons/status/timer_off.svg';
  static const String iconInfo = 'assets/icons/status/info.svg';

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
