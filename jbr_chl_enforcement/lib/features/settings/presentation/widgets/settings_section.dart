import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';

/// A titled group of rows ("Preferences", "Activity & account") in one
/// rounded card, with a line between rows.
class SettingsSection extends StatelessWidget {
  const SettingsSection({
    super.key,
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  static const BorderSide _divider = BorderSide(
    color: AppColors.cardBorder,
    width: 1.5,
  );

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: Text(
            title,
            style: const TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: 14,
              fontWeight: AppTypography.semiBold,
              height: 18.2 / 14,
              letterSpacing: -0.21,
              color: AppColors.forest,
            ),
          ),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: AppColors.cardBorder, width: 1.5),
            borderRadius: const BorderRadius.all(Radius.circular(20)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var i = 0; i < children.length; i++)
                i == 0
                    ? children[i]
                    : DecoratedBox(
                        decoration: const BoxDecoration(
                          border: Border(top: _divider),
                        ),
                        child: children[i],
                      ),
            ],
          ),
        ),
      ],
    );
  }
}
