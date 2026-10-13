import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/sheets/app_bottom_sheet.dart';
import '../../../../shared/ui/widgets/app_button.dart';

/// What the officer chose on the "link sent" sheet.
enum ResetLinkSentAction {
  /// Tapped the button ("Return to Login", "Return to Settings").
  leave,

  /// Dragged the sheet down, tapped the scrim or pressed Back.
  dismissed,
}

/// Shows the "Reset Password – link sent" card over a dark scrim, with a
/// [leaveLabel] button.
Future<ResetLinkSentAction> showResetLinkSentSheet(
  BuildContext context, {
  String leaveLabel = ResetLinkSentSheet.returnToLogin,
}) async {
  final action = await showAppSheet<ResetLinkSentAction>(
    context: context,
    builder: (context) => ResetLinkSentSheet(leaveLabel: leaveLabel),
  );
  return action ?? ResetLinkSentAction.dismissed;
}

/// Floating card: handle, title, explanation, confirmation and the button
/// back (to sign-in, or to settings when signed in).
class ResetLinkSentSheet extends StatelessWidget {
  const ResetLinkSentSheet({super.key, this.leaveLabel = returnToLogin});

  static const String returnToLogin = 'Return to Login';

  final String leaveLabel;

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
    return AppSheetCard(
      // 25 above the screen edge, as designed for this card.
      bottomMargin: 25,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
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
            label: leaveLabel,
            onPressed: () =>
                Navigator.of(context).pop(ResetLinkSentAction.leave),
          ),
        ],
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
