import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/sheets/app_bottom_sheet.dart';
import '../../../../shared/ui/widgets/app_button.dart';

/// Tells the officer their account can no longer sign in.
Future<void> showAccountDeactivatedSheet(BuildContext context) =>
    showAppSheet<void>(
      context: context,
      builder: (context) => const AccountDeactivatedSheet(),
    );

/// Tells the officer their session ended and they must sign in again.
/// [pendingActions] offline actions waiting to sync add a reassurance
/// banner.
Future<void> showSessionExpiredSheet(
  BuildContext context, {
  int pendingActions = 0,
}) => showAppSheet<void>(
  context: context,
  builder: (context) => SessionExpiredSheet(pendingActions: pendingActions),
);

class AccountDeactivatedSheet extends StatelessWidget {
  const AccountDeactivatedSheet({super.key});

  @override
  Widget build(BuildContext context) {
    return AppSheetCard(
      child: _StatusSheetContent(
        iconAsset: AssetPaths.iconShieldOff,
        iconHalo: AppColors.dangerTint,
        title: 'Account Deactivated',
        message:
            'This account can no longer access CHL Enforcement. Contact your '
            'JRB supervisor or administrator to restore access.',
        messageStyle: const TextStyle(
          fontFamily: AppTypography.fontFamily,
          fontSize: 14,
          fontWeight: AppTypography.regular,
          height: 22.4 / 14,
          color: AppColors.sheetBody,
        ),
        buttonGap: 22,
        buttonTone: AppButtonTone.danger,
      ),
    );
  }
}

class SessionExpiredSheet extends StatelessWidget {
  const SessionExpiredSheet({super.key, this.pendingActions = 0});

  /// Offline actions waiting to sync; shows a banner when above zero.
  final int pendingActions;

  @override
  Widget build(BuildContext context) {
    return AppSheetCard(
      child: _StatusSheetContent(
        iconAsset: AssetPaths.iconTimerOff,
        iconHalo: AppColors.warningTint,
        title: 'Your Session Has Expired',
        message:
            'For security, sessions end automatically. Sign in to continue.',
        messageStyle: const TextStyle(
          fontFamily: AppTypography.fontFamily,
          fontSize: 14,
          fontWeight: AppTypography.regular,
          height: 22 / 14,
          color: AppColors.sheetBodyAlt,
        ),
        extra: pendingActions > 0
            ? _QueuedWorkBanner(pendingActions: pendingActions)
            : null,
        buttonGap: 30,
        buttonTone: AppButtonTone.warning,
      ),
    );
  }
}

/// Icon halo, title, message, optional extra, and "Back to Login".
class _StatusSheetContent extends StatelessWidget {
  const _StatusSheetContent({
    required this.iconAsset,
    required this.iconHalo,
    required this.title,
    required this.message,
    required this.messageStyle,
    required this.buttonGap,
    required this.buttonTone,
    this.extra,
  });

  final String iconAsset;
  final Color iconHalo;
  final String title;
  final String message;
  final TextStyle messageStyle;
  final Widget? extra;
  final double buttonGap;
  final AppButtonTone buttonTone;

  static const TextStyle _titleStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 25,
    fontWeight: AppTypography.bold,
    height: 33 / 25,
    color: AppColors.sheetTitle,
  );

  @override
  Widget build(BuildContext context) {
    final extra = this.extra;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          // 266 wide within the card, as designed.
          padding: const EdgeInsets.symmetric(horizontal: 29),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 129,
                height: 123,
                decoration: BoxDecoration(
                  color: iconHalo,
                  borderRadius: const BorderRadius.all(Radius.circular(999)),
                ),
                alignment: Alignment.center,
                child: SvgPicture.asset(
                  iconAsset,
                  width: 73,
                  height: 73,
                  excludeFromSemantics: true,
                ),
              ),
              const SizedBox(height: 21),
              Semantics(
                header: true,
                child: Padding(
                  // The title wraps at 237 px, as designed.
                  padding: const EdgeInsets.symmetric(horizontal: 14.5),
                  child: Text(
                    title,
                    textAlign: TextAlign.center,
                    style: _titleStyle,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(message, textAlign: TextAlign.center, style: messageStyle),
            ],
          ),
        ),
        if (extra != null) ...[const SizedBox(height: 22), extra],
        SizedBox(height: buttonGap),
        AppButton.primary(
          label: 'Back to Login',
          tone: buttonTone,
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
    );
  }
}

/// "Queued work is safe – N offline action(s) will sync after you sign in."
class _QueuedWorkBanner extends StatelessWidget {
  const _QueuedWorkBanner({required this.pendingActions});

  final int pendingActions;

  @override
  Widget build(BuildContext context) {
    final actions = pendingActions == 1
        ? '1 offline action'
        : '$pendingActions offline actions';

    return Semantics(
      container: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.warningSurface,
          border: Border.all(color: AppColors.amber, width: 0.8),
          borderRadius: const BorderRadius.all(Radius.circular(14)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: SvgPicture.asset(
                AssetPaths.iconInfo,
                width: 20,
                height: 20,
                excludeFromSemantics: true,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Queued work is safe',
                    style: TextStyle(
                      fontFamily: AppTypography.fontFamily,
                      fontSize: 13,
                      fontWeight: AppTypography.semiBold,
                      height: 20 / 13,
                      color: AppColors.warningText,
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      '$actions will sync after you sign in.',
                      style: const TextStyle(
                        fontFamily: AppTypography.fontFamily,
                        fontSize: 12,
                        fontWeight: AppTypography.regular,
                        height: 18 / 12,
                        color: AppColors.sheetBodyAlt,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
