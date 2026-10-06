import '../repositories/auth_repository.dart';

/// Sends a password reset link. Expects an already validated, trimmed email.
class RequestPasswordReset {
  const RequestPasswordReset(this._repository);

  final AuthRepository _repository;

  Future<void> call({required String email}) =>
      _repository.requestPasswordReset(email: email);
}
