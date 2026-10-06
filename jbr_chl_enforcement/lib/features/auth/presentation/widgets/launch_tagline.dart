import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/widgets/brand_accent_bar.dart';

/// Right-aligned "Safe roads / Fair revenue / A stronger Nigeria" tagline.
class LaunchTagline extends StatelessWidget {
  const LaunchTagline({super.key});

  static const TextStyle _style = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 9,
    fontWeight: AppTypography.semiBold,
    height: 15 / 9,
    letterSpacing: 2,
    color: AppColors.textMuted,
  );

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      spacing: 4,
      children: [
        Text(
          'SAFE ROADS\nFAIR REVENUE\nA STRONGER NIGERIA',
          textAlign: TextAlign.right,
          style: _style,
        ),
        BrandAccentBar(width: 30),
      ],
    );
  }
}
