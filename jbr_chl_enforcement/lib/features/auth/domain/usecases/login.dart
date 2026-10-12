import '../entities/agent_access.dart';
import '../entities/auth_session.dart';
import '../repositories/auth_repository.dart';

/// Signs an officer in. Expects an already validated, trimmed email.
///
/// The returned session is not saved yet: check it with [CheckAgentAccess],
/// then keep it with [KeepSession].
class Login {
  const Login(this._repository);

  final AuthRepository _repository;

  Future<AuthSession> call({required String email, required String password}) =>
      _repository.signIn(email: email, password: password);
}

/// Whether the signed-in officer may work as an enforcement agent.
///
/// With [refreshFrom] credentials the officer is signed in again first, so
/// a role just changed by an administrator is picked up ("Recheck Access").
/// Returns the session to keep (the fresh one when refreshed) when access is
/// granted, or null when it is not. Throws an `AuthException` when the
/// refresh fails.
class CheckAgentAccess {
  const CheckAgentAccess(this._repository);

  final AuthRepository _repository;

  Future<AuthSession?> call(
    AuthSession session, {
    ({String email, String password})? refreshFrom,
  }) async {
    final current = refreshFrom == null
        ? session
        : await _repository.signIn(
            email: refreshFrom.email,
            password: refreshFrom.password,
          );
    return AgentAccessPolicy.allows(current.officer) ? current : null;
  }
}

/// Keeps a confirmed session on the device (see
/// [AuthRepository.keepSession]).
class KeepSession {
  const KeepSession(this._repository);

  final AuthRepository _repository;

  Future<void> call(AuthSession session, {required bool rememberSession}) =>
      _repository.keepSession(session, rememberSession: rememberSession);
}
