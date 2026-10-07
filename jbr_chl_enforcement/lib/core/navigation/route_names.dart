abstract final class RouteNames {
  static const String launch = 'launch';
  static const String permissions = 'permissions';
  static const String login = 'login';
  static const String forgotPassword = 'forgot-password';

  // Signed-in tabs.
  static const String dashboard = 'dashboard';
  static const String history = 'history';
  static const String notifications = 'notifications';
  static const String profile = 'profile';

  // Full-screen pages opened from the tabs.
  static const String sos = 'sos';
  static const String verifyTrip = 'verify-trip';
  static const String verifyETag = 'verify-e-tag';

  // Verification methods.
  static const String rfidScan = 'rfid-scan';
  static const String qrScan = 'qr-scan';
  static const String manualPlate = 'manual-plate';
  static const String ocrCapture = 'ocr-capture';
  static const String verificationResult = 'verification-result';
}

abstract final class RoutePaths {
  static const String launch = '/';
  static const String permissions = '/permissions';
  static const String login = '/login';
  static const String forgotPassword = '/login/forgot-password';
  static const String dashboard = '/dashboard';
  static const String history = '/history';
  static const String notifications = '/notifications';
  static const String profile = '/profile';
  static const String sos = '/sos';
  static const String verifyTrip = '/verify';
  static const String verifyETag = '/verify-e-tag';
  static const String rfidScan = '/verify/rfid';
  static const String qrScan = '/verify/qr';
  static const String manualPlate = '/verify/plate';
  static const String ocrCapture = '/verify/ocr';
  static const String verificationResult = '/verify/result';
}
