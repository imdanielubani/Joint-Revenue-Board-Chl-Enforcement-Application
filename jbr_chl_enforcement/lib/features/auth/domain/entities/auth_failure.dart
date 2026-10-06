/// Why sign-in failed.
enum AuthFailure {
  /// Wrong email or password.
  invalidCredentials,

  /// No connection, or the server could not be reached in time.
  network,

  /// The server answered with an unexpected error.
  server,

  /// No sign-in service is configured for this build.
  notConfigured,
}

/// Thrown by an `AuthRepository` when sign-in fails.
class AuthException implements Exception {
  const AuthException(this.failure, [this.detail]);

  final AuthFailure failure;

  /// Diagnostic detail for logs; never shown to the user.
  final String? detail;

  @override
  String toString() =>
      'AuthException(${failure.name}${detail == null ? '' : ': $detail'})';
}
