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
/// Only [demoEmail] is an enforcement agent:
/// - [demoEmail] with [demoPassword] signs in;
/// - [demoEmail] with any other password is a wrong password ("Unable to
///   sign in");
/// - any other email, [clerkEmail] included and whatever the password, may
///   not sign in at all ("Agent access not authorized"). [clerkEmail] with
///   [demoPassword] gets there through the role check, like a real account
///   with a non-agent role; the others are refused outright.
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
    final correct = password == demoPassword;
    switch (email.toLowerCase()) {
      case demoEmail when correct:
        return _session(
          const Officer(
            id: 'demo',
            name: 'Demo Officer',
            email: demoEmail,
            region: 'Lagos State',
            role: 'Enforcement Agent',
            agentId: 'JRB-AG-0142',
            assignment: 'Revenue Collection',
            organization: 'CHL Enforcement Unit',
          ),
        );
      case demoEmail:
        throw const AuthException(AuthFailure.invalidCredentials, 'demo');
      case clerkEmail when correct:
        return _session(
          const Officer(
            id: 'demo-clerk',
            name: 'Demo Clerk',
            email: clerkEmail,
            region: 'Lagos State',
            role: 'Revenue Clerk',
          ),
        );
      default:
        throw const AuthException(AuthFailure.notAuthorized, 'demo');
    }
  }

  static AuthSession _session(Officer officer) => AuthSession(
    accessToken: 'demo-token',
    expiresAt: DateTime.now().add(const Duration(hours: 8)),
    officer: officer,
  );

  @override
  Future<void> keepSession(
    AuthSession session, {
    required bool rememberSession,
  }) => storeSession(_local, session, rememberSession: rememberSession);

  /// Always succeeds, as the real API does for unknown emails.
  @override
  Future<void> requestPasswordReset({required String email}) =>
      Future<void>.delayed(latency);

  /// Nothing to end: the demo has no server.
  @override
  Future<void> signOut(AuthSession session) async {}
}
