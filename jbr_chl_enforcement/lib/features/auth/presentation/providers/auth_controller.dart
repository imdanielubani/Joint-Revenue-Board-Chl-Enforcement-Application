import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/utils/validators.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../domain/entities/auth_failure.dart';
import '../../domain/entities/auth_session.dart';
import '../../domain/usecases/login.dart';
import 'session_provider.dart';

final loginControllerProvider =
    NotifierProvider.autoDispose<LoginController, LoginState>(
      LoginController.new,
    );

/// Where sign-in has got to.
///
/// A successful sign-in goes [authenticating] → [checkingAccess] →
/// [accessConfirmed] → [success]. It can stop at [rejected] (not signed in),
/// [notAuthorized] (signed in, but not as an enforcement agent) or
/// [accountDisabled].
enum LoginStatus {
  idle,

  /// What was typed cannot be right; shown under the fields.
  invalidInput,

  /// Checking the email and password with the server.
  authenticating,

  /// Signed in; checking the account may work as an enforcement agent.
  checkingAccess,

  /// Agent access confirmed; shown briefly before finishing.
  accessConfirmed,

  /// Signed in and the session started.
  success,

  /// Sign-in was not confirmed (wrong credentials, no connection, server
  /// error). See [LoginState.rejection].
  rejected,

  /// The account is not an enforcement agent. Nothing has been kept.
  notAuthorized,

  /// The server refused sign-in because the account is deactivated.
  accountDisabled,
}

@immutable
class LoginState {
  const LoginState({
    this.status = LoginStatus.idle,
    this.message,
    this.emailError,
    this.passwordError,
    this.rejection,
    this.rememberSession = false,
    this.clearFormRequests = 0,
  });

  final LoginStatus status;

  /// Alert shown above the form: "Login Successful...".
  final String? message;

  /// Shown under the field when what was typed cannot be right.
  final String? emailError;
  final String? passwordError;

  /// Why sign-in was [LoginStatus.rejected].
  final AuthFailure? rejection;

  final bool rememberSession;

  /// Goes up each time the form should be emptied ("Use Another Account").
  final int clearFormRequests;

  /// Sign-in is in progress (the progress dialog's steps).
  bool get isSigningIn =>
      status == LoginStatus.authenticating ||
      status == LoginStatus.checkingAccess ||
      status == LoginStatus.accessConfirmed;

  /// The sign-in dialog is showing: progress, or a result to act on.
  bool get showsSignInDialog =>
      isSigningIn ||
      status == LoginStatus.rejected ||
      status == LoginStatus.notAuthorized;

  /// The sign-in button shows "Authenticating..." while sign-in runs.
  bool get isSubmitting => isSigningIn;

  /// Inputs are locked only while sign-in runs and after success. Behind a
  /// result dialog they stay enabled (the dialog's barrier already blocks
  /// them), so the form can never be left locked if the dialog goes away.
  bool get isLocked => isSigningIn || status == LoginStatus.success;

  /// The progress can still be abandoned (not once access is confirmed,
  /// when the session is about to be kept).
  bool get canCancel =>
      status == LoginStatus.authenticating ||
      status == LoginStatus.checkingAccess;

  LoginState copyWith({
    LoginStatus? status,
    String? Function()? message,
    String? Function()? emailError,
    String? Function()? passwordError,
    AuthFailure? Function()? rejection,
    bool? rememberSession,
    int? clearFormRequests,
  }) {
    return LoginState(
      status: status ?? this.status,
      message: message != null ? message() : this.message,
      emailError: emailError != null ? emailError() : this.emailError,
      passwordError: passwordError != null
          ? passwordError()
          : this.passwordError,
      rejection: rejection != null ? rejection() : this.rejection,
      rememberSession: rememberSession ?? this.rememberSession,
      clearFormRequests: clearFormRequests ?? this.clearFormRequests,
    );
  }
}

/// User-facing wording for sign-in outcomes.
abstract final class LoginMessages {
  // Alert above the form.
  static const String success = 'Login Successful...';

  // Why sign-in was not confirmed ("Unable to sign in").
  static const String rejectedCredentials =
      'Your sign-in was not confirmed. Check your credentials, or try again '
      'when CHL is available.';
  static const String rejectedNetwork =
      'CHL could not be reached. Check your network connection and try '
      'again.';
  static const String rejectedServer =
      'CHL could not confirm your sign-in right now. Please try again.';
  static const String rejectedNotConfigured =
      'Sign-in is unavailable on this device. Contact your administrator.';

  // Also used by password recovery.
  static const String network =
      'Unable to connect. Check your network and try again.';
  static const String server = 'Sign-in failed. Please try again.';
  static const String notConfigured =
      'Sign-in is unavailable. Contact your administrator.';

