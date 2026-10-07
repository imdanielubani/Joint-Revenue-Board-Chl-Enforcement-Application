import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';

/// "Verify CHL Trip" (primary) and "Verify E-Tag" (secondary).
class QuickActions extends StatelessWidget {
  const QuickActions({
    super.key,
    required this.onVerifyTrip,
    required this.onVerifyETag,
  });

  final VoidCallback onVerifyTrip;
  final VoidCallback onVerifyETag;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            flex: 217,
            child: _ActionButton(
              label: 'Verify CHL Trip',
              iconAsset: AssetPaths.iconScan,
              iconSize: 17,
              filled: true,
              onPressed: onVerifyTrip,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 131,
            child: _ActionButton(
              label: 'Verify E-Tag',
              iconAsset: AssetPaths.iconTag,
              iconSize: 24,
              filled: false,
              onPressed: onVerifyETag,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.iconAsset,
    required this.iconSize,
    required this.filled,
    required this.onPressed,
  });

  final String label;
  final String iconAsset;
  final double iconSize;
  final bool filled;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    const shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.all(Radius.circular(28)),
    );
    final content = FittedBox(
      // Shrinks the label on very narrow screens rather than clipping it.
      fit: BoxFit.scaleDown,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SvgPicture.asset(
            iconAsset,
            width: iconSize,
            height: iconSize,
            excludeFromSemantics: true,
          ),
          SizedBox(width: filled ? 8 : 6),
          Text(
            label,
            style: TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: filled ? 15 : 14,
              fontWeight: AppTypography.semiBold,
              color: filled ? Colors.white : AppColors.ink,
            ),
          ),
        ],
      ),
    );

    final style = ButtonStyle(
      minimumSize: const WidgetStatePropertyAll(Size(0, 56)),
      padding: const WidgetStatePropertyAll(
        EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      ),
      shape: const WidgetStatePropertyAll(shape),
      elevation: const WidgetStatePropertyAll(0),
      backgroundColor: WidgetStatePropertyAll(
        filled ? AppColors.green : Colors.white,
      ),
      side: WidgetStatePropertyAll(
        filled
            ? BorderSide.none
            : const BorderSide(color: AppColors.green, width: 1.5),
      ),
      overlayColor: WidgetStatePropertyAll(
        (filled ? Colors.white : AppColors.green).withValues(alpha: 0.12),
      ),
    );

    return filled
        ? FilledButton(onPressed: onPressed, style: style, child: content)
        : OutlinedButton(onPressed: onPressed, style: style, child: content);
  }
}
