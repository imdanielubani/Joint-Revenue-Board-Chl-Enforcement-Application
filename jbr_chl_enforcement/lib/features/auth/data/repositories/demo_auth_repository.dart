import 'package:flutter/foundation.dart';

import '../../domain/entities/auth_failure.dart';
import '../../domain/entities/auth_session.dart';
import '../../domain/entities/officer.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_local_data_source.dart';
import 'auth_repository_impl.dart';

/// Local stand-in for the sign-in API, for trying the app before a backend
/// is available. Only used in debug builds started with
/// `--dart-define=AUTH_DEMO=true` (see `AppEnvironment.authDemoMode`).
///
/// [demoEmail] signs in as an enforcement agent and [clerkEmail] as an
/// officer without agent access (to see "Agent access not authorized"), both
/// with [demoPassword]. Anything else fails as invalid credentials, so
/// "Unable to sign in" can be seen too.
class DemoAuthRepository implements AuthRepository {
  DemoAuthRepository(this._local) : assert(!kReleaseMode);

  static const String demoEmail = 'officer@jbr.com';
  static const String clerkEmail = 'clerk@jbr.com';
  static const String demoPassword = 'Demo@2026';

  /// Simulated network round trip.
  static const Duration latency = Duration(milliseconds: 1200);

  final AuthLocalDataSource _local;

  @override
  Future<AuthSession> signIn({
    required String email,
    required String password,
  }) async {
    await Future<void>.delayed(latency);
    final officer = switch (email.toLowerCase()) {
      demoEmail => const Officer(
        id: 'demo',
        name: 'Demo Officer',
        email: demoEmail,
        region: 'Lagos State',
        role: 'Enforcement Agent',
      ),
      clerkEmail => const Officer(
        id: 'demo-clerk',
        name: 'Demo Clerk',
        email: clerkEmail,
        region: 'Lagos State',
        role: 'Revenue Clerk',
      ),
      _ => null,
    };
    if (officer == null || password != demoPassword) {
      throw const AuthException(AuthFailure.invalidCredentials, 'demo');
    }
    return AuthSession(
      accessToken: 'demo-token',
      expiresAt: DateTime.now().add(const Duration(hours: 8)),
      officer: officer,
    );
  }

  @override
  Future<void> keepSession(
    AuthSession session, {
    required bool rememberSession,
  }) => storeSession(_local, session, rememberSession: rememberSession);

  /// Always succeeds, as the real API does for unknown emails.
  @override
  Future<void> requestPasswordReset({required String email}) =>
      Future<void>.delayed(latency);
}