  // Messages under a field.
  static const String emailRequired = 'Enter your email address.';
  static const String emailInvalid = 'Enter a valid email address.';
  static const String passwordRequired = 'Enter your password.';

  /// The "Unable to sign in" explanation for [failure].
  static String rejectionFor(AuthFailure? failure) => switch (failure) {
    AuthFailure.network => rejectedNetwork,
    AuthFailure.server => rejectedServer,
    AuthFailure.notConfigured => rejectedNotConfigured,
    // Shown as their own dialog or sheet instead; listed for completeness.
    AuthFailure.invalidCredentials ||
    AuthFailure.notAuthorized ||
    AuthFailure.accountDisabled ||
    null => rejectedCredentials,
  };
}

/// Validates the form, signs the officer in and confirms they may work as
/// an enforcement agent before keeping the session.
///
/// Problems with what was typed are shown on the field concerned. Sign-in
/// itself runs in a dialog that shows each step and, if it stops, why and
/// what to do next. Nothing is saved on the device until agent access is
/// confirmed.
class LoginController extends Notifier<LoginState> {
  /// Each step shows for at least this long, so its result can be seen.
  static const Duration minStepDuration = Duration(milliseconds: 600);

  /// How long "Completed" shows for both steps before finishing.
  static const Duration confirmedHold = Duration(milliseconds: 700);

  /// Numbers each attempt; a step whose attempt is no longer current (the
  /// officer cancelled, or started again) is ignored when it completes.
  int _attempt = 0;

  /// Kept in memory only while an attempt is open, for "Try again" and
  /// "Recheck Access".
  ({String email, String password})? _credentials;

  /// Signed in, but agent access not yet confirmed. Never saved.
  AuthSession? _pendingSession;

