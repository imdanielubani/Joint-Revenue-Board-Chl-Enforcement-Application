import '../entities/auth_session.dart';
import '../repositories/auth_repository.dart';

/// Signs an officer in. Expects an already validated, trimmed email.
class Login {
  const Login(this._repository);

  final AuthRepository _repository;

  Future<AuthSession> call({
    required String email,
    required String password,
    required bool rememberSession,
  }) {
    return _repository.signIn(
      email: email,
      password: password,
      rememberSession: rememberSession,
    );
  }
}
