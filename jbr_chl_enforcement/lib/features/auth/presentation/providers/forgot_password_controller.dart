import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/utils/validators.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../domain/entities/auth_failure.dart';
import '../../domain/usecases/request_password_reset.dart';
import 'auth_controller.dart';

final forgotPasswordControllerProvider =
    NotifierProvider.autoDispose<ForgotPasswordController, ForgotPasswordState>(
      ForgotPasswordController.new,
    );

enum ForgotPasswordStatus { idle, submitting, sent, failure }

@immutable
class ForgotPasswordState {
  const ForgotPasswordState({
    this.status = ForgotPasswordStatus.idle,
    this.emailError,
    this.message,
  });

  final ForgotPasswordStatus status;

  /// Shown under the email field when what was typed cannot be right.
  final String? emailError;

  /// Alert for failures not about the email itself (no connection).
  final String? message;

  bool get isSubmitting => status == ForgotPasswordStatus.submitting;

  ForgotPasswordState copyWith({
    ForgotPasswordStatus? status,
    String? Function()? emailError,
    String? Function()? message,
  }) {
    return ForgotPasswordState(
      status: status ?? this.status,
      emailError: emailError != null ? emailError() : this.emailError,
      message: message != null ? message() : this.message,
    );
  }
}

/// User-facing wording for the password reset screen.
abstract final class ForgotPasswordMessages {
  static const String server =
      'Could not send the reset link. Please try again.';
}

/// Validates the email and requests a password reset link.
class ForgotPasswordController extends Notifier<ForgotPasswordState> {
  @override
  ForgotPasswordState build() => const ForgotPasswordState();

  /// Clears errors once the officer edits the email.
  void onEmailChanged() {
    if (state.status != ForgotPasswordStatus.failure) return;
    state = const ForgotPasswordState();
  }

  /// Call when the "link sent" sheet is closed without leaving the screen,
  /// so another link can be requested.
  void acknowledgeSent() {
    if (state.status != ForgotPasswordStatus.sent) return;
    state = const ForgotPasswordState();
  }

  Future<void> submit(String email) async {
    if (state.isSubmitting || state.status == ForgotPasswordStatus.sent) {
      return;
    }

    final trimmed = email.trim();
    final emailError = trimmed.isEmpty
        ? LoginMessages.emailRequired
        : Validators.isEmail(trimmed)
        ? null
        : LoginMessages.emailInvalid;
    if (emailError != null) {
      state = ForgotPasswordState(
        status: ForgotPasswordStatus.failure,
        emailError: emailError,
      );
      return;
    }

    state = const ForgotPasswordState(status: ForgotPasswordStatus.submitting);
    try {
      await RequestPasswordReset(ref.read(authRepositoryProvider))(
        email: trimmed,
      );
      if (!ref.mounted) return;
      state = const ForgotPasswordState(status: ForgotPasswordStatus.sent);
    } on AuthException catch (error) {
      debugPrint('Password reset request failed: $error');
      if (!ref.mounted) return;
      state = switch (error.failure) {
        // The server rejected the email itself (400 / 422).
        AuthFailure.invalidCredentials => const ForgotPasswordState(
          status: ForgotPasswordStatus.failure,
          emailError: LoginMessages.emailInvalid,
        ),
        AuthFailure.network => const ForgotPasswordState(
          status: ForgotPasswordStatus.failure,
          message: LoginMessages.network,
        ),
        AuthFailure.notConfigured => const ForgotPasswordState(
          status: ForgotPasswordStatus.failure,
          message: LoginMessages.notConfigured,
        ),
        AuthFailure.server => const ForgotPasswordState(
          status: ForgotPasswordStatus.failure,
          message: ForgotPasswordMessages.server,
        ),
      };
    } catch (error, stackTrace) {
      debugPrint('Password reset request failed: $error\n$stackTrace');
      if (!ref.mounted) return;
      state = const ForgotPasswordState(
        status: ForgotPasswordStatus.failure,
        message: ForgotPasswordMessages.server,
      );
    }
  }
}
