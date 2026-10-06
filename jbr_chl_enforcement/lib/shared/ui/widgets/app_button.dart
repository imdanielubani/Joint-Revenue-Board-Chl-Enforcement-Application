import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';

/// Full-width pill button from the design system.
///
/// [AppButton.primary] is the filled green call to action; [AppButton.text]
/// is the quieter secondary action beneath it. While [isBusy] the button
/// keeps its look but ignores taps.
class AppButton extends StatelessWidget {
  const AppButton.primary({
    super.key,
    required this.label,
    required this.onPressed,
    this.isBusy = false,
  }) : _filled = true;

  const AppButton.text({
    super.key,
    required this.label,
    required this.onPressed,
    this.isBusy = false,
  }) : _filled = false;

  static const double height = 54;

  final String label;
  final VoidCallback? onPressed;
  final bool isBusy;
  final bool _filled;

  static const TextStyle _labelStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 15,
    fontWeight: AppTypography.semiBold,
    height: 20.25 / 15,
  );

  static const OutlinedBorder _shape = RoundedRectangleBorder(
    borderRadius: BorderRadius.all(Radius.circular(24)),
  );

  static const EdgeInsets _padding = EdgeInsets.symmetric(
    horizontal: 18,
    vertical: 13,
  );

  @override
  Widget build(BuildContext context) {
    final callback = isBusy ? null : onPressed;
    final child = Text(label, textAlign: TextAlign.center);
    final minimumSize = const Size(double.infinity, height);

    return _filled
        ? FilledButton(
            onPressed: callback,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.green,
              foregroundColor: Colors.white,
              disabledBackgroundColor: isBusy
                  ? AppColors.green
                  : AppColors.green.withValues(alpha: 0.4),
              disabledForegroundColor: Colors.white,
              minimumSize: minimumSize,
              padding: _padding,
              shape: _shape,
              textStyle: _labelStyle,
              elevation: 0,
            ),
            child: child,
          )
        : TextButton(
            onPressed: callback,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.green,
              disabledForegroundColor: isBusy
                  ? AppColors.green
                  : AppColors.green.withValues(alpha: 0.4),
              minimumSize: minimumSize,
              padding: _padding,
              shape: _shape,
              textStyle: _labelStyle,
            ),
            child: child,
          );
  }
}
