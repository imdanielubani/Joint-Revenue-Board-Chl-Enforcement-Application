import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';

/// A page's 22 px heading with an optional short description under it, at
/// the top of the sheet.
class ScreenHeading extends StatelessWidget {
  const ScreenHeading({super.key, required this.heading, this.description});

  final String heading;
  final String? description;

  @override
  Widget build(BuildContext context) {
    final description = this.description;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Semantics(
            header: true,
            child: Text(
              heading,
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 22,
                fontWeight: AppTypography.bold,
                height: 25.96 / 22,
                letterSpacing: -0.77,
                color: AppColors.forest,
              ),
            ),
          ),
        ),
        if (description != null)
          Padding(
            padding: const EdgeInsets.only(top: 3),
            child: Text(
              description,
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 12,
                fontWeight: AppTypography.regular,
                letterSpacing: 0,
                height: 18 / 12,
                color: AppColors.ink,
              ),
            ),
          ),
      ],
    );
  }
}
