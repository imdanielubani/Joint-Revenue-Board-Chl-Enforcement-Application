/// API paths, relative to `AppEnvironment.apiBaseUrl` (which ends in
/// `/api/v1`).
abstract final class ApiEndpoints {
  static const String login = '/auth/login';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String forgotPassword = '/auth/forgot-password';

  static const String dashboard = '/dashboard';

  static const String verifications = '/verifications';
  static String verification(String id) => '/verifications/$id';
  static String tripRefresh(String id) => '/verifications/$id/trip/refresh';
  static String destinationLocation(String id) =>
      '/verifications/$id/destination-location';
  static String loadStatus(String id) => '/verifications/$id/load-status';
  static const String resolveTags = '/rfid/resolve-tags';

  static const String notifications = '/notifications';
  static String notificationRead(String id) => '/notifications/$id/read';
  static const String notificationsReadAll = '/notifications/read-all';
}
