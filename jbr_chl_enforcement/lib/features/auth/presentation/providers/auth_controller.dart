import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/auth_repository_impl.dart';
import '../../domain/entities/auth_failure.dart';
import '../../domain/usecases/login.dart';
import 'session_provider.dart';

final loginControllerProvider =
    NotifierProvider.autoDispose<LoginController, LoginState>(
      LoginController.new,
    );

enum LoginStatus { idle, submitting, success, failure }

@immutable
class LoginState {
  const LoginState({
    this.status = LoginStatus.idle,
    this.message,
    this.emailError,
    this.passwordError,
    this.rememberSession = false,
  });

  final LoginStatus status;

  /// Alert shown above the form: sign-in success, or a failure that is not
  /// about one particular field (wrong credentials, no connection).
  final String? message;

  /// Shown under the field when what was typed cannot be right.
  final String? emailError;
  final String? passwordError;
  final bool rememberSession;

  bool get isSubmitting => status == LoginStatus.submitting;

  /// Inputs are locked while signing in and after success.
  bool get isLocked =>
      status == LoginStatus.submitting || status == LoginStatus.success;

  LoginState copyWith({
    LoginStatus? status,
    String? Function()? message,
    String? Function()? emailError,
    String? Function()? passwordError,
    bool? rememberSession,
  }) {
    return LoginState(
      status: status ?? this.status,
      message: message != null ? message() : this.message,
      emailError: emailError != null ? emailError() : this.emailError,
      passwordError: passwordError != null
          ? passwordError()
          : this.passwordError,
      rememberSession: rememberSession ?? this.rememberSession,
    );
  }
}

/// User-facing wording for sign-in outcomes.
abstract final class LoginMessages {
  // Alerts above the form.
  static const String invalidCredentials = 'Incorrect email or password.';
  static const String success = 'Login Successful...';
  static const String network =
      'Unable to connect. Check your network and try again.';
  static const String server = 'Sign-in failed. Please try again.';
  static const String notConfigured =
      'Sign-in is unavailable. Contact your administrator.';

  // Messages under a field.
  static const String emailRequired = 'Enter your email address.';
  static const String emailInvalid = 'Enter a valid email address.';
  static const String passwordRequired = 'Enter your password.';
}

/// Validates the form and signs the officer in.
///
/// Problems with what was typed are shown on the field concerned; failures
/// that are not about one field (wrong credentials, no connection) are shown
/// once, as an alert above the form.
class LoginController extends Notifier<LoginState> {
  static final RegExp _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  @override
  LoginState build() {
    _restoreRememberChoice();
    return const LoginState();
  }

  Future<void> _restoreRememberChoice() async {
    try {
      final remember = await ref
          .read(authLocalDataSourceProvider)
          .readRememberSession();
      if (ref.mounted && state.status == LoginStatus.idle) {
        state = state.copyWith(rememberSession: remember);
      }
    } catch (error) {
      debugPrint('Could not read the Remember Session choice: $error');
    }
  }

  void setRememberSession(bool value) {
    if (state.isLocked) return;
    state = state.copyWith(rememberSession: value);
  }

  /// Clears the email's error, and any alert, once the officer edits it.
  void onEmailChanged() =>
      _clearErrors(email: true, password: state.passwordError == null);

  /// Clears the password's error, and any alert, once the officer edits it.
  void onPasswordChanged() =>
      _clearErrors(email: state.emailError == null, password: true);

  void _clearErrors({required bool email, required bool password}) {
    if (state.status != LoginStatus.failure) return;
    final emailError = email ? null : state.emailError;
    final passwordError = password ? null : state.passwordError;
    state = state.copyWith(
      status: emailError == null && passwordError == null
          ? LoginStatus.idle
          : LoginStatus.failure,
      message: () => null,
      emailError: () => emailError,
      passwordError: () => passwordError,
    );
  }

  Future<void> submit({required String email, required String password}) async {
    if (state.isLocked) return;

    final trimmedEmail = email.trim();
    final emailError = trimmedEmail.isEmpty
        ? LoginMessages.emailRequired
        : _emailPattern.hasMatch(trimmedEmail)
        ? null
        : LoginMessages.emailInvalid;
    final passwordError = password.isEmpty
        ? LoginMessages.passwordRequired
        : null;
    if (emailError != null || passwordError != null) {
      state = state.copyWith(
        status: LoginStatus.failure,
        message: () => null,
        emailError: () => emailError,
        passwordError: () => passwordError,
      );
      return;
    }

    state = state.copyWith(
      status: LoginStatus.submitting,
      message: () => null,
      emailError: () => null,
      passwordError: () => null,
    );

    try {
      final session = await Login(ref.read(authRepositoryProvider))(
        email: trimmedEmail,
        password: password,
        rememberSession: state.rememberSession,
      );
      if (!ref.mounted) return;
      ref.read(sessionProvider.notifier).start(session);
      state = state.copyWith(
        status: LoginStatus.success,
        message: () => LoginMessages.success,
      );
    } on AuthException catch (error) {
      debugPrint('Sign-in failed: $error');
      if (!ref.mounted) return;
      state = state.copyWith(
        status: LoginStatus.failure,
        message: () => _messageFor(error.failure),
      );
    } catch (error, stackTrace) {
      debugPrint('Sign-in failed unexpectedly: $error\n$stackTrace');
      if (!ref.mounted) return;
      state = state.copyWith(
        status: LoginStatus.failure,
        message: () => LoginMessages.server,
      );
    }
  }

  static String _messageFor(AuthFailure failure) => switch (failure) {
    AuthFailure.invalidCredentials => LoginMessages.invalidCredentials,
    AuthFailure.network => LoginMessages.network,
    AuthFailure.server => LoginMessages.server,
    AuthFailure.notConfigured => LoginMessages.notConfigured,
  };
}
