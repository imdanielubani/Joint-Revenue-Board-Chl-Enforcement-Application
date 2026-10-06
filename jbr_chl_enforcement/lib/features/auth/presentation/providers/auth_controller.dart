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
    this.emailInvalid = false,
    this.passwordInvalid = false,
    this.rememberSession = false,
  });

  final LoginStatus status;

  /// Alert shown above the form for [LoginStatus.success] and
  /// [LoginStatus.failure].
  final String? message;
  final bool emailInvalid;
  final bool passwordInvalid;
  final bool rememberSession;

  bool get isSubmitting => status == LoginStatus.submitting;

  /// Inputs are locked while signing in and after success.
  bool get isLocked =>
      status == LoginStatus.submitting || status == LoginStatus.success;

  LoginState copyWith({
    LoginStatus? status,
    String? Function()? message,
    bool? emailInvalid,
    bool? passwordInvalid,
    bool? rememberSession,
  }) {
    return LoginState(
      status: status ?? this.status,
      message: message != null ? message() : this.message,
      emailInvalid: emailInvalid ?? this.emailInvalid,
      passwordInvalid: passwordInvalid ?? this.passwordInvalid,
      rememberSession: rememberSession ?? this.rememberSession,
    );
  }
}

/// User-facing wording for sign-in outcomes.
abstract final class LoginMessages {
  // Wording as in the design.
  static const String invalid = 'Invalid Enter a Valid email and password.';
  static const String success = 'Login Successful...';
  static const String network =
      'Unable to connect. Check your network and try again.';
  static const String server = 'Sign-in failed. Please try again.';
  static const String notConfigured =
      'Sign-in is unavailable. Contact your administrator.';
}

/// Validates the form and signs the officer in.
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

  /// Clears an error once the officer starts correcting the form.
  void onInputChanged() {
    if (state.status != LoginStatus.failure) return;
    state = state.copyWith(
      status: LoginStatus.idle,
      message: () => null,
      emailInvalid: false,
      passwordInvalid: false,
    );
  }

  Future<void> submit({required String email, required String password}) async {
    if (state.isLocked) return;

    final trimmedEmail = email.trim();
    final emailInvalid = !_emailPattern.hasMatch(trimmedEmail);
    final passwordInvalid = password.isEmpty;
    if (emailInvalid || passwordInvalid) {
      state = state.copyWith(
        status: LoginStatus.failure,
        message: () => LoginMessages.invalid,
        emailInvalid: emailInvalid,
        passwordInvalid: passwordInvalid,
      );
      return;
    }

    state = state.copyWith(
      status: LoginStatus.submitting,
      message: () => null,
      emailInvalid: false,
      passwordInvalid: false,
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
      final invalid = error.failure == AuthFailure.invalidCredentials;
      state = state.copyWith(
        status: LoginStatus.failure,
        message: () => _messageFor(error.failure),
        emailInvalid: invalid,
        passwordInvalid: invalid,
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
    AuthFailure.invalidCredentials => LoginMessages.invalid,
    AuthFailure.network => LoginMessages.network,
    AuthFailure.server => LoginMessages.server,
    AuthFailure.notConfigured => LoginMessages.notConfigured,
  };
}