  @override
  LoginState build() {
    ref.onDispose(_forgetAttempt);
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

  /// Call once the "account deactivated" sheet has been closed.
  void acknowledgeAccountDisabled() {
    if (state.status != LoginStatus.accountDisabled) return;
    state = state.copyWith(status: LoginStatus.idle);
  }

  void setRememberSession(bool value) {
    if (state.isLocked) return;
    state = state.copyWith(rememberSession: value);
  }

  /// Clears the email's error once the officer edits it.
  void onEmailChanged() =>
      _clearErrors(email: true, password: state.passwordError == null);

  /// Clears the password's error once the officer edits it.
  void onPasswordChanged() =>
      _clearErrors(email: state.emailError == null, password: true);

  void _clearErrors({required bool email, required bool password}) {
    // Editing means the result dialog is no longer showing.
    if (state.status == LoginStatus.rejected ||
        state.status == LoginStatus.notAuthorized) {
      dismiss();
      return;
    }
    if (state.status != LoginStatus.invalidInput) return;
    final emailError = email ? null : state.emailError;
    final passwordError = password ? null : state.passwordError;
    state = state.copyWith(
      status: emailError == null && passwordError == null
          ? LoginStatus.idle
          : LoginStatus.invalidInput,
      emailError: () => emailError,
      passwordError: () => passwordError,
    );
  }

  Future<void> submit({required String email, required String password}) async {
    if (state.isLocked) return;

    final trimmedEmail = email.trim();
    final emailError = trimmedEmail.isEmpty
        ? LoginMessages.emailRequired
        : Validators.isEmail(trimmedEmail)
        ? null
        : LoginMessages.emailInvalid;
    final passwordError = password.isEmpty
        ? LoginMessages.passwordRequired
        : null;
    if (emailError != null || passwordError != null) {
      state = state.copyWith(
        status: LoginStatus.invalidInput,
        message: () => null,
        emailError: () => emailError,
        passwordError: () => passwordError,
      );
      return;
    }

    state = state.copyWith(
      message: () => null,
      emailError: () => null,
      passwordError: () => null,
    );
    _credentials = (email: trimmedEmail, password: password);
    _pendingSession = null;
    await _signIn(++_attempt);
  }

  /// "Try again" after sign-in was not confirmed.
  Future<void> retry() async {
    if (state.status != LoginStatus.rejected || _credentials == null) return;
    final attempt = ++_attempt;
    final pending = _pendingSession;
    // A failed "Recheck Access" retries just that step.
    if (pending != null) {
      await _checkAccess(pending, attempt, refresh: true);
    } else {
      await _signIn(attempt);
    }
  }

  /// "Recheck Access": asks the server again for the account's role, in
  /// case an administrator has just changed it.
  Future<void> recheckAccess() async {
    if (state.status != LoginStatus.notAuthorized || _credentials == null) {
      return;
    }
    final attempt = ++_attempt;
    final pending = _pendingSession;
    if (pending != null) {
      // Signed in but not an agent: ask again for the role.
      await _checkAccess(pending, attempt, refresh: true);
    } else {
      // Refused at sign-in: sign in again from the start.
      await _signIn(attempt);
    }
  }

  /// Closes the dialog and returns to the form as it was ("Edit
  /// credentials", the close button, or back). Sign-in in progress is
  /// abandoned; once access is confirmed it can no longer be.
  void dismiss() {
    if (!state.showsSignInDialog ||
        state.status == LoginStatus.accessConfirmed) {
      return;
    }
    _forgetAttempt();
    state = state.copyWith(status: LoginStatus.idle, rejection: () => null);
  }

  /// Called when the sign-in dialog has gone, however it went. If it went
  /// without the controller closing it (removed by navigation, a browser
  /// Back, a rebuild), the form is unlocked as if it had been dismissed.
  void onDialogClosed() {
    if (!ref.mounted) return;
    dismiss();
  }

  /// "Use Another Account": closes the dialog and empties the form.
  void useAnotherAccount() {
    if (state.status != LoginStatus.notAuthorized) return;
    _forgetAttempt();
    state = state.copyWith(
      status: LoginStatus.idle,
      clearFormRequests: state.clearFormRequests + 1,
    );
  }

  void _forgetAttempt() {
    _attempt++;
    _credentials = null;
    _pendingSession = null;
  }

  bool _isCurrent(int attempt) => ref.mounted && attempt == _attempt;

  Future<void> _signIn(int attempt) async {
    final credentials = _credentials!;
    state = state.copyWith(
      status: LoginStatus.authenticating,
      rejection: () => null,
    );
    try {
      final session = await _atLeastOneStep(
        Login(ref.read(authRepositoryProvider))(
          email: credentials.email,
          password: credentials.password,
        ),
      );
      if (!_isCurrent(attempt)) return;
      await _checkAccess(session, attempt, refresh: false);
    } catch (error, stackTrace) {
      _onFailure(error, stackTrace, attempt);
    }
  }

  Future<void> _checkAccess(
    AuthSession session,
    int attempt, {
    required bool refresh,
  }) async {
    state = state.copyWith(
      status: LoginStatus.checkingAccess,
      rejection: () => null,
    );
    try {
      final granted = await _atLeastOneStep(
        CheckAgentAccess(ref.read(authRepositoryProvider))(
          session,
          refreshFrom: refresh ? _credentials : null,
        ),
      );
      if (!_isCurrent(attempt)) return;
      if (granted == null) {
        _pendingSession = session;
        state = state.copyWith(status: LoginStatus.notAuthorized);
        return;
      }

      state = state.copyWith(status: LoginStatus.accessConfirmed);
      await Future<void>.delayed(confirmedHold);
      if (!_isCurrent(attempt)) return;
      await KeepSession(ref.read(authRepositoryProvider))(
        granted,
        rememberSession: state.rememberSession,
      );
      if (!_isCurrent(attempt)) return;
      ref.read(sessionProvider.notifier).start(granted);
      _forgetAttempt();
      state = state.copyWith(
        status: LoginStatus.success,
        message: () => LoginMessages.success,
      );
    } catch (error, stackTrace) {
      // Keep the session so "Try again" can repeat just this step.
      if (_isCurrent(attempt)) _pendingSession = session;
      _onFailure(error, stackTrace, attempt);
    }
  }

  void _onFailure(Object error, StackTrace stackTrace, int attempt) {
    if (!_isCurrent(attempt)) return;
    final failure = error is AuthException ? error.failure : AuthFailure.server;
    if (error is AuthException) {
      debugPrint('Sign-in failed: $error');
    } else {
      debugPrint('Sign-in failed unexpectedly: $error\n$stackTrace');
    }
    if (failure == AuthFailure.accountDisabled) {
      _forgetAttempt();
      state = state.copyWith(status: LoginStatus.accountDisabled);
      return;
    }
    if (failure == AuthFailure.notAuthorized) {
      // The account may not sign in at all; keep the credentials for
      // "Recheck Access".
      _pendingSession = null;
      state = state.copyWith(status: LoginStatus.notAuthorized);
      return;
    }
    state = state.copyWith(
      status: LoginStatus.rejected,
      rejection: () => failure,
    );
  }

  /// [work]'s result, once at least [minStepDuration] has passed.
  static Future<T> _atLeastOneStep<T>(Future<T> work) async {
    final results = await Future.wait<Object?>([
      work,
      Future<void>.delayed(minStepDuration),
    ]);
    return results.first as T;
  }
}
