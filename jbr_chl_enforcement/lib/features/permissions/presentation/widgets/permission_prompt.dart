import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/widgets/app_button.dart';

/// Icon, explanation and actions for one permission step.
///
/// The explanation sits a quarter of the way down the space above the
/// buttons and scrolls if it does not fit (small screens, landscape, large
/// text). The button area
/// keeps the same height whether there are one or two buttons, so the
/// content does not jump between steps.
class PermissionPrompt extends StatelessWidget {
  const PermissionPrompt({
    super.key,
    required this.iconAsset,
    required this.title,
    required this.message,
    required this.allowLabel,
    required this.onAllow,
    this.declineLabel,
    this.onDecline,
    this.isBusy = false,
  });

  final String iconAsset;
  final String title;
  final String message;
  final String allowLabel;
  final VoidCallback onAllow;
  final String? declineLabel;
  final VoidCallback? onDecline;
  final bool isBusy;

  /// Widest the content grows on tablets.
  static const double _maxContentWidth = 420;
  static const double _messageWidth = 316;
  static const double _iconCircleSize = 156;
  static const double _iconSize = 73;
  static const double _buttonGap = 10;

  /// The content starts a quarter of the way down the space above the
  /// buttons, as in the design (142 of 568), so it stays put between steps.
  static const double _contentTopFraction = 0.25;

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
    height: 1.5, // Poppins' "normal" line height, as in the design
    color: AppColors.inkMuted,
  );

  @override
  Widget build(BuildContext context) {
    final declineLabel = this.declineLabel;

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: _maxContentWidth),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Column(
            children: [
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) => SingleChildScrollView(
                    padding: EdgeInsets.only(
                      top: constraints.maxHeight * _contentTopFraction,
                      bottom: 16,
                    ),
                    child: Center(child: _explanation()),
                  ),
                ),
              ),
              if (declineLabel == null)
                // Keeps the single button where the secondary one sits.
                const SizedBox(height: AppButton.height + _buttonGap),
              AppButton.primary(
                label: allowLabel,
                onPressed: onAllow,
                isBusy: isBusy,
              ),
              if (declineLabel != null) ...[
                const SizedBox(height: _buttonGap),
                AppButton.text(
                  label: declineLabel,
                  onPressed: onDecline,
                  isBusy: isBusy,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _explanation() {
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: _messageWidth),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: _iconCircleSize,
            height: _iconCircleSize,
            decoration: const BoxDecoration(
              color: AppColors.greenTint,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: SvgPicture.asset(
              iconAsset,
              width: _iconSize,
              height: _iconSize,
              excludeFromSemantics: true,
            ),
          ),
          const SizedBox(height: 23),
          Semantics(
            header: true,
            child: Text(title, textAlign: TextAlign.center, style: _titleStyle),
          ),
          const SizedBox(height: 5),
          Text(message, textAlign: TextAlign.center, style: _messageStyle),
        ],
      ),
    );
  }
}
