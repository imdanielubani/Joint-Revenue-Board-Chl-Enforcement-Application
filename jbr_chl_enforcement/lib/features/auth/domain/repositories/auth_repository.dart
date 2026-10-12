import '../entities/auth_session.dart';

/// Signs officers in and keeps their session.
abstract interface class AuthRepository {
  /// Signs in with [email] and [password] and returns the new session.
  ///
  /// Nothing is saved on the device: the session is only kept, with
  /// [keepSession], once the officer's agent access has been confirmed.
  ///
  /// Throws an `AuthException` on failure.
  Future<AuthSession> signIn({required String email, required String password});

  /// Keeps [session] for later launches when [rememberSession] is true;
  /// otherwise removes any saved session. Remembers the choice either way.
  /// Storage problems are logged, not thrown.
  Future<void> keepSession(
    AuthSession session, {
    required bool rememberSession,
  });

  /// Asks the server to email a password reset link to [email].
  ///
  /// Completes normally whether or not an account uses that email, so the
  /// app never reveals which emails are registered. Throws an
  /// `AuthException` when the request cannot be made or is rejected.
  Future<void> requestPasswordReset({required String email});
}
