import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';

/// A centred icon, title, message and one button: "No notifications yet",
/// "Notifications unavailable" and "You're all caught up".
class InboxMessage extends StatelessWidget {
  const InboxMessage({
    super.key,
    required this.iconAsset,
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.onAction,
    this.messageColor = Colors.black,
    this.liveRegion = false,
  });

  final String iconAsset;
  final String title;
  final String message;
  final Color messageColor;
  final String actionLabel;
  final VoidCallback onAction;

  /// Announce the title when it appears (e.g. a load failed).
  final bool liveRegion;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                color: AppColors.greenTint,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: SvgPicture.asset(
                iconAsset,
                width: 30,
                height: 30,
                excludeFromSemantics: true,
              ),
            ),
          ),
          const SizedBox(height: 20),
          Semantics(
            header: true,
            liveRegion: liveRegion,
            child: Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 21,
                fontWeight: AppTypography.bold,
                letterSpacing: -0.315,
                height: 1.3,
                color: AppColors.forest,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: 14,
              fontWeight: AppTypography.regular,
              letterSpacing: 0,
              height: 1.6,
              color: messageColor,
            ),
          ),
          const SizedBox(height: 24),
          InboxButton(label: actionLabel, onPressed: onAction),
        ],
      ),
    );
  }
}

/// 52 px green pill with a 15 px label.
class InboxButton extends StatelessWidget {
  const InboxButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.weight = AppTypography.semiBold,
  });

  final String label;
  final VoidCallback onPressed;
  final FontWeight weight;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        minimumSize: const Size(double.infinity, 52),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        backgroundColor: AppColors.green,
        foregroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(28)),
        ),
        textStyle: TextStyle(
          fontFamily: AppTypography.fontFamily,
          fontSize: 15,
          fontWeight: weight,
          letterSpacing: 0,
          height: 20.25 / 15,
        ),
      ),
      child: Text(label, textAlign: TextAlign.center),
    );
  }
}
