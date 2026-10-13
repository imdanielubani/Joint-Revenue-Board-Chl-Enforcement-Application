import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';

/// The full-width "Verify CHL Trip" button. E-Tags are verified from the
/// page it opens ("Scan E-Tag QR code").
class QuickActions extends StatelessWidget {
  const QuickActions({super.key, required this.onVerifyTrip});

  final VoidCallback onVerifyTrip;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: onVerifyTrip,
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(Size(double.infinity, 56)),
        padding: const WidgetStatePropertyAll(
          EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        ),
        shape: const WidgetStatePropertyAll(
          RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(28)),
          ),
        ),
        elevation: const WidgetStatePropertyAll(0),
        backgroundColor: const WidgetStatePropertyAll(AppColors.green),
        overlayColor: WidgetStatePropertyAll(
          Colors.white.withValues(alpha: 0.12),
        ),
      ),
      child: FittedBox(
        // Shrinks the label on very narrow screens rather than clipping it.
        fit: BoxFit.scaleDown,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            SvgPicture.asset(
              AssetPaths.iconScan,
              width: 17,
              height: 17,
              excludeFromSemantics: true,
            ),
            const SizedBox(width: 8),
            const Text(
              'Verify CHL Trip',
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 14,
                fontWeight: AppTypography.semiBold,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
