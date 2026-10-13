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
  static const String iconRecentETag = 'assets/icons/dashboard/recent_etag.svg';

  // Verification methods
  static const String iconMethodRfid = 'assets/icons/verification/rfid.svg';
  static const String iconMethodQr = 'assets/icons/verification/qr_code.svg';
  static const String iconMethodKeyboard =
      'assets/icons/verification/keyboard.svg';
  static const String iconMethodCamera = 'assets/icons/verification/camera.svg';
  static const String iconChevronRight =
      'assets/icons/verification/chevron_right.svg';

  // Profile and settings
  static const String iconChevronLarge =
      'assets/icons/account/chevron_large.svg';
  static const String iconRowChevron = 'assets/icons/account/chevron.svg';
  static const String iconRowChevronDark =
      'assets/icons/account/chevron_dark.svg';
  static const String iconRowHistory = 'assets/icons/account/history.svg';
  static const String iconRowDevice = 'assets/icons/account/device.svg';
  static const String iconRowBell = 'assets/icons/account/bell.svg';
  static const String iconRowLock = 'assets/icons/account/lock.svg';
  static const String iconRowSync = 'assets/icons/account/sync.svg';
  static const String iconRowDatabase = 'assets/icons/account/database.svg';
  static const String iconSignOutLock =
      'assets/icons/account/sign_out_lock.svg';

  // QR scanner
  static const String scannerDir = 'assets/icons/scanner';
  static const String iconScannerClose = '$scannerDir/close.svg';
  static const String iconScannerShutter = '$scannerDir/camera.svg';
  static const String iconScannerLocked = '$scannerDir/lock.svg';

  // Verification processing and result
  static const String resultDir = 'assets/icons/result';
  static const String iconProcessingChecking = '$resultDir/checking.svg';
  static const String iconProcessingStepActive = '$resultDir/step_active.svg';
  static const String iconProcessingStepDone = '$resultDir/step_done.svg';
  static const String iconResultVerified = '$resultDir/verified.svg';
  static const String iconResultNoTrip = '$resultDir/no_trip.svg';
  static const String iconResultNotFound = '$resultDir/not_found.svg';
  static const String iconResultUnavailable = '$resultDir/unavailable.svg';
  static const String iconResultPlateKeyboard = '$resultDir/plate_keyboard.svg';
  static const String iconResultVehicle = '$resultDir/vehicle.svg';
  static const String iconResultETag = '$resultDir/e_tag.svg';
  static const String iconResultTrip = '$resultDir/trip.svg';
  static const String iconResultActive = '$resultDir/badge_active.svg';
  static const String iconResultArrow = '$resultDir/arrow.svg';
  static const String iconResultRoutePin = '$resultDir/route_pin.svg';
  static const String iconResultChevron = '$resultDir/chevron.svg';
  static const String imageResultRouteMap = '$resultDir/route_map.svg';

  // RFID verification
  static const String rfidDir = 'assets/icons/rfid';
  static const String iconRfidReader = '$rfidDir/reader.svg';
  static const String iconRfidReaderDisconnected =
      '$rfidDir/reader_disconnected.svg';
  static const String iconRfidAlert = '$rfidDir/alert.svg';
  static const String iconRfidTagDetected = '$rfidDir/tag_detected.svg';
  static const String iconRfidInfo = '$rfidDir/info.svg';
  static const String iconRfidVerifying = '$rfidDir/verifying.svg';
  static const String iconRfidCommunicationError =
      '$rfidDir/communication_error.svg';
  static const String iconRfidUnknownTag = '$rfidDir/unknown_tag.svg';
  static const String iconRfidVehicles = '$rfidDir/vehicles.svg';
  static const String iconRfidVehicle = '$rfidDir/vehicle_row.svg';
  static const String iconRfidChevron = '$rfidDir/chevron.svg';

  // Verification history
  static const String historyDir = 'assets/icons/history';
  static const String iconHistoryTripOk = '$historyDir/trip_ok.svg';
  static const String iconHistoryTripWarn = '$historyDir/trip_warn.svg';
  static const String iconHistoryETagWarn = '$historyDir/etag_warn.svg';
  static const String iconHistoryUnfinished = '$historyDir/unfinished.svg';
  static const String iconHistoryCompleted = '$historyDir/badge_done.svg';
  static const String iconHistoryNotCompleted = '$historyDir/badge_pending.svg';
  static const String iconHistoryChevron = '$historyDir/chevron.svg';
  static const String iconHistoryFilter = '$historyDir/filter.svg';
  static const String iconHistoryEmpty = '$historyDir/empty.svg';
  static const String iconHistoryNoMatch = '$historyDir/no_match.svg';
  static const String iconHistoryRecordOk = '$historyDir/record_ok.svg';
  static const String iconHistoryChipRemove = '$historyDir/chip_remove.svg';
  static const String iconHistorySheetClose = '$historyDir/sheet_close.svg';
  static const String iconHistoryDropdown = '$historyDir/dropdown.svg';
  static const String iconHistoryMatch = '$historyDir/match_filter.svg';

  // Notifications
  static const String notificationsDir = 'assets/icons/notifications';
  static const String iconNotificationChevron = '$notificationsDir/chevron.svg';
  static const String iconNotificationsCaughtUp =
      '$notificationsDir/caught_up.svg';
  static const String iconNotificationsUnavailable =
      '$notificationsDir/unavailable.svg';
  static const String iconNotificationsEmpty = '$notificationsDir/empty.svg';

  // Offline sync modal
  static const String iconSyncModal = 'assets/icons/sync/sync.svg';
  static const String iconSyncAcknowledged =
      'assets/icons/sync/acknowledged.svg';
  static const String iconSyncInterrupted = 'assets/icons/sync/interrupted.svg';
  static const String iconSyncOffline = 'assets/icons/sync/offline.svg';
  static const String iconQueueRecord = 'assets/icons/sync/queue_record.svg';
  static const String iconQueueEmpty = 'assets/icons/sync/queue_empty.svg';

  // Sign-in progress and result dialogs
  static const String iconSignInLock = 'assets/icons/sign_in/status_lock.svg';
  static const String iconSignInShieldCheck =
      'assets/icons/sign_in/status_shield_check.svg';
  static const String iconSignInAlert = 'assets/icons/sign_in/status_alert.svg';
  static const String iconSignInShieldX =
      'assets/icons/sign_in/status_shield_x.svg';
  static const String iconStepClockPending =
      'assets/icons/sign_in/step_clock_pending.svg';
  static const String iconStepClockDone =
      'assets/icons/sign_in/step_clock_done.svg';
  static const String iconStepShieldPending =
      'assets/icons/sign_in/step_shield_pending.svg';
  static const String iconStepShieldDone =
      'assets/icons/sign_in/step_shield_done.svg';
  static const String iconDialogClose = 'assets/icons/sign_in/close.svg';

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
