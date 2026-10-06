import '../entities/auth_session.dart';

/// Signs officers in and keeps their session.
abstract interface class AuthRepository {
  /// Signs in with [email] and [password].
  ///
  /// When [rememberSession] is true the session is kept in secure storage
  /// for later launches; otherwise any saved session is removed.
  ///
  /// Throws an `AuthException` on failure.
  Future<AuthSession> signIn({
    required String email,
    required String password,
    required bool rememberSession,
  });

  /// Asks the server to email a password reset link to [email].
  ///
  /// Completes normally whether or not an account uses that email, so the
  /// app never reveals which emails are registered. Throws an
  /// `AuthException` when the request cannot be made or is rejected.
  Future<void> requestPasswordReset({required String email});
}
