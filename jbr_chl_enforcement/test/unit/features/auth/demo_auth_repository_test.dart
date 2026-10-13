import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/features/auth/data/datasources/auth_local_data_source.dart';
import 'package:jbr_chl_enforcement/features/auth/data/repositories/demo_auth_repository.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/agent_access.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_failure.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_session.dart';

import '../../../helpers/fakes.dart';

void main() {
  late DemoAuthRepository repository;

  setUp(() {
    repository = DemoAuthRepository(
      AuthLocalDataSource(FakeSecureStorageService(), FakePreferencesService()),
    );
  });

  /// Signs in, letting the simulated network delay pass. Returns the
  /// session or the error.
  Object? attempt(String email, String password) {
    Object? outcome;
    fakeAsync((async) {
      repository
          .signIn(email: email, password: password)
          .then<void>(
            (session) => outcome = session,
            onError: (Object error) => outcome = error,
          );
      async.elapse(DemoAuthRepository.latency);
    });
    return outcome;
  }

  Matcher failsWith(AuthFailure failure) =>
      isA<AuthException>().having((e) => e.failure, 'failure', failure);

  bool isAgent(Object? session) =>
      AgentAccessPolicy.allows((session! as AuthSession).officer);

  test('the agent with the right password signs in as an agent', () {
    final session = attempt('Officer@JBR.com', 'Demo@2026');
    expect(session, isA<AuthSession>());
    expect(isAgent(session), isTrue);
  });

  test('the agent with a wrong password is a wrong password', () {
    expect(
      attempt('officer@jbr.com', 'wrong'),
      failsWith(AuthFailure.invalidCredentials),
    );
  });

  test('the clerk with the right password is refused by the role check', () {
    final session = attempt('clerk@jbr.com', 'Demo@2026');
    expect(session, isA<AuthSession>());
    expect(isAgent(session), isFalse);
  });

  for (final (email, password) in [
    ('clerk@jbr.com', 'anything'),
    ('someone@jbr.com', 'Demo@2026'),
    ('someone@jbr.com', 'wrong'),
  ]) {
    test('$email with "$password" may not sign in at all', () {
      expect(attempt(email, password), failsWith(AuthFailure.notAuthorized));
    });
  }
}
