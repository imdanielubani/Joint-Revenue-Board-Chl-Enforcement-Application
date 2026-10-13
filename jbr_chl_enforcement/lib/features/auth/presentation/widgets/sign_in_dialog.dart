import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/widgets/ring_spinner.dart';
import '../providers/auth_controller.dart';

/// Shows [SignInDialog] over the sign-in screen and returns its route, so
/// the screen can close it when sign-in finishes.
///
/// It cannot be dismissed by tapping outside; the close button and the
/// system back button call [LoginController.dismiss].
RawDialogRoute<void> pushSignInDialog(BuildContext context) {
  final route = RawDialogRoute<void>(
    barrierColor: AppColors.scrim,
    barrierDismissible: false,
    transitionDuration: const Duration(milliseconds: 200),
    pageBuilder: (context, animation, secondaryAnimation) =>
        const SignInDialog(),
    transitionBuilder: (context, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(parent: animation, curve: Curves.easeOut);
      return FadeTransition(
        opacity: curved,
        child: ScaleTransition(
          scale: Tween<double>(begin: 0.96, end: 1).animate(curved),
          child: child,
        ),
      );
    },
  );
  Navigator.of(context).push(route);
  return route;
}

/// Sign-in progress ("Signing you in", "Checking agent access") and its
/// outcomes ("Unable to sign in", "Agent access not authorized"), following
/// [loginControllerProvider].
class SignInDialog extends ConsumerStatefulWidget {
  const SignInDialog({super.key});

  /// Widest the card grows; 19 px either side on a 390 px phone.
  static const double maxWidth = 352;

  @override
  ConsumerState<SignInDialog> createState() => _SignInDialogState();
}

class _SignInDialogState extends ConsumerState<SignInDialog> {
  // Kept from the start: ref cannot be used once disposed.
  late final LoginController _controller;

  @override
  void initState() {
    super.initState();
    _controller = ref.read(loginControllerProvider.notifier);
  }

