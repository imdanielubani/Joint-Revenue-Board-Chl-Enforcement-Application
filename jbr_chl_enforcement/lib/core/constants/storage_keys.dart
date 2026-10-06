/// Keys for values kept in local preferences.
abstract final class StorageKeys {
  /// Set once the permission screen has asked about [permission], so it is
  /// not shown again on later launches.
  static String permissionPrompted(String permission) =>
      'permission_prompted.$permission';
}
