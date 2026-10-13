import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';

/// Green disc with the officer's initials and a 4 px dark forest ring
/// around it (drawn outside [size], as designed).
class InitialsAvatar extends StatelessWidget {
  const InitialsAvatar({
    super.key,
    required this.initials,
    required this.size,
    required this.fontSize,
  });

  final String initials;
  final double size;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        color: AppColors.green,
        shape: BoxShape.circle,
        boxShadow: [BoxShadow(color: AppColors.forest, spreadRadius: 4)],
      ),
      alignment: Alignment.center,
      child: ExcludeSemantics(
        child: FittedBox(
          // Very large text never spills out of the disc.
          fit: BoxFit.scaleDown,
          child: Text(
            initials,
            style: TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: fontSize,
              fontWeight: AppTypography.bold,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}