  @override
  void dispose() {
    // However the dialog went (its buttons, navigation, a browser Back),
    // make sure the form is not left locked. After the widget tree has
    // settled, as providers cannot change during it.
    scheduleMicrotask(_controller.onDialogClosed);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(loginControllerProvider);
    final controller = _controller;

    final Widget content = switch (state.status) {
      LoginStatus.rejected => _ResultContent(
        key: const ValueKey('rejected'),
        iconAsset: AssetPaths.iconSignInAlert,
        label: 'Sign-In Unsuccessful',
        heading: 'Unable to sign in',
        message: LoginMessages.rejectionFor(state.rejection),
        primaryLabel: 'Try again',
        onPrimary: controller.retry,
        secondaryLabel: 'Edit credentials',
        onSecondary: controller.dismiss,
      ),
      LoginStatus.notAuthorized => _ResultContent(
        key: const ValueKey('not-authorized'),
        iconAsset: AssetPaths.iconSignInShieldX,
        label: 'Access Restricted',
        heading: 'Agent access not authorized',
        message:
            'This account does not have enforcement-agent access. Contact '
            'your administrator to review your role.',
        primaryLabel: 'Use Another Account',
        onPrimary: controller.useAnotherAccount,
        secondaryLabel: 'Recheck Access',
        onSecondary: controller.recheckAccess,
      ),
      // The progress card stays in place while its steps update.
      _ => _ProgressContent(
        key: const ValueKey('progress'),
        status: state.status,
      ),
    };

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) controller.dismiss();
      },
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 19, vertical: 16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(
                maxWidth: SignInDialog.maxWidth,
              ),
              // The shadow sits outside the clipped card.
              child: DecoratedBox(
                decoration: const BoxDecoration(
                  borderRadius: BorderRadius.all(Radius.circular(28)),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.dialogShadow,
                      offset: Offset(0, 18),
                      blurRadius: 60,
                    ),
                  ],
                ),
                child: Material(
                  color: Colors.white,
                  shape: RoundedRectangleBorder(
                    side: BorderSide(
                      color: AppColors.dialogBorder,
                      width:
                          state.status == LoginStatus.rejected ||
                              state.status == LoginStatus.notAuthorized
                          ? 1
                          : 1.2,
                    ),
                    borderRadius: const BorderRadius.all(Radius.circular(28)),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Semantics(
                    scopesRoute: true,
                    namesRoute: true,
                    explicitChildNodes: true,
                    label: 'Sign in',
                    child: Stack(
                      children: [
                        // Scrolls on short screens and with large text.
                        SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(22, 24, 22, 24),
                          // With reduced motion the content simply
                          // changes (AnimatedSize cannot run at zero
                          // duration).
                          child: MediaQuery.disableAnimationsOf(context)
                              ? content
                              : AnimatedSize(
                                  duration: const Duration(milliseconds: 220),
                                  curve: Curves.easeOut,
                                  alignment: Alignment.topCenter,
                                  child: AnimatedSwitcher(
                                    duration: const Duration(milliseconds: 200),
                                    child: content,
                                  ),
                                ),
                        ),
                        if (state.canCancel ||
                            state.status == LoginStatus.rejected ||
                            state.status == LoginStatus.notAuthorized)
                          Positioned(
                            top: 10,
                            right: 14,
                            child: _CloseButton(onPressed: controller.dismiss),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// Text styles shared by the dialog's states.
const TextStyle _labelStyle = TextStyle(
  fontFamily: AppTypography.fontFamily,
  fontSize: 12,
  fontWeight: AppTypography.semiBold,
  height: 18 / 12,
  letterSpacing: 0.3,
);

const TextStyle _headingStyle = TextStyle(
  fontFamily: AppTypography.fontFamily,
  fontSize: 23,
  fontWeight: AppTypography.bold,
  height: 28.75 / 23,
  letterSpacing: -0.575,
  color: AppColors.forest,
);

const TextStyle _messageStyle = TextStyle(
  fontFamily: AppTypography.fontFamily,
  fontSize: 14,
  fontWeight: AppTypography.regular,
  height: 22.4 / 14,
  color: AppColors.ink,
);

/// Icon, label, heading and message: the top of every state.
class _Intro extends StatelessWidget {
  const _Intro({
    required this.iconAsset,
    required this.halo,
    required this.label,
    required this.labelColor,
    required this.heading,
    required this.message,
    this.spinning = false,
  });

  final String iconAsset;
  final Color halo;
  final String label;
  final Color labelColor;
  final String heading;
  final String message;

  /// Shows the outer ring with a rotating arc (sign-in in progress).
  final bool spinning;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // 8 px top padding, then the 76 px badge 12 px further down.
        SizedBox(
          height: 96,
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.topCenter,
            children: [
              if (spinning)
                const Positioned(top: 15, child: RingSpinner(diameter: 86)),
              Positioned(
                top: 20,
                child: Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    color: halo,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: SvgPicture.asset(
                    iconAsset,
                    width: 32,
                    height: 32,
                    excludeFromSemantics: true,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 26),
        Text(
          label,
          textAlign: TextAlign.center,
          style: _labelStyle.copyWith(color: labelColor),
        ),
        const SizedBox(height: 30),
        Semantics(
          header: true,
          child: Text(
            heading,
            textAlign: TextAlign.center,
            style: _headingStyle,
          ),
        ),
        const SizedBox(height: 12),
        Semantics(
          liveRegion: true,
          child: Text(
            message,
            textAlign: TextAlign.center,
            style: _messageStyle,
          ),
        ),
      ],
    );
  }
}

/// "Signing you in" and "Checking agent access", with the two steps.
class _ProgressContent extends StatelessWidget {
  const _ProgressContent({super.key, required this.status});

  final LoginStatus status;

  @override
  Widget build(BuildContext context) {
    final authenticating = status == LoginStatus.authenticating;
    final accessDone = status == LoginStatus.accessConfirmed;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Intro(
          iconAsset: authenticating
              ? AssetPaths.iconSignInLock
              : AssetPaths.iconSignInShieldCheck,
          halo: AppColors.greenTint,
          label: authenticating ? 'Authentication' : 'Agent Authentication',
          labelColor: AppColors.green,
          heading: authenticating ? 'Signing you in' : 'Checking agent access',
          message: authenticating
              ? 'Checking your JRB CHL credentials. Please wait for the '
                    'authentication response.'
              : 'Confirming that your account is authorized to work as an '
                    'enforcement agent.',
          spinning: !accessDone,
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: const BoxDecoration(
            color: AppColors.greenTint,
            borderRadius: BorderRadius.all(Radius.circular(16)),
          ),
          child: Column(
            children: [
              _Step(
                label: 'Authentication',
                done: !authenticating,
                pendingIcon: AssetPaths.iconStepClockPending,
                doneIcon: AssetPaths.iconStepClockDone,
              ),
              const SizedBox(height: 12),
              _Step(
                label: 'Agent access',
                done: accessDone,
                pendingIcon: AssetPaths.iconStepShieldPending,
                doneIcon: AssetPaths.iconStepShieldDone,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Step extends StatelessWidget {
  const _Step({
    required this.label,
    required this.done,
    required this.pendingIcon,
    required this.doneIcon,
  });

  final String label;
  final bool done;
  final String pendingIcon;
  final String doneIcon;

  @override
  Widget build(BuildContext context) {
    final color = done ? AppColors.green : AppColors.inkHalf;
    final weight = done ? AppTypography.medium : AppTypography.regular;
    final status = done ? 'Completed' : 'Pending';

    return Semantics(
      container: true,
      label: '$label: $status',
      excludeSemantics: true,
      child: Row(
        children: [
          SvgPicture.asset(
            done ? doneIcon : pendingIcon,
            width: 18.9937,
            height: 18.9937,
            excludeFromSemantics: true,
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 12,
                fontWeight: weight,
                height: 1.5,
                color: color,
              ),
            ),
          ),
          const SizedBox(width: 9),
          Text(
            status,
            style: TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: 11,
              fontWeight: weight,
              height: 1.5,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

/// "Unable to sign in" and "Agent access not authorized".
class _ResultContent extends StatelessWidget {
  const _ResultContent({
    super.key,
    required this.iconAsset,
    required this.label,
    required this.heading,
    required this.message,
    required this.primaryLabel,
    required this.onPrimary,
    required this.secondaryLabel,
    required this.onSecondary,
  });

  final String iconAsset;
  final String label;
  final String heading;
  final String message;
  final String primaryLabel;
  final VoidCallback onPrimary;
  final String secondaryLabel;
  final VoidCallback onSecondary;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Intro(
          iconAsset: iconAsset,
          halo: AppColors.errorTint,
          label: label,
          labelColor: AppColors.error,
          heading: heading,
          message: message,
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: const BoxDecoration(
            color: AppColors.greenTint,
            borderRadius: BorderRadius.all(Radius.circular(16)),
          ),
          child: const Text(
            'You have not been signed in. No field records or saved work '
            'have changed.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: 12,
              fontWeight: AppTypography.regular,
              height: 19.2 / 12,
              color: AppColors.inkHalf,
            ),
          ),
        ),
        const SizedBox(height: 22),
        _DialogButton(label: primaryLabel, filled: true, onPressed: onPrimary),
        const SizedBox(height: 8),
        _DialogButton(
          label: secondaryLabel,
          filled: false,
          onPressed: onSecondary,
        ),
      ],
    );
  }
}

/// The dialog's 52 px pill buttons.
class _DialogButton extends StatelessWidget {
  const _DialogButton({
    required this.label,
    required this.filled,
    required this.onPressed,
  });

  final String label;
  final bool filled;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final style = ButtonStyle(
      minimumSize: const WidgetStatePropertyAll(Size(0, 52)),
      padding: const WidgetStatePropertyAll(
        EdgeInsets.symmetric(horizontal: 18, vertical: 13),
      ),
      shape: const WidgetStatePropertyAll(
        RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(28)),
        ),
      ),
      elevation: const WidgetStatePropertyAll(0),
      backgroundColor: WidgetStatePropertyAll(
        filled ? AppColors.green : Colors.white,
      ),
      foregroundColor: WidgetStatePropertyAll(
        filled ? Colors.white : AppColors.ink,
      ),
      side: WidgetStatePropertyAll(
        filled
            ? BorderSide.none
            : const BorderSide(color: AppColors.ink, width: 1.5),
      ),
      overlayColor: WidgetStatePropertyAll(
        (filled ? Colors.white : AppColors.green).withValues(alpha: 0.12),
      ),
      textStyle: const WidgetStatePropertyAll(
        TextStyle(
          fontFamily: AppTypography.fontFamily,
          fontSize: 14,
          fontWeight: AppTypography.medium,
          height: 18.9 / 14,
        ),
      ),
    );
    final text = Text(label, textAlign: TextAlign.center);
    return filled
        ? FilledButton(onPressed: onPressed, style: style, child: text)
        : OutlinedButton(onPressed: onPressed, style: style, child: text);
  }
}

class _CloseButton extends StatelessWidget {
  const _CloseButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Close and return to sign in',
      excludeSemantics: true,
      child: InkResponse(
        onTap: onPressed,
        radius: 24,
        child: SizedBox(
          width: 48,
          height: 48,
          child: Center(
            child: SvgPicture.asset(
              AssetPaths.iconDialogClose,
              width: 20,
              height: 20,
              excludeFromSemantics: true,
            ),
          ),
        ),
      ),
    );
  }
}
