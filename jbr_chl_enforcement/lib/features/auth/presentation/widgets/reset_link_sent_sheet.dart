import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/widgets/app_button.dart';

/// What the officer chose on the "link sent" sheet.
enum ResetLinkSentAction { returnToLogin, dismissed }

/// Shows the "Reset Password – link sent" card over a dark scrim.
///
/// Resolves to [ResetLinkSentAction.returnToLogin] when the officer taps
/// "Return to Login", or [ResetLinkSentAction.dismissed] when the sheet is
/// dragged down, the scrim is tapped or Back is pressed.
Future<ResetLinkSentAction> showResetLinkSentSheet(BuildContext context) async {
  final action = await showModalBottomSheet<ResetLinkSentAction>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: AppColors.scrim,
    elevation: 0,
    // The card draws its own handle; the theme's would add a second one.
    showDragHandle: false,
    builder: (context) => const ResetLinkSentSheet(),
  );
  return action ?? ResetLinkSentAction.dismissed;
}

/// Floating card: handle, title, explanation, confirmation and the button
/// back to sign-in.
class ResetLinkSentSheet extends StatelessWidget {
  const ResetLinkSentSheet({super.key});

  /// Widest the card grows on tablets.
  static const double _maxWidth = 420;

  static const TextStyle _titleStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 25,
    fontWeight: AppTypography.bold,
    height: 33 / 25,
    color: AppColors.ink,
  );

  static const TextStyle _bodyStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 14,
    fontWeight: AppTypography.regular,
    height: 22.4 / 14,
    color: AppColors.inkMuted,
  );

  @override
  Widget build(BuildContext context) {
    // 25 above the screen edge as designed, or clear of the system
    // navigation / home indicator area when that is taller.
    final bottom = math.max(25.0, MediaQuery.viewPaddingOf(context).bottom);

    return SafeArea(
      bottom: false,
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, bottom),
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: _maxWidth),
            child: DecoratedBox(
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.all(Radius.circular(24)),
                boxShadow: [
                  BoxShadow(
                    color: Color(0x1A000000),
                    offset: Offset(11, 4),
                    blurRadius: 13.5,
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(17, 15, 17, 15),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 40,
                      height: 4,
                      decoration: const BoxDecoration(
                        color: AppColors.sheetHandle,
                        borderRadius: BorderRadius.all(Radius.circular(2)),
                      ),
                    ),
                    const SizedBox(height: 30),
                    Semantics(
                      header: true,
                      child: const Text(
                        'Reset Password',
                        textAlign: TextAlign.center,
                        style: _titleStyle,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Padding(
                      // 266 wide within the card, as designed.
                      padding: EdgeInsets.symmetric(horizontal: 29),
                      child: Text(
                        'A password reset link has been sent to your '
                        'registered email address.\n'
                        'The link expires in 30 minutes.',
                        textAlign: TextAlign.center,
                        style: _bodyStyle,
                      ),
                    ),
                    const SizedBox(height: 22),
                    const _SentConfirmation(),
                    const SizedBox(height: 22),
                    AppButton.primary(
                      label: 'Return to Login',
                      onPressed: () =>
                          Navigator.of(context)
                              .pop(ResetLinkSentAction.returnToLogin),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// "Reset link sent successfully" with a mint tick.
class _SentConfirmation extends StatelessWidget {
  const _SentConfirmation();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      container: true,
      child: Container(
        constraints: const BoxConstraints(minHeight: 43),
        padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.alertSuccessSubtleFill,
          border: Border.all(color: AppColors.alertSuccess),
          borderRadius: const BorderRadius.all(Radius.circular(24)),
        ),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: const BoxDecoration(
                color: AppColors.successIconHalo,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: SvgPicture.asset(
                AssetPaths.iconCheckCircleFilled,
                width: 24,
                height: 24,
                excludeFromSemantics: true,
              ),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Reset link sent successfully',
                style: TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 13,
                  fontWeight: AppTypography.medium,
                  height: 22 / 13,
                  color: AppColors.ink,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
