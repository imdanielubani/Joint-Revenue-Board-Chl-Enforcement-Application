import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../core/constants/asset_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';

/// Checkbox with a label from the design system.
///
/// The box is drawn at the design's 20 px, while the tappable area covers
/// the label and extends to a 48 px touch target.
class AppCheckbox extends StatelessWidget {
  const AppCheckbox({
    super.key,
    required this.value,
    required this.label,
    required this.onChanged,
  });

  final bool value;
  final String label;

  /// Null disables the checkbox.
  final ValueChanged<bool>? onChanged;

  static const double _boxSize = 18;

  static const TextStyle _labelStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 12,
    fontWeight: AppTypography.medium,
    height: 16 / 12,
    color: AppColors.ink,
  );

  @override
  Widget build(BuildContext context) {
    final onChanged = this.onChanged;

    return Semantics(
      checked: value,
      enabled: onChanged != null,
      label: label,
      excludeSemantics: true,
      onTap: onChanged == null ? null : () => onChanged(!value),
      child: InkWell(
        onTap: onChanged == null ? null : () => onChanged(!value),
        borderRadius: const BorderRadius.all(Radius.circular(8)),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.all(1),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  width: _boxSize,
                  height: _boxSize,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: value ? AppColors.green : null,
                    gradient: value
                        ? null
                        : const LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Color(0xFFF2F2F4), Colors.white],
                          ),
                    border: Border.all(
                      color: value ? AppColors.green : AppColors.ink,
                      width: 2,
                    ),
                    borderRadius: const BorderRadius.all(Radius.circular(6)),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x08000000),
                        offset: Offset(0, 1),
                        blurRadius: 1,
                        spreadRadius: -0.5,
                      ),
                    ],
                  ),
                  child: value
                      ? SvgPicture.asset(
                          AssetPaths.iconCheck,
                          width: 9.001,
                          height: 6.751,
                          excludeFromSemantics: true,
                        )
                      : null,
                ),
              ),
              const SizedBox(width: 8),
              Flexible(child: Text(label, style: _labelStyle)),
            ],
          ),
        ),
      ),
    );
  }
}
