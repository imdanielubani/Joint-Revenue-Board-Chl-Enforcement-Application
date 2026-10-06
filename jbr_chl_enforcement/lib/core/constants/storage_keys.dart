/// Keys for values kept in local and secure storage.
abstract final class StorageKeys {
  /// Set once the permission screen has asked about [permission], so it is
  /// not shown again on later launches.
  static String permissionPrompted(String permission) =>
      'permission_prompted.$permission';

  /// Whether the officer chose "Remember Session" at sign-in.
  static const String rememberSession = 'auth.remember_session';

  /// Saved session (secure storage), present only when remembered.
  static const String authSession = 'auth.session';
}
