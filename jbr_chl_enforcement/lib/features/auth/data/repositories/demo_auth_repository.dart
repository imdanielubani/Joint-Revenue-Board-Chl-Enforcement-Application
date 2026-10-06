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
/// Accepts [demoEmail] / [demoPassword]; anything else fails as invalid
/// credentials, so the error state can be seen too.
class DemoAuthRepository implements AuthRepository {
  DemoAuthRepository(this._local) : assert(!kReleaseMode);

  static const String demoEmail = 'officer@jbr.com';
  static const String demoPassword = 'Demo@2026';

  /// Simulated network round trip.
  static const Duration latency = Duration(milliseconds: 1200);

  final AuthLocalDataSource _local;

  @override
  Future<AuthSession> signIn({
    required String email,
    required String password,
    required bool rememberSession,
  }) async {
    await Future<void>.delayed(latency);
    if (email.toLowerCase() != demoEmail || password != demoPassword) {
      throw const AuthException(AuthFailure.invalidCredentials, 'demo');
    }
    final session = AuthSession(
      accessToken: 'demo-token',
      expiresAt: DateTime.now().add(const Duration(hours: 8)),
      officer: const Officer(
        id: 'demo',
        name: 'Demo Officer',
        email: demoEmail,
      ),
    );
    await storeSession(_local, session, rememberSession: rememberSession);
    return session;
  }
}
