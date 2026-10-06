import 'package:flutter/material.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/widgets/app_alert_banner.dart';
import '../../../../shared/ui/widgets/app_button.dart';
import '../../../../shared/ui/widgets/app_checkbox.dart';
import '../../../../shared/ui/widgets/app_text_field.dart';
import '../providers/auth_controller.dart';

/// Sign-in form on the white sheet: alert, credentials, Remember Session,
/// Forgot Password, Sign in and the access notice.
///
/// Must be given a bounded height: spare space goes between the form and
/// the Sign in button, so the button stays put whether or not an alert is
/// showing.
class LoginForm extends StatefulWidget {
  const LoginForm({
    super.key,
    required this.state,
    required this.onSubmit,
    required this.onRememberChanged,
    required this.onEmailChanged,
    required this.onPasswordChanged,
    required this.onForgotPassword,
  });

  final LoginState state;
  final void Function(String email, String password) onSubmit;
  final ValueChanged<bool> onRememberChanged;
  final VoidCallback onEmailChanged;
  final VoidCallback onPasswordChanged;

  /// Receives the email typed so far, to carry over to password recovery.
  final ValueChanged<String> onForgotPassword;

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _passwordFocus = FocusNode();
  bool _obscurePassword = true;

  // The Remember Session row has a 48 px touch target around its 20 px
  // design height; these gaps absorb the extra 14 px above and below.
  static const double _gapToRememberRow = 19 - 14;
  static const double _minGapToButton = 29 - 14;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  void _submit() {
    FocusScope.of(context).unfocus();
    widget.onSubmit(_email.text, _password.text);
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    final message = state.message;
    final locked = state.isLocked;

    return AutofillGroup(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AnimatedSize(
            duration: MediaQuery.disableAnimationsOf(context)
                ? Duration.zero
                : const Duration(milliseconds: 200),
            curve: Curves.easeOut,
            alignment: Alignment.topCenter,
            child: message == null
                ? const SizedBox(height: 16, width: double.infinity)
                : Padding(
                    padding: const EdgeInsets.only(bottom: 24),
                    child: AppAlertBanner(
                      kind: state.status == LoginStatus.success
                          ? AppAlertKind.success
                          : AppAlertKind.error,
                      message: message,
                    ),
                  ),
          ),
          AppTextField(
            label: 'Email Address',
            hint: 'example@jbr.com',
            controller: _email,
            iconAsset: AssetPaths.iconEmail,
            errorText: state.emailError,
            enabled: !locked,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            autofillHints: const [AutofillHints.email, AutofillHints.username],
            onChanged: (_) => widget.onEmailChanged(),
            onSubmitted: (_) => _passwordFocus.requestFocus(),
          ),
          const SizedBox(height: 19),
          AppTextField(
            label: 'Password',
            hint: 'Type Password',
            controller: _password,
            focusNode: _passwordFocus,
            iconAsset: AssetPaths.iconLock,
            errorText: state.passwordError,
            enabled: !locked,
            obscureText: _obscurePassword,
            keyboardType: TextInputType.visiblePassword,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.password],
            onChanged: (_) => widget.onPasswordChanged(),
            onSubmitted: (_) => _submit(),
            suffix: _VisibilityToggle(
              obscured: _obscurePassword,
              onPressed: () =>
                  setState(() => _obscurePassword = !_obscurePassword),
            ),
          ),
          const SizedBox(height: _gapToRememberRow),
          Row(
            children: [
              Expanded(
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: AppCheckbox(
                    value: state.rememberSession,
                    label: 'Remember Session',
                    onChanged: locked ? null : widget.onRememberChanged,
                  ),
                ),
              ),
              _ForgotPasswordLink(
                onPressed: locked
                    ? null
                    : () => widget.onForgotPassword(_email.text.trim()),
              ),
            ],
          ),
          const SizedBox(height: _minGapToButton),
          const Spacer(),
          AppButton.primary(
            label: 'Sign in',
            onPressed: _submit,
            isLoading: state.isSubmitting,
            isBusy: locked,
          ),
          const SizedBox(height: 15),
          // 325 wide within the 357 design width. Padding rather than a
          // max-width box, which would misreport its intrinsic height to the
          // screen's IntrinsicHeight.
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'This system is for authorized JBR personnel only. All '
              'activities are monitored and audited.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 12,
                fontWeight: AppTypography.regular,
                height: 16 / 12,
                color: Colors.black,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// "Show"/"Hide" pill inside the password field. Drawn at the design's size
/// with a larger invisible touch target.
class _VisibilityToggle extends StatelessWidget {
  const _VisibilityToggle({required this.obscured, required this.onPressed});

  final bool obscured;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: obscured ? 'Show password' : 'Hide password',
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onPressed,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: DecoratedBox(
            decoration: const BoxDecoration(
              color: AppColors.green,
              borderRadius: BorderRadius.all(Radius.circular(100)),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              child: Text(
                obscured ? 'Show' : 'Hide',
                style: const TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 12,
                  fontWeight: AppTypography.medium,
                  height: 1.5,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ForgotPasswordLink extends StatelessWidget {
  const _ForgotPasswordLink({required this.onPressed});

  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      link: true,
      child: InkWell(
        onTap: onPressed,
        borderRadius: const BorderRadius.all(Radius.circular(8)),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: const Align(
            widthFactor: 1,
            alignment: Alignment.centerRight,
            child: Text(
              'Forgot Password!',
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 12,
                fontWeight: AppTypography.semiBold,
                height: 1.5,
                color: AppColors.link,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
