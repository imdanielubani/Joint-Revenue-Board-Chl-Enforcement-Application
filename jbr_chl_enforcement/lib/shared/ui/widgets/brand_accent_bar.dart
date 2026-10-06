import 'package:flutter/widgets.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radii.dart';

/// Short rounded green bar used under brand headings.
class BrandAccentBar extends StatelessWidget {
  const BrandAccentBar({super.key, required this.width});

  final double width;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: 4,
      decoration: const BoxDecoration(
        color: AppColors.green,
        borderRadius: AppRadii.pillAll,
      ),
    );
  }
}
