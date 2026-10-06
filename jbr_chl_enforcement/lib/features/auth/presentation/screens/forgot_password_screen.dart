import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/widgets/app_alert_banner.dart';
import '../../../../shared/ui/widgets/app_button.dart';
import '../../../../shared/ui/widgets/app_text_field.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../providers/forgot_password_controller.dart';
import '../widgets/reset_link_sent_sheet.dart';

/// Password recovery: the officer enters their email and is sent a reset
/// link. Opened from sign-in, with any email already typed there.
///
/// The content scrolls; the Send Reset Link button stays at the bottom,
/// above the keyboard when it is open. The button is disabled until an
/// email is entered.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key, this.initialEmail});

  /// Email carried over from the sign-in screen.
  final String? initialEmail;

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  /// Widest the content grows on tablets.
  static const double _maxContentWidth = 420;

  late final TextEditingController _email = TextEditingController(
    text: widget.initialEmail?.trim() ?? '',
  );

  static const TextStyle _titleStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 25,
    fontWeight: AppTypography.bold,
    height: 29 / 25,
    letterSpacing: -0.5,
    color: AppColors.ink,
  );

  static const TextStyle _messageStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 15,
    fontWeight: AppTypography.regular,
    height: 1.5,
    color: AppColors.inkMuted,
  );

  @override
  void initState() {
    super.initState();
    // Rebuild so the button enables as soon as something is typed.
    _email.addListener(_onEmailEdited);
  }

  @override
  void dispose() {
    _email
      ..removeListener(_onEmailEdited)
      ..dispose();
    super.dispose();
  }

  void _onEmailEdited() => setState(() {});

  void _goBack() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.goNamed(RouteNames.login);
    }
  }

  Future<void> _onStateChanged(
    ForgotPasswordState? previous,
    ForgotPasswordState next,
  ) async {
    if (next.status != ForgotPasswordStatus.sent ||
        previous?.status == ForgotPasswordStatus.sent) {
      return;
    }
    final action = await showResetLinkSentSheet(context);
    if (!mounted) return;
    if (action == ResetLinkSentAction.returnToLogin) {
      _goBack();
    } else {
      ref.read(forgotPasswordControllerProvider.notifier).acknowledgeSent();
    }
  }

  void _submit() {
    FocusScope.of(context).unfocus();
    ref.read(forgotPasswordControllerProvider.notifier).submit(_email.text);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(forgotPasswordControllerProvider, _onStateChanged);
    final state = ref.watch(forgotPasswordControllerProvider);
    final controller = ref.read(forgotPasswordControllerProvider.notifier);
    final hasEmail = _email.text.trim().isNotEmpty;
    final message = state.message;

    return GreenHeaderScaffold(
      title: 'Password Recovery',
      onBack: _goBack,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: _maxContentWidth),
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: const EdgeInsets.fromLTRB(16, 52, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const _Intro(
                        titleStyle: _titleStyle,
                        messageStyle: _messageStyle,
                      ),
                      const SizedBox(height: 23),
                      if (message != null) ...[
                        AppAlertBanner(
                          kind: AppAlertKind.error,
                          message: message,
                        ),
                        const SizedBox(height: 16),
                      ],
                      AppTextField(
                        label: 'Email Address',
                        hint: 'Enter your email address',
                        controller: _email,
                        iconAsset: AssetPaths.iconEmail,
                        errorText: state.emailError,
                        enabled: !state.isSubmitting,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.send,
                        autofillHints: const [AutofillHints.email],
                        onChanged: (_) => controller.onEmailChanged(),
                        onSubmitted: hasEmail ? (_) => _submit() : null,
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                child: AppButton.primary(
                  label: 'Send Reset Link',
                  onPressed: hasEmail ? _submit : null,
                  isLoading: state.isSubmitting,
                  loadingLabel: 'Verifying...',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Mail icon, title and explanation.
class _Intro extends StatelessWidget {
  const _Intro({required this.titleStyle, required this.messageStyle});

  final TextStyle titleStyle;
  final TextStyle messageStyle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 316),
        child: Column(
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: const BoxDecoration(
                color: AppColors.greenTint,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: SvgPicture.asset(
                AssetPaths.iconMailBadge,
                width: 34,
                height: 34,
                excludeFromSemantics: true,
              ),
            ),
            const SizedBox(height: 23),
            Semantics(
              header: true,
              child: Text(
                'Recover Your Account',
                textAlign: TextAlign.center,
                style: titleStyle,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              'Enter your registered enforcement email address to receive a '
              'password reset link',
              textAlign: TextAlign.center,
              style: messageStyle,
            ),
          ],
        ),
      ),
    );
  }
}
